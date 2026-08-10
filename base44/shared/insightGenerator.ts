// Kairos Insight Generator — shared logic for grade analysis.
// Imported by onGradeSubmittedV2 (auto trigger) and generateGradeInsight (manual/admin trigger).

const PCT = (g) => (g && g.maxScore ? (g.score / g.maxScore) * 100 : 0);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/**
 * Compute weighted metrics from a student's grades.
 * - When no exam grade exists yet: preExamAverage = non-exam contribution, requiredExamScore = % needed on the upcoming exam.
 * - When an exam grade already exists: examCompleted = true, examScore + currentFinal reflect the actual result;
 *   requiredExamScore is nulled so we never advise on an "upcoming" exam that's already done.
 */
export function computePreExamMetrics(grades, gradeCategories, assessmentWeights, passMark) {
  const safeGrades = grades || [];
  const safeCats = gradeCategories || [];
  const pass = passMark ?? 40;

  if (safeGrades.length === 0) {
    return {
      preExamAverage: null, examWeight: 0, projectedFinal: null, requiredExamScore: null,
      categoryAverages: [], hasWeights: safeCats.length > 0,
      examCompleted: false, examScore: null, currentFinal: null,
    };
  }

  // Weight map: prefer per-class per-subject GradeCategory config, fallback to GradingSystem.assessmentWeights
  const weightMap = {};
  if (safeCats.length > 0) {
    safeCats.forEach((c) => { weightMap[c.assessmentType] = c.weight; });
  } else if (assessmentWeights && assessmentWeights.length) {
    assessmentWeights.forEach((w) => { weightMap[w.assessmentType] = w.weight; });
  }

  // Group grades by assessmentType
  const grouped = {};
  safeGrades.forEach((g) => {
    const t = g.assessmentType;
    if (!t) return;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(g);
  });

  const categoryAverages = Object.entries(grouped).map(([type, gs]) => ({
    assessmentType: type,
    categoryAvg: gs.reduce((s, g) => s + PCT(g), 0) / gs.length,
    count: gs.length,
  }));

  const examGrades = grouped['exam'] || [];
  const examCompleted = examGrades.length > 0;
  const examScore = examCompleted ? round1(examGrades.reduce((s, g) => s + PCT(g), 0) / examGrades.length) : null;

  // No weight config → simple average fallback (can't isolate exam)
  if (Object.keys(weightMap).length === 0) {
    const simpleAvg = safeGrades.reduce((s, g) => s + PCT(g), 0) / safeGrades.length;
    return {
      preExamAverage: round1(simpleAvg),
      examWeight: 0,
      projectedFinal: round1(simpleAvg),
      requiredExamScore: null,
      categoryAverages,
      hasWeights: false,
      examCompleted,
      examScore,
      currentFinal: round1(simpleAvg),
    };
  }

  let preExamContribution = 0;
  let examWeight = 0;
  categoryAverages.forEach((ca) => {
    const w = weightMap[ca.assessmentType] || 0;
    if (ca.assessmentType === 'exam') {
      examWeight = w;
    } else {
      preExamContribution += ca.categoryAvg * (w / 100);
    }
  });

  const projectedFinal = round1(preExamContribution);
  const currentFinal = examCompleted ? round1(preExamContribution + (examScore * examWeight / 100)) : null;

  // Only compute a "required exam score" when the exam has NOT been taken yet.
  let requiredExamScore = null;
  if (examWeight > 0 && !examCompleted) {
    const needed = (pass - preExamContribution) / (examWeight / 100);
    if (needed <= 0) requiredExamScore = 0;
    else if (needed > 100) requiredExamScore = -1; // impossible
    else requiredExamScore = round1(needed);
  }

  return {
    preExamAverage: round1(preExamContribution),
    examWeight,
    projectedFinal,
    requiredExamScore,
    categoryAverages,
    hasWeights: true,
    examCompleted,
    examScore,
    currentFinal,
  };
}

export function determineInsightType(metrics, trendDirection, passMark) {
  if (metrics.preExamAverage == null) return 'neutral';
  const pass = passMark ?? 40;

  if (metrics.examCompleted) {
    // Exam already done → judge by the actual final result.
    const cf = metrics.currentFinal;
    if (cf == null) return 'neutral';
    if (cf < pass) return 'negative';
    if (cf >= 70) return 'positive';
    return 'neutral';
  }

  if (metrics.requiredExamScore === -1) return 'warning';
  if (metrics.requiredExamScore != null && metrics.requiredExamScore > 70) return 'negative';
  if (trendDirection === 'declining') return 'negative';
  if (trendDirection === 'improving' && (metrics.projectedFinal == null || metrics.projectedFinal >= pass)) return 'positive';
  return 'neutral';
}

function buildFallbackInsight(input) {
  const name = input.studentName;
  const subj = input.subjectName;
  const pass = input.passMark;

  if (input.examCompleted) {
    const cf = input.currentFinal;
    if (cf == null) return `${name}'s ${subj} exam has been recorded.`;
    if (cf < pass) {
      return `${name} has completed the ${subj} exam and is currently at ${cf}%, below the ${pass}% pass mark. Targeted support is recommended to close the gap.`;
    }
    return `${name} has completed the ${subj} exam and is currently at ${cf}%, ${cf >= 70 ? 'a strong result' : 'meeting the pass mark'}. Encourage continued effort next term.`;
  }

  if (input.requiredExamScore === -1) {
    return `${name} is at risk in ${subj}: even a perfect exam won't reach the ${pass}% pass mark. Urgent support is needed now.`;
  }
  if (typeof input.requiredExamScore === 'number' && input.requiredExamScore > 0) {
    return `${name} needs about ${input.requiredExamScore}% on the upcoming ${subj} exam to reach the ${pass}% pass mark. Pre-exam standing is ${input.preExamAverage}% with a ${input.trendDirection} trend.`;
  }
  return `${name} is on track in ${subj} with a pre-exam standing of ${input.preExamAverage}% and a ${input.trendDirection} trend.`;
}

/**
 * Fetch all required data, compute metrics, generate the AI insight, and append a new StudentInsight record.
 * @param {object} base44 - base44 client (created via createClientFromRequest)
 * @param {object} args - { schoolId, studentId, subjectId, term, classId, generatedBy }
 */
export async function generateAndStoreInsight(base44, args) {
  const { schoolId, studentId, subjectId, term, classId, generatedBy } = args;

  const [students, subjects, gradeCats, gradingSystems, grades, existingInsights] = await Promise.all([
    base44.asServiceRole.entities.SchoolUser.filter({ id: studentId }),
    base44.asServiceRole.entities.Subject.filter({ id: subjectId }),
    classId
      ? base44.asServiceRole.entities.GradeCategory.filter({ schoolId, classId, subjectId })
      : base44.asServiceRole.entities.GradeCategory.filter({ schoolId, subjectId }),
    base44.asServiceRole.entities.GradingSystem.filter({ schoolId }),
    base44.asServiceRole.entities.Grade.filter({ schoolId, studentId, subjectId, term }),
    base44.asServiceRole.entities.StudentInsight.filter({ schoolId, studentId, subjectId, term }),
  ]);

  const student = (students || [])[0];
  const subject = (subjects || [])[0];
  const gradingSystem = (gradingSystems || [])[0];
  const allGrades = grades || [];
  const prevInsights = (existingInsights || []).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
  const prev = prevInsights[0];

  if (allGrades.length === 0) return null;

  const assessmentWeights = gradingSystem?.assessmentWeights || null;
  const passMark = gradingSystem?.passMark ?? 40;

  const metrics = computePreExamMetrics(allGrades, gradeCats, assessmentWeights, passMark);

  // Trend: compare current pre-exam average to the previous stored insight
  let trendDirection = 'new';
  if (prev && prev.preExamAverage != null && metrics.preExamAverage != null) {
    const diff = metrics.preExamAverage - prev.preExamAverage;
    if (diff > 1) trendDirection = 'improving';
    else if (diff < -1) trendDirection = 'declining';
    else trendDirection = 'stable';
  }

  const insightType = determineInsightType(metrics, trendDirection, passMark);

  const llmInput = {
    studentName: student?.fullName || 'the student',
    subjectName: subject?.name || 'this subject',
    term,
    preExamAverage: metrics.preExamAverage,
    examWeight: metrics.examWeight,
    examCompleted: metrics.examCompleted,
    examScore: metrics.examScore,
    currentFinal: metrics.currentFinal,
    requiredExamScore: metrics.requiredExamScore === -1 ? 'impossible' : metrics.requiredExamScore,
    passMark,
    trendDirection,
    categoryAverages: metrics.categoryAverages.map((c) => ({ type: c.assessmentType, avg: round1(c.categoryAvg), count: c.count })),
    gradeCount: allGrades.length,
  };

  const prompt = `You are Kairos, an academic progress evaluator. Generate ONE concise, actionable insight (1-2 sentences, under 40 words, no markdown, no greeting, no quotes) describing a student's academic standing. This insight is read by teachers and parents, so write in the THIRD PERSON about the student (e.g. "Awemokhe's performance is stable...", NOT "your performance").

Data (JSON):
${JSON.stringify(llmInput)}

Rules:
- Always refer to the student by first name in the third person. NEVER use "you" or "your".
- If examCompleted is true, the exam is ALREADY DONE: report the student's current result (currentFinal%) relative to the pass mark (${passMark}%), and recommend next-step support or recognition. Do NOT mention an upcoming exam or a required exam score.
- If examCompleted is false and requiredExamScore is a number greater than 0, state the student needs roughly that % on the upcoming exam to pass (pass mark = ${passMark}%).
- If examCompleted is false and requiredExamScore is "impossible", gently warn that even a perfect exam won't reach the pass mark and the student needs extra support now.
- If examCompleted is false and requiredExamScore is 0 or null (already safe), acknowledge strong standing and suggest maintaining focus.
- Reference the trend (improving/declining/stable) naturally where relevant.
- Be specific and supportive. No bullet points.`;

  let insightText = '';
  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: { insightText: { type: 'string' } },
        required: ['insightText'],
      },
    });
    insightText = (res?.insightText || '').trim();
  } catch (e) {
    console.error('[insightGenerator] LLM failed:', e?.message || e);
  }
  if (!insightText) insightText = buildFallbackInsight(llmInput);

  const payload = {
    schoolId,
    studentId,
    studentName: student?.fullName || '',
    classId: classId || student?.classId || '',
    className: student?.className || '',
    subjectId,
    subjectName: subject?.name || '',
    term: term || '',
    insightText,
    insightType,
    preExamAverage: metrics.preExamAverage,
    examWeight: metrics.examWeight,
    examCompleted: metrics.examCompleted,
    examScore: metrics.examScore,
    currentFinal: metrics.currentFinal,
    requiredExamScore: metrics.requiredExamScore,
    projectedFinal: metrics.projectedFinal,
    trendDirection,
    passMark,
    gradeCount: allGrades.length,
    generatedBy: generatedBy || 'grade_submitted',
  };

  // Always append a new insight record so a full, dated history accumulates across the term
  // (parents/teachers/students can refer back to past insights). Trend is still computed against `prev`.
  const created = await base44.asServiceRole.entities.StudentInsight.create(payload);
  const insightId = created?.id;

  return { insightId, ...payload };
}