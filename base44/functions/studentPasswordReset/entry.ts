import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  authorizeAdmin,
  verifySecurityPin,
  hashPassword,
  generateTemporaryPassword,
} from '../../shared/securityPin.ts';

// Resets a student password to a freshly generated temporary password.
// Requires a school admin (or the system administrator) plus the 4-digit
// security PIN. Mistakes the caller for nobody until both checks pass.
// action: 'reset' (default) applies the reset; 'verifyPin' only confirms the
// PIN so the dashboard can reveal a password it already holds.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, adminId, schoolId, studentId, pin } = body || {};

    const auth = await authorizeAdmin(base44, adminId, schoolId);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const pinCheck = await verifySecurityPin(base44, pin);
    if (!pinCheck.ok) return Response.json({ error: pinCheck.error }, { status: pinCheck.status });

    if (action === 'verifyPin') return Response.json({ valid: true });

    if (!studentId) return Response.json({ error: 'Select a student.' }, { status: 400 });

    const student = await base44.asServiceRole.entities.SchoolUser.get(studentId).catch((e: any) =>
      e.status === 404 ? null : Promise.reject(e),
    );

    if (!student || student.role !== 'student' || (schoolId && student.schoolId !== schoolId)) {
      return Response.json({ error: 'Student not found.' }, { status: 404 });
    }

    const temporaryPassword = generateTemporaryPassword();

    await base44.asServiceRole.entities.SchoolUser.update(studentId, {
      passwordHash: hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    return Response.json({
      temporaryPassword,
      username: student.username || '',
      studentName: student.fullName || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}