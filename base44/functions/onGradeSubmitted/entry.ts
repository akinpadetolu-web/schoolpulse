import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { gradeId, schoolId, studentId, teacherId, subjectId } = await req.json();

    if (!gradeId || !schoolId || !studentId || !subjectId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the grade
    const grades = await base44.asServiceRole.entities.Grade.filter({ id: gradeId });
    const grade = grades?.[0];
    if (!grade) return Response.json({ error: 'Grade not found' }, { status: 404 });

    // Calculate subject average for the student
    const allGradesForSubject = await base44.asServiceRole.entities.Grade.filter({
      schoolId,
      studentId,
      subjectId,
    });

    const avgScore = allGradesForSubject.length
      ? Math.round(allGradesForSubject.reduce((sum, g) => sum + ((g.score / (g.maxScore || 100)) * 100), 0) / allGradesForSubject.length)
      : 0;

    // Get student for notification
    const students = await base44.asServiceRole.entities.SchoolUser.filter({ id: studentId });
    const student = students?.[0];

    // Update student's subject averages
    if (student) {
      const updatedAverages = [...(student.subjectAverages || [])];
      const existingIndex = updatedAverages.findIndex(avg => avg.subjectId === subjectId);
      
      if (existingIndex >= 0) {
        updatedAverages[existingIndex].average = avgScore;
      } else {
        updatedAverages.push({ subjectId, average: avgScore });
      }
      
      await base44.asServiceRole.entities.SchoolUser.update(studentId, {
        subjectAverages: updatedAverages
      });
    }

    // Get parent linked to this student
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      linkedStudentIds: { $in: [studentId] },
    });

    // Get admin
    const admins = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'admin',
    });

    // Create notifications
    const notifications = [];

    // Student notification
    if (student) {
      notifications.push({
        schoolId,
        type: 'grade_updated',
        title: `Grade Updated: ${grade.subjectName}`,
        message: `Your ${grade.assessmentType} score for ${grade.subjectName} has been recorded. Current subject average: ${avgScore}%`,
        targetRole: 'student',
        targetUserIds: [studentId],
        relatedEntityId: gradeId,
        relatedEntityType: 'Grade',
        createdByUser: teacherId,
      });
    }

    // Parent notifications
    parents.forEach(parent => {
      notifications.push({
        schoolId,
        type: 'grade_updated',
        title: `${student?.fullName} - Grade Updated`,
        message: `${student?.fullName}'s ${grade.assessmentType} for ${grade.subjectName} has been recorded. Subject average: ${avgScore}%`,
        targetRole: 'parent',
        targetUserIds: [parent.id],
        relatedEntityId: gradeId,
        relatedEntityType: 'Grade',
        createdByUser: teacherId,
      });
    });

    // Admin notification
    admins.forEach(admin => {
      notifications.push({
        schoolId,
        type: 'grade_submitted',
        title: 'New Grade Submitted',
        message: `${student?.fullName} - ${grade.subjectName} (${grade.assessmentType}): ${grade.score}/${grade.maxScore}`,
        targetRole: 'admin',
        targetUserIds: [admin.id],
        relatedEntityId: gradeId,
        relatedEntityType: 'Grade',
        createdByUser: teacherId,
      });
    });

    // Batch create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Check for significant grade change (below 50%)
    if (avgScore < 50 && allGradesForSubject.length > 1) {
      const alertNotifications = [];

      if (student?.id) {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: '⚠️ Subject Average Below 50%',
          message: `Your average for ${grade.subjectName} has dropped below 50% (${avgScore}%). Please seek help from your teacher.`,
          targetRole: 'student',
          targetUserIds: [student.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId,
        });
      }

      parents.forEach(parent => {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: `Alert: ${student?.fullName}'s Grade`,
          message: `${student?.fullName}'s average for ${grade.subjectName} is ${avgScore}%. Please monitor and provide support.`,
          targetRole: 'parent',
          targetUserIds: [parent.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId,
        });
      });

      admins.forEach(admin => {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: `Grade Alert: ${student?.fullName}`,
          message: `${student?.fullName} has average < 50% in ${grade.subjectName} (${avgScore}%)`,
          targetRole: 'admin',
          targetUserIds: [admin.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId,
        });
      });

      if (alertNotifications.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(alertNotifications);
      }
    }

    return Response.json({ success: true, avgScore });
  } catch (error) {
    console.error('Grade notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});