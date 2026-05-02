import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { gradeId, schoolId, studentId, teacherId, subjectId, term } = await req.json();

    if (!gradeId || !schoolId || !studentId || !subjectId || !term) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the grade
    const grades = await base44.asServiceRole.entities.Grade.filter({ id: gradeId });
    const grade = grades?.[0];
    if (!grade) return Response.json({ error: 'Grade not found' }, { status: 404 });

    // Get grading system for this school to get assessment weights
    const gradingSystems = await base44.asServiceRole.entities.GradingSystem.filter({ schoolId });
    const gradingSystem = gradingSystems?.[0];

    const assessmentWeights = gradingSystem?.assessmentWeights || [
      { assessmentType: 'exam', weight: 40 },
      { assessmentType: 'test', weight: 30 },
      { assessmentType: 'quiz', weight: 15 },
      { assessmentType: 'assignment', weight: 15 }
    ];

    // Get all grades for this subject and term
    const allGradesForSubjectTerm = await base44.asServiceRole.entities.Grade.filter({
      schoolId,
      studentId,
      subjectId,
      term
    });

    // Calculate weighted average by assessment type
    let weightedSum = 0;
    let totalWeight = 0;

    const groupedByType = {};
    allGradesForSubjectTerm.forEach(g => {
      if (!groupedByType[g.assessmentType]) {
        groupedByType[g.assessmentType] = [];
      }
      groupedByType[g.assessmentType].push(g);
    });

    // For each assessment type, calculate its average then apply weight
    for (const [assessmentType, assessmentGrades] of Object.entries(groupedByType)) {
      const typeAverage = assessmentGrades.length
        ? Math.round(assessmentGrades.reduce((sum, g) => sum + ((g.score / (g.maxScore || 100)) * 100), 0) / assessmentGrades.length)
        : 0;

      const weight = assessmentWeights.find(w => w.assessmentType === assessmentType)?.weight || 0;
      weightedSum += typeAverage * (weight / 100);
      totalWeight += weight / 100;
    }

    const weightedAverage = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Get student for notification
    const students = await base44.asServiceRole.entities.SchoolUser.filter({ id: studentId });
    const student = students?.[0];

    // Update student's term-specific subject averages
    if (student) {
      const updatedTermGrades = [...(student.termSubjectGrades || [])];
      const existingIndex = updatedTermGrades.findIndex(tg => tg.term === term && tg.subjectId === subjectId);

      if (existingIndex >= 0) {
        updatedTermGrades[existingIndex].weightedAverage = weightedAverage;
        updatedTermGrades[existingIndex].lastUpdated = new Date().toISOString();
      } else {
        updatedTermGrades.push({
          term,
          subjectId,
          weightedAverage,
          lastUpdated: new Date().toISOString()
        });
      }

      await base44.asServiceRole.entities.SchoolUser.update(studentId, {
        termSubjectGrades: updatedTermGrades
      });
    }

    // Get parent linked to this student
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      linkedStudentIds: { $in: [studentId] }
    });

    // Get admin
    const admins = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'admin'
    });

    // Create notifications
    const notifications = [];

    if (student) {
      notifications.push({
        schoolId,
        type: 'grade_updated',
        title: `Grade Updated: ${grade.subjectName}`,
        message: `Your ${grade.assessmentType} score for ${grade.subjectName} has been recorded. Term average: ${weightedAverage}%`,
        targetRole: 'student',
        targetUserIds: [studentId],
        relatedEntityId: gradeId,
        relatedEntityType: 'Grade',
        createdByUser: teacherId
      });
    }

    parents.forEach(parent => {
      notifications.push({
        schoolId,
        type: 'grade_updated',
        title: `${student?.fullName} - Grade Updated`,
        message: `${student?.fullName}'s ${grade.assessmentType} for ${grade.subjectName} has been recorded. Term average: ${weightedAverage}%`,
        targetRole: 'parent',
        targetUserIds: [parent.id],
        relatedEntityId: gradeId,
        relatedEntityType: 'Grade',
        createdByUser: teacherId
      });
    });

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
        createdByUser: teacherId
      });
    });

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Alert if weighted average is below pass mark
    const passMark = gradingSystem?.passMark || 40;
    if (weightedAverage < passMark && allGradesForSubjectTerm.length > 1) {
      const alertNotifications = [];

      if (student?.id) {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: '⚠️ Subject Average Below Pass Mark',
          message: `Your average for ${grade.subjectName} is ${weightedAverage}% (below ${passMark}%). Please seek help.`,
          targetRole: 'student',
          targetUserIds: [student.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId
        });
      }

      parents.forEach(parent => {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: `Alert: ${student?.fullName}'s Grade`,
          message: `${student?.fullName}'s average for ${grade.subjectName} is ${weightedAverage}%. Please monitor.`,
          targetRole: 'parent',
          targetUserIds: [parent.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId
        });
      });

      admins.forEach(admin => {
        alertNotifications.push({
          schoolId,
          type: 'grade_alert',
          title: `Grade Alert: ${student?.fullName}`,
          message: `${student?.fullName} has average ${weightedAverage}% in ${grade.subjectName} (below pass mark).`,
          targetRole: 'admin',
          targetUserIds: [admin.id],
          relatedEntityId: subjectId,
          relatedEntityType: 'Subject',
          createdByUser: teacherId
        });
      });

      if (alertNotifications.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(alertNotifications);
      }
    }

    return Response.json({ success: true, weightedAverage, term });
  } catch (error) {
    console.error('Grade submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});