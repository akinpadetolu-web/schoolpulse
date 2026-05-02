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

    const { event, data, old_data } = await req.json();

    if (!data || event.type !== 'update') {
      return Response.json({ status: 'skipped' });
    }

    // Only notify if score was actually updated
    if (old_data && data.score === old_data.score) {
      return Response.json({ status: 'no_change' });
    }

    const { schoolId, studentId, subjectName, score, maxScore, assessmentType } = data;

    // Fetch student
    const student = await base44.asServiceRole.entities.SchoolUser.get('SchoolUser', studentId);
    if (!student || !student.email) {
      return Response.json({ status: 'student_not_found' });
    }

    // Fetch parents linked to this student
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      isArchived: false,
    });

    const relevantParents = (parents || []).filter(p => {
      const linked = p.linkedStudentIds || [];
      return linked.includes(studentId);
    });

    const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
    const gradeLabel = percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

    // Notify student
    try {
      await base44.integrations.Core.SendEmail({
        to: student.email,
        subject: `Grade Updated: ${subjectName}`,
        body: `Your ${assessmentType} grade for ${subjectName} has been posted.\n\nScore: ${score}/${maxScore} (${percentage}% - Grade: ${gradeLabel})`,
      });
    } catch (err) {
      console.error(`Failed to notify student:`, err);
    }

    // Notify parents
    for (const parent of relevantParents) {
      if (!parent.email) continue;
      try {
        await base44.integrations.Core.SendEmail({
          to: parent.email,
          subject: `Grade Update: ${student.fullName} - ${subjectName}`,
          body: `${student.fullName} has received a grade in ${subjectName}.\n\nScore: ${score}/${maxScore} (${percentage}% - Grade: ${gradeLabel})\n\nAssessment Type: ${assessmentType}`,
        });
      } catch (err) {
        console.error(`Failed to notify parent ${parent.email}:`, err);
      }
    }

    return Response.json({ 
      status: 'sent',
      student_notified: true,
      parents_notified: relevantParents.length
    });
  } catch (error) {
    console.error('Error in onGradeUpdated:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});