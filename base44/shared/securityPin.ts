// Shared server-side helpers for the student password reset flow.
// Both studentPasswordReset and manageSecurityPin import this module so the
// PIN hashing, PIN verification, lockout and password hashing live in one
// place. Nothing here ever returns the PIN or a password hash to the client.

export const PIN_SETTING_KEY = 'passwordRevealPin';
const PIN_PEPPER = 'SEP_PIN_';
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

// Same salted base64 scheme the rest of the app uses (src/lib/auth.js).
export function hashPassword(password: string): string {
  return btoa(unescape(encodeURIComponent('SP2024_' + password)));
}

// Cryptographically random, unambiguous temporary password.
export function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(bytes[i] % chars.length);
  return pwd;
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_PEPPER}${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newSalt(): string {
  return crypto.randomUUID();
}

export async function getPinSetting(base44: any) {
  const rows = await base44.asServiceRole.entities.SystemSetting.filter({ key: PIN_SETTING_KEY });
  return (rows || [])[0] || null;
}

// Verifies the 4-digit security PIN. Fails closed when no PIN is configured
// and throttles repeated wrong guesses.
export async function verifySecurityPin(base44: any, pin: any) {
  const candidate = typeof pin === 'string' ? pin.trim() : '';
  if (!/^\d{4}$/.test(candidate)) {
    return { ok: false, status: 400, error: 'Enter the 4-digit security PIN.' };
  }

  const setting = await getPinSetting(base44);
  if (!setting || !setting.pinHash || !setting.pinSalt) {
    return {
      ok: false,
      status: 400,
      error: 'No security PIN is set yet. Ask the SchoolEduPulse administrator to set one in system settings.',
    };
  }

  if (setting.pinLockedUntil && new Date(setting.pinLockedUntil).getTime() > Date.now()) {
    const minutes = Math.max(
      1,
      Math.ceil((new Date(setting.pinLockedUntil).getTime() - Date.now()) / 60000),
    );
    return { ok: false, status: 429, error: `Too many incorrect PIN attempts. Try again in ${minutes} minute(s).` };
  }

  const attempt = await hashPin(candidate, setting.pinSalt);
  if (attempt === setting.pinHash) {
    if (setting.failedPinAttempts || setting.pinLockedUntil) {
      await base44.asServiceRole.entities.SystemSetting.update(setting.id, {
        failedPinAttempts: 0,
        pinLockedUntil: null,
      });
    }
    return { ok: true };
  }

  const failures = (setting.failedPinAttempts || 0) + 1;
  const patch: any = { failedPinAttempts: failures };
  let locked = false;

  if (failures >= MAX_PIN_ATTEMPTS) {
    patch.failedPinAttempts = 0;
    patch.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60000).toISOString();
    locked = true;
  }

  await base44.asServiceRole.entities.SystemSetting.update(setting.id, patch);

  return {
    ok: false,
    status: 401,
    error: locked
      ? `Too many incorrect PIN attempts. Locked for ${PIN_LOCK_MINUTES} minutes.`
      : 'Incorrect security PIN.',
  };
}

// Confirms the caller is an admin of that school, or the system administrator.
export async function authorizeAdmin(base44: any, adminId: any, schoolId: any) {
  if (!adminId) return { ok: false, status: 403, error: 'Not authorized.' };

  const admin = await base44.asServiceRole.entities.SchoolUser.get(adminId).catch((e: any) =>
    e.status === 404 ? null : Promise.reject(e),
  );

  if (!admin || admin.isArchived) return { ok: false, status: 403, error: 'Not authorized.' };
  if (admin.role === 'superAdmin') return { ok: true, admin };
  if (admin.role !== 'admin') return { ok: false, status: 403, error: 'Not authorized.' };
  if (schoolId && admin.schoolId !== schoolId) return { ok: false, status: 403, error: 'Not authorized.' };

  return { ok: true, admin };
}