import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  getPinSetting,
  hashPin,
  newSalt,
  verifySecurityPin,
  PIN_SETTING_KEY,
} from '../../shared/securityPin.ts';

// The password-reveal security PIN is owned by the SchoolEduPulse system
// administrator (super admin) only. 'status' reports whether one exists;
// 'set' creates or replaces it. The PIN is never stored or returned in clear.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, superAdminId, pin, currentPin } = body || {};

    if (!superAdminId) return Response.json({ error: 'Not authorized.' }, { status: 403 });

    const admin = await base44.asServiceRole.entities.SchoolUser.get(superAdminId).catch((e: any) =>
      e.status === 404 ? null : Promise.reject(e),
    );

    if (!admin || admin.isArchived || admin.role !== 'superAdmin') {
      return Response.json({ error: 'Not authorized.' }, { status: 403 });
    }

    const setting = await getPinSetting(base44);

    if (action === 'status') {
      return Response.json({
        configured: Boolean(setting && setting.pinHash),
        updatedAt: setting?.updatedAt || null,
        updatedByName: setting?.updatedByName || '',
      });
    }

    if (action !== 'set') return Response.json({ error: 'Unknown action.' }, { status: 400 });

    const candidate = typeof pin === 'string' ? pin.trim() : '';
    if (!/^\d{4}$/.test(candidate)) {
      return Response.json({ error: 'Choose a 4-digit PIN.' }, { status: 400 });
    }

    // Replacing an existing PIN requires the current one.
    if (setting && setting.pinHash) {
      const check = await verifySecurityPin(base44, currentPin);
      if (!check.ok) return Response.json({ error: check.error }, { status: check.status });
    }

    const salt = newSalt();
    const patch: any = {
      key: PIN_SETTING_KEY,
      pinHash: await hashPin(candidate, salt),
      pinSalt: salt,
      failedPinAttempts: 0,
      pinLockedUntil: null,
      updatedBy: admin.id,
      updatedByName: admin.fullName || 'System Administrator',
      updatedAt: new Date().toISOString(),
    };

    if (setting) await base44.asServiceRole.entities.SystemSetting.update(setting.id, patch);
    else await base44.asServiceRole.entities.SystemSetting.create(patch);

    return Response.json({ success: true, configured: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}