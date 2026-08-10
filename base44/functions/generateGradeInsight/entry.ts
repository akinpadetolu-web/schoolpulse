import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateAndStoreInsight } from '../../shared/insightGenerator.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { schoolId, studentId, subjectId, term, classId, generatedBy } = body;

    if (!schoolId || !studentId || !subjectId) {
      return Response.json({ error: 'Missing schoolId, studentId, or subjectId' }, { status: 400 });
    }

    const result = await generateAndStoreInsight(base44, {
      schoolId,
      studentId,
      subjectId,
      term,
      classId,
      generatedBy: generatedBy || 'manual',
    });

    if (!result) {
      return Response.json({ message: 'No grades found for this student/subject/term' });
    }

    return Response.json({ success: true, insight: result });
  } catch (error) {
    console.error('[generateGradeInsight] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}