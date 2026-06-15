import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all quizzes
    const quizzes = await base44.entities.Quiz.list();
    
    // Fetch all assignments
    const assignments = await base44.entities.Assignment.list();

    let migratedCount = 0;
    let errors = [];

    // Migrate Quizzes to Assessments
    for (const quiz of quizzes) {
      try {
        await base44.entities.Assessment.create({
          schoolId: quiz.schoolId,
          academicYear: new Date().getFullYear().toString(),
          term: 'Term 1',
          classId: quiz.classId || (quiz.classIds && quiz.classIds[0]) || '',
          classIds: quiz.classIds || (quiz.classId ? [quiz.classId] : []),
          subjectId: quiz.subjectId,
          subjectName: quiz.subjectName || '',
          teacherId: quiz.teacherId,
          teacherName: quiz.teacherName || '',
          title: quiz.title,
          description: quiz.description || '',
          assessmentType: 'Quiz',
          weight: 20,
          maxScore: 100,
          dueDate: new Date().toISOString().split('T')[0],
          durationMinutes: quiz.durationMinutes || 30,
          isVisibleToStudent: !quiz.isArchived,
          isVisibleToParent: !quiz.isArchived,
          isPublished: quiz.isPublished || false,
          isArchived: quiz.isArchived || false,
          legacyQuizId: quiz.id
        });
        migratedCount++;
      } catch (err) {
        errors.push(`Quiz ${quiz.id}: ${err.message}`);
      }
    }

    // Migrate Assignments to Assessments
    for (const assignment of assignments) {
      try {
        await base44.entities.Assessment.create({
          schoolId: assignment.schoolId,
          academicYear: new Date().getFullYear().toString(),
          term: assignment.term || 'Term 1',
          classId: assignment.classId || '',
          classIds: assignment.classId ? [assignment.classId] : [],
          subjectId: assignment.subjectId,
          subjectName: assignment.subjectName || '',
          teacherId: assignment.teacherId,
          teacherName: assignment.teacherName || '',
          title: assignment.title,
          description: assignment.description || '',
          assessmentType: 'Assignment',
          weight: 15,
          maxScore: assignment.maxScore || 100,
          dueDate: assignment.dueDate || new Date().toISOString().split('T')[0],
          isVisibleToStudent: !assignment.isArchived,
          isVisibleToParent: !assignment.isArchived,
          isPublished: assignment.isPublished || false,
          isArchived: assignment.isArchived || false,
          legacyAssignmentId: assignment.id
        });
        migratedCount++;
      } catch (err) {
        errors.push(`Assignment ${assignment.id}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      migratedCount,
      totalProcessed: quizzes.length + assignments.length,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});