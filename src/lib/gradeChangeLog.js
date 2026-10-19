import { base44 } from '@/api/base44Client';

// Records a reasoned, auditable trail of every teacher grade correction.
// Best-effort: a logging failure must never block the teacher's save.
export async function logGradeChange({ action, grade, before, after, reason, user }) {
  try {
    await base44.entities.GradeChangeLog.create({
      schoolId: grade?.schoolId || user?.schoolId || '',
      schoolName: user?.schoolName || '',
      gradeId: grade?.id || '',
      studentId: grade?.studentId || '',
      studentName: grade?.studentName || '',
      subjectId: grade?.subjectId || '',
      subjectName: grade?.subjectName || '',
      classId: grade?.classId || '',
      className: grade?.className || '',
      term: grade?.term || '',
      assessmentType: grade?.assessmentType || '',
      action,
      reason: reason || '',
      changedBy: user?.id || '',
      changedByName: user?.fullName || '',
      changedAt: new Date().toISOString(),
      ...(before ? {
        previousScore: before.score,
        previousMaxScore: before.maxScore,
        previousTerm: before.term,
        previousAssessmentType: before.assessmentType,
      } : {}),
      ...(after ? {
        newScore: after.score,
        newMaxScore: after.maxScore,
        newTerm: after.term,
        newAssessmentType: after.assessmentType,
      } : {}),
    });
  } catch (e) {
    console.error('Grade change log error:', e);
  }
}