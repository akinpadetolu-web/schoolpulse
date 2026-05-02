import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'superAdmin') {
      return Response.json({ error: 'Unauthorized: Super Admin only' }, { status: 403 });
    }

    const { schoolId } = await req.json();

    if (!schoolId) {
      return Response.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    // Check all users in school by role
    const admins = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'admin' });
    const teachers = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher' });
    const students = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'student' });
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'parent' });

    const checkUsers = (users, role) => users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      role,
      isArchived: u.isArchived,
      hasPasswordHash: !!u.passwordHash,
      passwordHashLength: u.passwordHash?.length || 0,
    }));

    return Response.json({
      summary: {
        admins: admins.length,
        teachers: teachers.length,
        students: students.length,
        parents: parents.length,
      },
      adminsWithoutPassword: checkUsers(admins.filter(u => !u.passwordHash), 'admin'),
      teachersWithoutPassword: checkUsers(teachers.filter(u => !u.passwordHash), 'teacher'),
      studentsWithoutPassword: checkUsers(students.filter(u => !u.passwordHash), 'student'),
      parentsWithoutPassword: checkUsers(parents.filter(u => !u.passwordHash), 'parent'),
      sampleAdmin: checkUsers(admins.slice(0, 1), 'admin'),
      sampleTeacher: checkUsers(teachers.slice(0, 1), 'teacher'),
      sampleStudent: checkUsers(students.slice(0, 1), 'student'),
      sampleParent: checkUsers(parents.slice(0, 1), 'parent'),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});