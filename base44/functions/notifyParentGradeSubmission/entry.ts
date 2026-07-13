import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both entity-automation payloads { event, data } and manual calls
    const eventData = body?.data;
    const gradeId = body?.gradeId || eventData?.id || body?.event?.entity_id;
    const schoolId = body?.schoolId || eventData?.schoolId;
    const studentId = body?.studentId || eventData?.studentId;
    const subjectName = body?.subjectName || eventData?.subjectName;
    const score = body?.score ?? eventData?.score;
    const maxScore = body?.maxScore ?? eventData?.maxScore;
    const assessmentType = body?.assessmentType || eventData?.assessmentType;

    if (!gradeId || !schoolId || !studentId || !subjectName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get student details
    const students = await base44.asServiceRole.entities.SchoolUser.filter({ id: studentId });
    const student = students?.[0];
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    // Get school details
    const schools = await base44.asServiceRole.entities.School.filter({ id: schoolId });
    const school = schools?.[0];

    // Get parents linked to this student (filter in JS — $in not reliable in SDK filter)
    const allParents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      isArchived: false,
    });
    const parents = (allParents || []).filter(p => (p.linkedStudentIds || []).includes(studentId));

    if (parents.length === 0) {
      return Response.json({ success: true, message: 'No parents linked to student' });
    }

    // Calculate percentage
    const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;

    // Send email and push notifications to each parent
    const notificationResults = [];

    for (const parent of parents) {
      // Send email notification
      if (parent.email) {
        try {
          const emailResult = await base44.integrations.Core.SendEmail({
            to: parent.email,
            subject: `Grade Alert: ${student.fullName} - ${subjectName}`,
            body: `
              <h2>New Grade Submission</h2>
              <p>Hi ${parent.fullName},</p>
              <p>A new grade has been submitted for <strong>${student.fullName}</strong>:</p>
              <div style="background: #f0f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>Subject:</strong> ${subjectName}</p>
                <p><strong>Assessment Type:</strong> ${assessmentType || 'N/A'}</p>
                <p><strong>Score:</strong> ${score}/${maxScore}</p>
                <p><strong>Percentage:</strong> <span style="font-size: 18px; font-weight: bold; color: ${percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'}">${percentage}%</span></p>
              </div>
              <p>Please log in to the parent portal to view more details and your child's progress.</p>
              <p>Best regards,<br/>${school?.schoolName || 'SchoolPulse'}</p>
            `,
          });
          notificationResults.push({ parentId: parent.id, email: 'sent', result: emailResult });
        } catch (emailError) {
          console.error(`Email error for parent ${parent.id}:`, emailError);
          notificationResults.push({ parentId: parent.id, email: 'failed', error: emailError.message });
        }
      }

      // Send push notification (stored in database for app notification system)
      try {
        const pushNotification = await base44.asServiceRole.entities.Notification.create({
          schoolId,
          type: 'grade_submitted',
          title: `Grade Alert: ${student.fullName}`,
          message: `${subjectName} - ${assessmentType}: ${score}/${maxScore} (${percentage}%)`,
          targetRole: 'parent',
          targetUserIds: [parent.id],
          relatedEntityId: gradeId,
          relatedEntityType: 'Grade',
          isRead: false,
        });
        notificationResults.push({ parentId: parent.id, push: 'sent', notificationId: pushNotification.id });
      } catch (pushError) {
        console.error(`Push notification error for parent ${parent.id}:`, pushError);
        notificationResults.push({ parentId: parent.id, push: 'failed', error: pushError.message });
      }
    }

    return Response.json({
      success: true,
      message: 'Notifications sent',
      results: notificationResults,
      parentsNotified: parents.length,
    });
  } catch (error) {
    console.error('Parent grade notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});