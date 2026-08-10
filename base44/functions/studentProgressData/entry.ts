import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Helpers
function pct(g) {
  const max = g.maxScore || 100;
  return max > 0 ? (g.score / max) * 100 : 0;
}

function computeOverall(grades) {
  if (!grades || !grades.length) return null;
  return Math.round(grades.reduce((s, g) => s + pct(g), 0) / grades.length);
}

function buildSummary(grades) {
  const bySubject = {};
  (grades || []).forEach((g) => {
    const key = g.subjectId || g.subjectName || 'Unknown';
    if (!bySubject[key]) bySubject[key] = { subjectName: g.subjectName || 'Unknown', scores: [], byType: {} };
    bySubject[key].scores.push(pct(g));
    const t = g.assessmentType || 'other';
    if (!bySubject[key].byType[t]) bySubject[key].byType[t] = [];
    bySubject[key].byType[t].push(pct(g));
  });

  const perSubject = Object.values(bySubject).map((v) => {
    const average = v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : null;
    const byType = Object.entries(v.byType).map(([type, arr]) => ({
      assessmentType: type,
      average: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null,
      count: arr.length,
    }));
    return { subjectName: v.subjectName, average, count: v.scores.length, byType };
  });

  const scored = perSubject.filter((s) => s.average != null);
  const overall = scored.length ? Math.round(scored.reduce((a, s) => a + s.average, 0) / scored.length) : null;

  return { perSubject, overall, gradeCount: (grades || []).length };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { studentId, studentName, callerId, schoolId: bodySchoolId } = body || {};

    // Resolve the caller's SchoolUser.
    // Preferred: explicit callerId passed from the in-app chat (custom SchoolPulse auth).
    // Fallback: Base44 platform user email match (WhatsApp/Telegram channels).
    let caller = null;
    if (callerId) {
      const r = await base44.asServiceRole.entities.SchoolUser.filter({ id: callerId });
      caller = (r || [])[0];
    }
    if (!caller) {
      try {
        const platformUser = await base44.auth.me();
        if (platformUser?.email) {
          const byEmail = await base44.asServiceRole.entities.SchoolUser.filter({ email: platformUser.email });
          caller = (byEmail || [])[0];
        }
      } catch {}
    }
    if (!caller) return Response.json({ error: 'No school profile found for this user. Ensure your SchoolPulse account is linked to a school.' }, { status: 403 });
    if (caller.isArchived) return Response.json({ error: 'Account is archived' }, { status: 403 });

    // The caller's own schoolId is the single source of truth — prevents any cross-school data leakage.
    const schoolId = caller.schoolId;
    if (!schoolId) return Response.json({ error: 'No school associated with this account' }, { status: 403 });
    if (bodySchoolId && bodySchoolId !== schoolId) return Response.json({ error: 'School mismatch' }, { status: 403 });

    const role = caller.role || 'user';
    const norm = (str) => (str || '').toLowerCase().trim();

    // Teachers are restricted to students in their assigned classes and grades in their assigned subjects.
    const teacherSubjectIds = role === 'teacher'
      ? [...new Set([...(caller.assignedSubjects || []), ...((caller.teachingAssignments || []).map((a) => a.subjectId).filter(Boolean))])]
      : [];
    const teacherClassIds = role === 'teacher'
      ? [...new Set([...(caller.assignedClasses || []), ...((caller.teachingAssignments || []).map((a) => a.classId).filter(Boolean))])]
      : [];

    // ---- Resolve a target student based on role + request ----
    let targetStudent = null;

    if (studentId) {
      const studs = await base44.asServiceRole.entities.SchoolUser.filter({ id: studentId });
      const s = (studs || [])[0];
      if (!s) return Response.json({ error: 'Student not found' }, { status: 404 });
      if (s.schoolId !== schoolId) return Response.json({ error: 'Student does not belong to your school' }, { status: 403 });
      if (role === 'parent' && !(caller.linkedStudentIds || []).includes(s.id))
        return Response.json({ error: 'You are not linked to this student' }, { status: 403 });
      if (role === 'student' && s.id !== caller.id)
        return Response.json({ error: 'Students can only view their own data' }, { status: 403 });
      if (role === 'teacher' && teacherClassIds.length && !teacherClassIds.includes(s.classId))
        return Response.json({ error: 'Student is not in your assigned classes' }, { status: 403 });
      targetStudent = s;
    } else if (studentName) {
      const studs = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false });
      const match = (studs || []).find(
        (s) => norm(s.fullName) === norm(studentName) || norm(s.fullName).includes(norm(studentName)),
      );
      if (match) {
        if (role === 'parent' && !(caller.linkedStudentIds || []).includes(match.id))
          return Response.json({ error: 'You are not linked to this student' }, { status: 403 });
        if (role === 'student' && match.id !== caller.id)
          return Response.json({ error: 'Students can only view their own data' }, { status: 403 });
        if (role === 'teacher' && teacherClassIds.length && !teacherClassIds.includes(match.classId))
          return Response.json({ error: 'Student is not in your assigned classes' }, { status: 403 });
        targetStudent = match;
      }
    } else {
      // No explicit target — auto-resolve for student/parent(single link)
      if (role === 'student') {
        targetStudent = caller;
      } else if (role === 'parent') {
        const linked = caller.linkedStudentIds || [];
        if (linked.length === 1) {
          const r = await base44.asServiceRole.entities.SchoolUser.filter({ id: linked[0] });
          const s = (r || [])[0];
          if (s && s.schoolId === schoolId) targetStudent = s;
        }
      }
    }

    // ---- Target student: return their scoped grades + assignments + summary ----
    if (targetStudent) {
      let grades = await base44.asServiceRole.entities.Grade.filter({ schoolId, studentId: targetStudent.id });
      if (role === 'teacher' && teacherSubjectIds.length) {
        grades = grades.filter((g) => teacherSubjectIds.includes(g.subjectId));
      }

      const subjectIds = [...new Set((grades || []).map((g) => g.subjectId).filter(Boolean))];
      const allSubjects = await base44.asServiceRole.entities.Subject.filter({ schoolId });
      const subjects = (allSubjects || [])
        .filter((s) => subjectIds.length === 0 || subjectIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name, streamType: s.streamType }));

      let assignments = [];
      if (targetStudent.classId) {
        const as = await base44.asServiceRole.entities.Assignment.filter({ schoolId, classId: targetStudent.classId });
        assignments = (as || []).filter((a) => !a.isArchived).map((a) => ({
          title: a.title,
          subjectName: a.subjectName,
          dueDate: a.dueDate,
          maxScore: a.maxScore,
          term: a.term,
        }));
      }

      const summary = buildSummary(grades);

      return Response.json({
        schoolId,
        schoolName: caller.schoolName,
        callerRole: role,
        target: {
          id: targetStudent.id,
          fullName: targetStudent.fullName,
          className: targetStudent.className,
          classId: targetStudent.classId,
        },
        roster: [],
        grades: (grades || []).map((g) => ({
          subjectName: g.subjectName,
          subjectId: g.subjectId,
          assessmentType: g.assessmentType,
          score: g.score,
          maxScore: g.maxScore,
          term: g.term,
          lastUpdatedAt: g.lastUpdatedAt,
        })),
        assignments,
        subjects,
        summary,
      });
    }

    // ---- No target: return a school-scoped roster for teachers/admins (or parent's children) ----
    let rosterStudents = [];

    if (role === 'parent') {
      for (const lid of caller.linkedStudentIds || []) {
        const r = await base44.asServiceRole.entities.SchoolUser.filter({ id: lid });
        const s = (r || [])[0];
        if (s && s.schoolId === schoolId && !s.isArchived) rosterStudents.push(s);
      }
    } else if (role === 'teacher') {
      const classIds = [
        ...new Set([
          ...(caller.assignedClasses || []),
          ...((caller.teachingAssignments || []).map((a) => a.classId).filter(Boolean)),
        ]),
      ];
      for (const cid of classIds) {
        const studs = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, classId: cid, role: 'student', isArchived: false });
        (studs || []).forEach((s) => rosterStudents.push(s));
      }
    } else {
      // admin / superAdmin / hr_staff — all students in the school
      const studs = await base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false });
      rosterStudents = studs || [];
    }

    // Dedupe
    const seen = new Set();
    rosterStudents = rosterStudents.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Fetch grades per roster student — scoped per user, never the whole school's gradebook
    const gradesByStudent = {};
    await Promise.all(rosterStudents.map(async (s) => {
      try {
        const sg = await base44.asServiceRole.entities.Grade.filter({ schoolId, studentId: s.id });
        gradesByStudent[s.id] = (role === 'teacher' && teacherSubjectIds.length)
          ? (sg || []).filter((g) => teacherSubjectIds.includes(g.subjectId))
          : (sg || []);
      } catch {
        gradesByStudent[s.id] = [];
      }
    }));

    const roster = rosterStudents.map((s) => {
      const g = gradesByStudent[s.id] || [];
      return {
        id: s.id,
        fullName: s.fullName,
        className: s.className,
        overallAverage: computeOverall(g),
        gradeCount: g.length,
      };
    });

    return Response.json({
      schoolId,
      schoolName: caller.schoolName,
      callerRole: role,
      target: null,
      roster,
      grades: [],
      assignments: [],
      subjects: [],
      summary: null,
      note: role === 'parent' && roster.length === 0
        ? 'No linked students found. Please link a student to view progress.'
        : 'No specific student selected. A roster is provided — ask the user which student to analyze, or pass the student name/id to the tool for a detailed report.',
    });
  } catch (error) {
    console.error('studentProgressData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}