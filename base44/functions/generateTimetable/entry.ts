import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { schoolId, prompt, targetClassIds } = await req.json();
    if (!schoolId || !prompt || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, prompt, targetClassIds' }, { status: 400 });
    }

    // Fetch only RELEVANT data (target classes and their subjects/teachers)
    const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.asServiceRole.entities.TimetableEntry.filter({ schoolId }),
    ]);

    // Filter to only the target classes
    const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
    if (targetClasses.length === 0) {
      return Response.json({ error: 'No valid classes found' }, { status: 400 });
    }

    // Filter subjects applicable to target classes
    const relevantSubjectIds = new Set();
    targetClasses.forEach(c => {
      (c.applicableClasses || []).forEach(cid => {
        if (targetClassIds.includes(cid)) {
          allSubjects.forEach(s => {
            if ((s.applicableClasses || []).includes(cid)) {
              relevantSubjectIds.add(s.id);
            }
          });
        }
      });
    });

    const relevantSubjects = allSubjects.filter(s => relevantSubjectIds.has(s.id));
    
    // Filter teachers who teach relevant subjects
    const relevantTeacherIds = new Set();
    (allTeachers || []).forEach(t => {
      (t.teachingAssignments || []).forEach(a => {
        if (targetClassIds.includes(a.classId) && relevantSubjectIds.has(a.subjectId)) {
          relevantTeacherIds.add(t.id);
        }
      });
    });
    const relevantTeachers = allTeachers.filter(t => relevantTeacherIds.has(t.id));

    // Filter existing entries for target classes only
    const relevantExistingEntries = (existingEntries || []).filter(e => targetClassIds.includes(e.classId));

    // Build MINIMAL context
    const classesInfo = targetClasses.map(c => ({
      id: c.id,
      name: c.className,
      level: c.educationLevel || '',
    }));

    const subjectsInfo = relevantSubjects.map(s => ({
      id: s.id,
      name: s.name,
      compulsory: s.isCompulsory || false,
    }));

    const teachersInfo = relevantTeachers.map(t => ({
      id: t.id,
      name: t.fullName,
      subjects: (t.teachingAssignments || [])
        .filter(a => targetClassIds.includes(a.classId))
        .map(a => relevantSubjects.find(s => s.id === a.subjectId)?.name)
        .filter(Boolean),
    }));

    const existingSummary = relevantExistingEntries.map(e => ({
      classId: e.classId,
      className: e.className,
      subjectName: e.subjectName,
      day: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
    }));

    // OPTIMIZED PROMPT - explicit full week schedule
    const systemContext = `You are a school timetable scheduling AI. Generate a COMPLETE timetable for ALL 5 days (Monday, Tuesday, Wednesday, Thursday, Friday) for EVERY target class listed below.

TARGET CLASSES: ${JSON.stringify(classesInfo)}
AVAILABLE SUBJECTS: ${JSON.stringify(subjectsInfo)}
AVAILABLE TEACHERS: ${JSON.stringify(teachersInfo)}
EXISTING ENTRIES (do not reschedule): ${JSON.stringify(existingSummary)}

STRICT RULES:
1. You MUST generate entries for ALL 5 days: Monday, Tuesday, Wednesday, Thursday, Friday. Do NOT skip any day.
2. Each period is 45 minutes long.
3. Monday–Thursday: school runs 08:30–15:15. Friday: school runs 08:30–14:30.
4. Fixed breaks – NO classes during these times (every day):
   - Short Break: 10:00–10:30
   - Long Break: 12:00–13:00
5. Mathematics, English, and Science MUST be scheduled between 08:30 and 12:00 (before long break).
6. No class can have two subjects at the same time on the same day.
7. No teacher can teach two classes at the same time on the same day.
8. Assign teachers based on their teaching assignments.
9. Do not reschedule existing entries.

Valid time slots (HH:MM format):
- 08:30–09:15
- 09:15–10:00
- 10:30–11:15
- 11:15–12:00
- 13:00–13:45
- 13:45–14:30
- 14:30–15:15 (Monday–Thursday only)

Return a JSON object with:
{
  "reasoning": "brief explanation",
  "slots": [{"classId": "...", "className": "...", "subjectId": "...", "subjectName": "...", "teacherId": "...", "teacherName": "...", "dayOfWeek": "...", "startTime": "HH:MM", "endTime": "HH:MM"}],
  "warnings": ["..."]
}

USER INSTRUCTION: "${prompt}"`;

    // Use FASTER model (gemini_3_flash) with token limit
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemContext,
      model: 'claude_opus_4_7',
      response_json_schema: {
        type: 'object',
        properties: {
          reasoning: { type: 'string' },
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                classId: { type: 'string' },
                className: { type: 'string' },
                subjectId: { type: 'string' },
                subjectName: { type: 'string' },
                teacherId: { type: 'string' },
                teacherName: { type: 'string' },
                dayOfWeek: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
              },
            },
          },
          warnings: { type: 'array', items: { type: 'string' } },
        },
        required: ['slots'],
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error('Timetable generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});