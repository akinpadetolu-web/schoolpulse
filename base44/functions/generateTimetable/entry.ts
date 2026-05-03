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

    // OPTIMIZED PROMPT - minimal but complete
    const systemContext = `You are a school timetable scheduling AI. Generate a timetable ONLY for these target classes.

TARGET CLASSES: ${JSON.stringify(classesInfo)}
AVAILABLE SUBJECTS: ${JSON.stringify(subjectsInfo)}
AVAILABLE TEACHERS: ${JSON.stringify(teachersInfo)}
EXISTING ENTRIES (do not reschedule): ${JSON.stringify(existingSummary)}

RULES:
1. No class can have two subjects at the same time on the same day
2. No teacher can be in two places at the same time on the same day
3. Use time slots: 08:00-09:00, 09:00-10:00, 10:15-11:15, 11:15-12:15, 13:00-14:00, 14:00-15:00
4. Each class should have 5-6 periods per day (Mon-Fri)
5. Assign teachers based on their subject availability
6. Avoid rescheduling existing entries

Generate ONLY for the target classes. Return a JSON with:
{
  "reasoning": "brief explanation",
  "slots": [{"classId": "...", "className": "...", "subjectId": "...", "subjectName": "...", "teacherId": "...", "teacherName": "...", "dayOfWeek": "...", "startTime": "...", "endTime": "..."}],
  "warnings": ["..."]
}

USER INSTRUCTION: "${prompt}"`;

    // Use FASTER model (gemini_3_flash) with token limit
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemContext,
      model: 'gemini_3_flash',
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