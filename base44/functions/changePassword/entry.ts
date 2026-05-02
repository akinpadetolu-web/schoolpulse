import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SALT = "SP2024_";

function hashPassword(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

function comparePassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  if (hashPassword(inputPassword) === storedHash) return true;
  try {
    return btoa(SALT + inputPassword) === storedHash;
  } catch { return false; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, userId } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user is changing their own password
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the school user to verify current password
    const schoolUsers = await base44.asServiceRole.entities.SchoolUser.list();
    const targetUser = (schoolUsers || []).find(u => u.id === userId);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password using the same method as login
    const isPasswordValid = comparePassword(currentPassword, targetUser.passwordHash);
    if (!isPasswordValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password using the same method as login
    const hashedPassword = hashPassword(newPassword);

    // Update password
    await base44.asServiceRole.entities.SchoolUser.update(userId, {
      passwordHash: hashedPassword,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('changePassword error:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
});