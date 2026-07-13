import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Must match the hashPassword/comparePassword logic in src/lib/auth.js
const SALT = "SP2024_";

function hashPassword(password) {
  const salted = SALT + password;
  // btoa(unescape(encodeURIComponent(...))) — same encoding as auth.js
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { currentPassword, newPassword, userId } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user by ID
    let targetUser = null;
    try {
      targetUser = await base44.asServiceRole.entities.SchoolUser.get(userId);
    } catch (_) {
      // get() throws if not found
    }

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.passwordHash) {
      return Response.json({ error: 'No password set for this account. Please contact your administrator.' }, { status: 400 });
    }

    // Use the same base64 hash comparison as the login flow (auth.js)
    if (!comparePassword(currentPassword, targetUser.passwordHash)) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash and save new password using the same base64 format
    const newHash = hashPassword(newPassword);
    await base44.asServiceRole.entities.SchoolUser.update(userId, {
      passwordHash: newHash,
      mustChangePassword: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('changePassword error:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
});