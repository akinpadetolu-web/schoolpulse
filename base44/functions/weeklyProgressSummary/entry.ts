import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PCT = (g) => (g.maxScore ? (g.score / g.maxScore) * 100 : 0);
const avg = (list) => (!list.length ? null : list.reduce((s, g) => s + PCT(g), 0) / list.length);
const gradeDate = (g, now) => new Date(g.lastUpdatedAt || g.updated_date || g.created_date || now);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const trendArrow = (delta) => (delta == null ? '' : delta > 2 ? '▲' : delta < -2 ? '▼' : '→');

function buildStudentTrends(grades, students, subjects, weekAgo, twoWeeksAgo, now) {
  const subjectMap = {};
  (subjects || []).forEach((s) => { subjectMap[s.id] = s.name; });

  return (students || []).map((st) => {
    const sg = grades.filter((g) => g.studentId === st.id);
    const thisWeek = sg.filter((g) => gradeDate(g, now) >= weekAgo);
    const lastWeek = sg.filter((g) => {
      const d = gradeDate(g, now);
      return d >= twoWeeksAgo && d < weekAgo;
    });
    const thisAvg = avg(thisWeek);
    const lastAvg = avg(lastWeek);
    const delta = thisAvg != null && lastAvg != null ? round1(thisAvg - lastAvg) : null;
    const atRisk = thisAvg != null && (thisAvg < 50 || (delta != null && delta < -15));

    const bySubject = {};
    thisWeek.forEach((g) => {
      const name = g.subjectName || subjectMap[g.subjectId] || 'Unknown';
      if (!bySubject[name]) bySubject[name] = [];
      bySubject[name].push(g);
    });
    const subjectsThisWeek = Object.entries(bySubject).map(([name, arr]) => ({
      subject: name,
      avg: round1(avg(arr)),
      count: arr.length,
    }));

    return {
      id: st.id,
      name: st.fullName,
      className: st.className || '',
      classId: st.classId,
      thisAvg: round1(thisAvg),
      lastAvg: round1(lastAvg),
      delta,
      atRisk,
      gradeCount: thisWeek.length,
      subjectsThisWeek,
    };
  });
}

async function generateInsights(base44, school, studentTrends) {
  const withData = studentTrends.filter((s) => s.thisAvg != null);
  if (withData.length === 0) return null;

  const atRiskStudents = withData.filter((s) => s.atRisk).map((s) => s.name);
  const compact = {
    schoolName: school.schoolName,
    students: withData.map((s) => ({
      name: s.name,
      className: s.className,
      thisAvg: s.thisAvg,
      lastAvg: s.lastAvg,
      delta: s.delta,
      atRisk: s.atRisk,
      subjects: s.subjectsThisWeek.map((x) => ({ subject: x.subject, avg: x.avg })),
    })),
    atRiskStudents,
  };

  const prompt = `You are Kairos, an encouraging academic progress evaluator for ${school.schoolName}.
Analyze this week's student grade trends and produce concise, actionable insights.

Data (JSON):
${JSON.stringify(compact)}

Return a JSON object with exactly these fields:
- "schoolHighlights": 2-3 sentences summarizing overall performance and notable patterns this week.
- "atRiskNotes": an array of objects, one for EVERY student name in atRiskStudents, each with "name" (the student's name) and "note" (ONE targeted, encouraging support suggestion).
- "subjectTrends": an array of objects for subjects with notable movement, each with "subject" (subject name) and "note" (ONE sentence on the trend).
Keep every sentence brief, specific, and encouraging. No markdown.`;

  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          schoolHighlights: { type: 'string' },
          atRiskNotes: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, note: { type: 'string' } }, required: ['name', 'note'] },
          },
          subjectTrends: {
            type: 'array',
            items: { type: 'object', properties: { subject: { type: 'string' }, note: { type: 'string' } }, required: ['subject', 'note'] },
          },
        },
      },
    });
    return res;
  } catch (e) {
    console.error('[weeklyProgressSummary] LLM failed:', e.message);
    return null;
  }
}

async function processSchool(base44, school, weekAgo, twoWeeksAgo, now) {
  const schoolId = school.id;
  if (school.notifyGradeUpdates === false) {
    return { schoolId, schoolName: school.schoolName, skipped: 'notifications disabled' };
  }

  const [grades, students, subjects, teachers, parents] = await Promise.all([
    base44.asServiceRole.entities.Grade.filter({ schoolId }),
    base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }),
    base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
    base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
    base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'parent', isArchived: false }),
  ]);

  const allGrades = grades || [];
  const thisWeekCount = allGrades.filter((g) => gradeDate(g, now) >= weekAgo).length;
  if (thisWeekCount === 0) {
    return { schoolId, schoolName: school.schoolName, skipped: 'no grades this week' };
  }

  const studentTrends = buildStudentTrends(allGrades, students || [], subjects || [], weekAgo, twoWeeksAgo, now);
  const insights = await generateInsights(base44, school, studentTrends);

  const weekStartStr = weekAgo.toLocaleDateString();
  const todayStr = now.toLocaleDateString();
  const schoolHighlights = insights?.schoolHighlights || '';
  const atRiskNotes = {};
  (Array.isArray(insights?.atRiskNotes) ? insights.atRiskNotes : []).forEach((n) => {
    if (n && n.name) atRiskNotes[n.name] = n.note || '';
  });
  const subjectTrends = {};
  (Array.isArray(insights?.subjectTrends) ? insights.subjectTrends : []).forEach((n) => {
    if (n && n.subject) subjectTrends[n.subject] = n.note || '';
  });
  const subjectTrendLines = Object.entries(subjectTrends);

  let emailsSent = 0;
  let teacherEmailed = 0;
  let parentEmailed = 0;

  // Teacher emails
  for (const teacher of teachers || []) {
    if (!teacher.email) continue;
    const teacherClassIds = [...new Set([
      ...(teacher.assignedClasses || []),
      ...((teacher.teachingAssignments || []).map((a) => a.classId).filter(Boolean)),
    ])];
    const myStudents = studentTrends.filter((s) => (teacherClassIds.length ? teacherClassIds.includes(s.classId) : true));
    const myActive = myStudents.filter((s) => s.thisAvg != null);
    if (myStudents.length === 0) continue;

    const lines = [];
    lines.push(`Dear ${teacher.fullName || 'Teacher'},`);
    lines.push('');
    lines.push(`Here is your weekly student progress summary from Kairos for ${school.schoolName}, for the week of ${weekStartStr} – ${todayStr}.`);
    lines.push('');
    if (schoolHighlights) { lines.push('OVERALL HIGHLIGHTS'); lines.push(schoolHighlights); lines.push(''); }
    lines.push('YOUR STUDENTS THIS WEEK');
    if (myActive.length === 0) {
      lines.push('No new grades recorded for your students this week.');
    } else {
      myActive.forEach((s) => {
        const deltaStr = s.delta != null ? ` ${trendArrow(s.delta)} ${s.delta > 0 ? '+' : ''}${s.delta} vs last week` : '';
        const risk = s.atRisk && atRiskNotes[s.name] ? ` — Support: ${atRiskNotes[s.name]}` : (s.atRisk ? ' — may need support' : '');
        lines.push(`• ${s.name}${s.className ? ` (${s.className})` : ''}: ${s.thisAvg}%${deltaStr}${risk}`);
      });
    }
    lines.push('');
    if (subjectTrendLines.length) {
      lines.push('SUBJECT TRENDS');
      subjectTrendLines.forEach(([sub, note]) => lines.push(`• ${sub}: ${note}`));
      lines.push('');
    }
    const myAtRisk = myActive.filter((s) => s.atRisk && atRiskNotes[s.name]);
    if (myAtRisk.length) {
      lines.push('STUDENTS NEEDING SUPPORT');
      myAtRisk.forEach((s) => lines.push(`• ${s.name}: ${atRiskNotes[s.name]}`));
      lines.push('');
    }
    lines.push('Review detailed insights in the Kairos chat on your portal.');
    lines.push('');
    lines.push('Warm regards,');
    lines.push(`Kairos — ${school.schoolName}`);

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: teacher.email,
        subject: `Kairos Weekly Progress Summary — ${school.schoolName}`,
        body: lines.join('\n'),
      });
      emailsSent++; teacherEmailed++;
    } catch (e) {
      console.error(`[weeklyProgressSummary] teacher email failed (${teacher.email}): ${e.message}`);
    }
  }

  // Parent emails
  for (const parent of parents || []) {
    if (!parent.email) continue;
    const linkedIds = parent.linkedStudentIds || [];
    if (linkedIds.length === 0) continue;
    const childTrends = studentTrends.filter((s) => linkedIds.includes(s.id));
    if (childTrends.length === 0) continue;
    const anyActive = childTrends.some((s) => s.thisAvg != null || s.gradeCount > 0);
    if (!anyActive) continue;

    for (const child of childTrends) {
      const lines = [];
      lines.push(`Dear ${parent.fullName || 'Parent/Guardian'},`);
      lines.push('');
      lines.push(`Here is ${child.name}'s weekly progress summary from Kairos for ${school.schoolName}, for the week of ${weekStartStr} – ${todayStr}.`);
      lines.push('');
      if (schoolHighlights) { lines.push('SCHOOL HIGHLIGHTS'); lines.push(schoolHighlights); lines.push(''); }
      lines.push(`${child.name}'S THIS WEEK`);
      if (child.subjectsThisWeek.length === 0) {
        lines.push('No new grades recorded this week.');
      } else {
        child.subjectsThisWeek.forEach((x) => lines.push(`• ${x.subject}: ${x.avg}% (${x.count} grade${x.count > 1 ? 's' : ''})`));
        if (child.thisAvg != null) {
          const deltaStr = child.delta != null ? ` ${trendArrow(child.delta)} ${child.delta > 0 ? '+' : ''}${child.delta} vs last week` : '';
          lines.push(`Overall this week: ${child.thisAvg}%${deltaStr}`);
        }
      }
      lines.push('');
      if (child.atRisk && atRiskNotes[child.name]) {
        lines.push('SUPPORT SUGGESTION');
        lines.push(atRiskNotes[child.name]);
        lines.push('');
      }
      if (subjectTrendLines.length) {
        lines.push('SUBJECT TRENDS (SCHOOL-WIDE)');
        subjectTrendLines.forEach(([sub, note]) => lines.push(`• ${sub}: ${note}`));
        lines.push('');
      }
      lines.push('Review more details in the Kairos chat on the parent portal.');
      lines.push('');
      lines.push('Warm regards,');
      lines.push(`Kairos — ${school.schoolName}`);

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: parent.email,
          subject: `Kairos Weekly Update on ${child.name} — ${school.schoolName}`,
          body: lines.join('\n'),
        });
        emailsSent++; parentEmailed++;
      } catch (e) {
        console.error(`[weeklyProgressSummary] parent email failed (${parent.email}): ${e.message}`);
      }
    }
  }

  return {
    schoolId,
    schoolName: school.schoolName,
    thisWeekGrades: thisWeekCount,
    studentsAnalyzed: studentTrends.filter((s) => s.thisAvg != null).length,
    emailsSent,
    teacherEmailed,
    parentEmailed,
    insightsGenerated: !!insights,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const schoolIdParam = body?.schoolId;

    let schools = [];
    if (schoolIdParam) {
      const s = await base44.asServiceRole.entities.School.get(schoolIdParam).catch(() => null);
      if (s) schools = [s];
    } else {
      schools = await base44.asServiceRole.entities.School.filter({ isActive: true, isArchived: false });
    }
    schools = (schools || []).filter(Boolean);
    if (schools.length === 0) return Response.json({ message: 'No active schools found' });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

    const results = [];
    for (const school of schools) {
      try {
        results.push(await processSchool(base44, school, weekAgo, twoWeeksAgo, now));
      } catch (e) {
        results.push({ schoolId: school.id, schoolName: school.schoolName, error: e.message });
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}