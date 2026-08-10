import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildInsightPayload } from '../../shared/insightGenerator.ts';

/**
 * Bulk-generate Kairos insights for a teacher's students (or a single student).
 * Skips any (student, subject, term) combo that already has an insight, so it only fills gaps.
 * Uses the deterministic third-person fallback text (no LLM) to stay fast and free; the LLM-polished
 * version is still produced one-at-a-time on each new grade submission via onGradeSubmittedV2.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const schoolId = body.schoolId || user.schoolId;
    if (!schoolId) return Response.json({ error: 'Missing schoolId' }, { status: 400 });

    const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

    // Resolve the student scope
    let scopeStudents;
    if (body.studentId) {
      const s = await base44.asServiceRole.entities.SchoolUser.filter({ id: body.studentId });
      scopeStudents = (s || []).filter((u) => u.role === 'student');
    } else {
      const allStudents = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false });
      const classIds = (body.classIds && body.classIds.length) ? body.classIds : (isAdmin ? [] : (user.assignedClasses || []));
      scopeStudents = classIds.length ? (allStudents || []).filter((s) => classIds.includes(s.classId)) : (allStudents || []);
    }

    if (scopeStudents.length === 0) return Response.json({ success: true, generated: 0, total: 0 });

    const studentIds = new Set(scopeStudents.map((s) => s.id));
    const studentById = {};
    scopeStudents.forEach((s) => { studentById[s.id] = s; });

    // Subject scope
    const subjectIds = (body.subjectIds && body.subjectIds.length) ? body.subjectIds : (isAdmin ? [] : (user.assignedSubjects || []));
    const subjectScope = subjectIds.length ? new Set(subjectIds) : null;

    // Fetch grades for these students
    let grades = [];
    if (body.studentId) {
      grades = await base44.asServiceRole.entities.Grade.filter({ schoolId, studentId: body.studentId });
    } else {
      const classIds = [...new Set(scopeStudents.map((s) => s.classId).filter(Boolean))];
      for (const cid of classIds) {
        const g = await base44.asServiceRole.entities.Grade.filter({ schoolId, classId: cid });
        grades = grades.concat(g || []);
      }
    }
    grades = (grades || []).filter((g) => studentIds.has(g.studentId) && (!subjectScope || subjectScope.has(g.subjectId)));

    // Fetch supporting data once
    const [allSubjects, gradeCats, gradingSystems, existing] = await Promise.all([
      base44.asServiceRole.entities.Subject.filter({ schoolId }),
      base44.asServiceRole.entities.GradeCategory.filter({ schoolId }),
      base44.asServiceRole.entities.GradingSystem.filter({ schoolId }),
      base44.asServiceRole.entities.StudentInsight.filter({ schoolId }),
    ]);
    const subjectById = {};
    (allSubjects || []).forEach((s) => { subjectById[s.id] = s; });
    const gradingSystem = (gradingSystems || [])[0] || null;
    const catsByClassSubject = {};
    (gradeCats || []).forEach((c) => {
      const k = `${c.classId}|${c.subjectId}`;
      if (!catsByClassSubject[k]) catsByClassSubject[k] = [];
      catsByClassSubject[k].push(c);
    });

    // Skip combos that already have an insight; keep the latest per (student, subject) for trend.
    const existingKeys = new Set();
    const latestByPair = {};
    (existing || []).forEach((i) => {
      existingKeys.add(`${i.studentId}|${i.subjectId}|${i.term || ''}`);
      const pk = `${i.studentId}|${i.subjectId}`;
      if (!latestByPair[pk] || new Date(i.updated_date) > new Date(latestByPair[pk].updated_date)) latestByPair[pk] = i;
    });

    // Group grades by combo
    const gradesByCombo = {};
    grades.forEach((g) => {
      const t = g.term || '';
      const key = `${g.studentId}|${g.subjectId}|${t}`;
      if (!gradesByCombo[key]) gradesByCombo[key] = [];
      gradesByCombo[key].push(g);
    });

    // Build payloads only for combos missing an insight
    const payloads = [];
    for (const [key, comboGrades] of Object.entries(gradesByCombo)) {
      if (existingKeys.has(key)) continue;
      const [studentId, subjectId, term] = key.split('|');
      const student = studentById[studentId];
      const subject = subjectById[subjectId];
      if (!student || !subject) continue;
      const cats = catsByClassSubject[`${student.classId}|${subjectId}`] || [];
      const prev = latestByPair[`${studentId}|${subjectId}`];
      const payload = await buildInsightPayload({
        schoolId, student, subject, grades: comboGrades, gradeCats: cats,
        gradingSystem, prev, term, classId: student.classId, generatedBy: 'manual', useLlm: false,
      });
      if (payload) payloads.push(payload);
    }

    // Chunk bulkCreate to stay within limits
    const CHUNK = 100;
    for (let i = 0; i < payloads.length; i += CHUNK) {
      await base44.asServiceRole.entities.StudentInsight.bulkCreate(payloads.slice(i, i + CHUNK));
    }

    return Response.json({ success: true, generated: payloads.length, total: Object.keys(gradesByCombo).length });
  } catch (error) {
    console.error('[generateStudentInsights] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}