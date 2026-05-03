import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { currentPassword, newPassword, userId } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the specific user by ID using service role
    let targetUser = null;
    try {
      targetUser = await base44.asServiceRole.entities.SchoolUser.get(userId);
    } catch (_) {
      // get() throws if not found
    }

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(currentPassword, targetUser.passwordHash);
    if (!isPasswordValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash and save new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await base44.asServiceRole.entities.SchoolUser.update(userId, {
      passwordHash: hashedPassword,
      mustChangePassword: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('changePassword error:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
});