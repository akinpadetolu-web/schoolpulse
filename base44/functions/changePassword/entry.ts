import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, userId } = await req.json();

    // Verify the user is changing their own password
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!currentPassword || !newPassword) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the school user to verify current password
    const schoolUser = await base44.asServiceRole.entities.SchoolUser.list();
    const targetUser = (schoolUser || []).find(u => u.id === userId);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(currentPassword, targetUser.passwordHash);
    if (!isPasswordValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password
    await base44.asServiceRole.entities.SchoolUser.update(userId, {
      passwordHash: hashedPassword,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
});