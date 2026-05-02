import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SALT = "SP2024_";

// Check if a hash is using the old SP2024_ method
function isOldHashFormat(hash) {
  if (!hash) return false;
  try {
    // Old format: btoa of "SP2024_" + password
    // We can't directly identify it, but we can check if it decodes properly
    const decoded = atob(hash);
    return decoded.startsWith(SALT);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow super admin or school admin
    if (!user || (user.role !== 'superAdmin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get query params for action
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'report';
    const schoolId = url.searchParams.get('schoolId');

    // Fetch all school users
    const query = schoolId ? { schoolId } : {};
    const allUsers = await base44.asServiceRole.entities.SchoolUser.list();
    const filteredUsers = schoolId 
      ? allUsers.filter(u => u.schoolId === schoolId) 
      : allUsers;

    // Analyze hash formats
    const analysis = {
      total: filteredUsers.length,
      oldFormat: [],
      noPassword: [],
      summary: {
        totalOldHashes: 0,
        totalWithoutPassword: 0,
        percentageMigrated: 0
      }
    };

    for (const schoolUser of filteredUsers) {
      if (!schoolUser.passwordHash) {
        analysis.noPassword.push({
          id: schoolUser.id,
          email: schoolUser.email,
          fullName: schoolUser.fullName,
          role: schoolUser.role,
          reason: 'No password hash set'
        });
      } else if (isOldHashFormat(schoolUser.passwordHash)) {
        analysis.oldFormat.push({
          id: schoolUser.id,
          email: schoolUser.email,
          fullName: schoolUser.fullName,
          role: schoolUser.role,
          hashLength: schoolUser.passwordHash.length,
          hashPreview: schoolUser.passwordHash.substring(0, 20) + '...'
        });
      }
    }

    analysis.summary.totalOldHashes = analysis.oldFormat.length;
    analysis.summary.totalWithoutPassword = analysis.noPassword.length;
    analysis.summary.percentageMigrated = Math.round(
      ((filteredUsers.length - analysis.oldFormat.length - analysis.noPassword.length) / filteredUsers.length) * 100
    ) || 0;

    if (action === 'report') {
      return Response.json({
        success: true,
        scope: schoolId ? `School: ${schoolId}` : 'All Schools',
        timestamp: new Date().toISOString(),
        analysis,
        note: 'Users with old hashes will be automatically upgraded when they log in next.'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('migratePasswordHashes error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});