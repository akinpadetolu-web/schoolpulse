import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Server-side credential check for the school portal and the super-admin backend.
// Credentials are never compared in the browser any more: this function is the
// only place a password is verified, and it never returns the password hash.
//
// Must match the hash format written by src/lib/auth.js hashPassword().
const SALT = 'SP2024_';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function hashPassword(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

function comparePassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  if (hashPassword(inputPassword) === storedHash) return true;
  try {
    return btoa(SALT + inputPassword) === storedHash;
  } catch {
    return false;
  }
}

// Never let the hash or the throttle state reach the client.
function toSafeUser(user) {
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return safe;
}

function fail(message) {
  // Handled failures return 200 so the caller always receives the message
  // (the SDK surfaces a thrown error as a generic failure instead).
  return Response.json({ error: message });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { schoolId, identifier, password, superAdmin } = body || {};

    if (!identifier || !password) {
      return fail('Invalid credentials');
    }

    const trimmed = String(identifier).trim();
    if (!trimmed) return fail('Invalid credentials');

    const query = superAdmin
      ? { role: 'superAdmin', email: trimmed }
      : { schoolId, $or: [{ username: trimmed }, { email: trimmed }] };

    const users = await base44.asServiceRole.entities.SchoolUser.filter(query);
    const user = (users || []).find((u: any) => !u.isArchived);

    // Uniform message — never reveal whether an account exists.
    if (!user) return fail('Invalid credentials');

    // Account lockout after repeated failures.
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000),
      );
      return fail(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
    }

    if (!comparePassword(password, user.passwordHash)) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const patch: any = { failedLoginAttempts: attempts };
      let locked = false;

      if (attempts >= MAX_ATTEMPTS) {
        patch.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
        patch.failedLoginAttempts = 0;
        locked = true;
      }

      await base44.asServiceRole.entities.SchoolUser.update(user.id, patch);

      return locked
        ? fail(`Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.`)
        : fail('Invalid credentials');
    }

    // Successful sign-in — clear any throttle state.
    if (user.failedLoginAttempts || user.lockedUntil) {
      await base44.asServiceRole.entities.SchoolUser.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    return Response.json({ user: toSafeUser(user) });
  } catch (error) {
    console.error('schoolLogin error:', error);
    return Response.json({ error: 'Sign in failed. Please try again.' }, { status: 500 });
  }
});