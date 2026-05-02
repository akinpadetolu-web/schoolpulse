import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden. Teacher or admin access only.' }, { status: 403 });
    }

    const { event, data } = await req.json();

    if (!data || event.type !== 'create') {
      return Response.json({ status: 'skipped' });
    }

    const { schoolId, classId, subjectId, title, dueDate } = data;

    // Fetch students in the class
    const students = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      classId,
      role: 'student',
      isArchived: false,
    });

    if (!students || students.length === 0) {
      return Response.json({ status: 'no_students' });
    }

    // Fetch parents linked to these students
    const studentIds = students.map(s => s.id);
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      isArchived: false,
    });

    const relevantParents = (parents || []).filter(p => {
      const linked = p.linkedStudentIds || [];
      return linked.some(id => studentIds.includes(id));
    });

    // Send emails to students
    const studentEmails = students.map(s => s.email).filter(Boolean);
    const parentEmails = relevantParents.map(p => p.email).filter(Boolean);
    const allEmails = [...new Set([...studentEmails, ...parentEmails])];

    for (const email of allEmails) {
      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `New Assignment: ${title}`,
          body: `A new assignment "${title}" has been posted.${dueDate ? `\n\nDue Date: ${dueDate}` : ''}\n\nCheck your portal for details.`,
        });
      } catch (err) {
        console.error(`Failed to send notification to ${email}:`, err);
      }
    }

    return Response.json({ status: 'sent', count: allEmails.length });
  } catch (error) {
    console.error('Error in onAssignmentPosted:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});