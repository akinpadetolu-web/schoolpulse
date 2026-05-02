import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function hashPassword(password) {
  const SALT = Deno.env.get("PASSWORD_SALT");
  if (!SALT) throw new Error("PASSWORD_SALT environment variable is not set");
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

function generateTemporaryPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be admin or superAdmin
    if (currentUser.role !== 'admin' && currentUser.role !== 'superAdmin') {
      return Response.json({ error: 'Forbidden: Only admins can reset passwords' }, { status: 403 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return Response.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    // Get target user
    const targetUsers = await base44.asServiceRole.entities.SchoolUser.filter({ id: targetUserId });
    const targetUser = targetUsers?.[0];

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // School admin can only reset users in their school
    if (currentUser.role === 'admin' && targetUser.schoolId !== currentUser.schoolId) {
      return Response.json({ error: 'Forbidden: Can only reset users in your school' }, { status: 403 });
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = hashPassword(tempPassword);

    // Update user
    await base44.asServiceRole.entities.SchoolUser.update(targetUserId, {
      passwordHash: hashedPassword,
      mustChangePassword: true,
    });

    return Response.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword,
      userName: targetUser.fullName,
      userEmail: targetUser.email,
      note: 'User must change this password on next login. DO NOT share this plaintext password via email or insecure channels.',
    });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});