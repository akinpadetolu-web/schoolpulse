import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds, prompt } = await req.json();

    if (!schoolId || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, targetClassIds' }, { status: 400 });
    }

    console.log(`[generateTimetable] Fetching school data for ${schoolId}...`);

    const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.asServiceRole.entities.TimetableEntry.filter({ schoolId }),
    ]);

    const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
    if (targetClasses.length === 0) {
      return Response.json({ error: 'No valid classes found for the given IDs' }, { status: 400 });
    }

    const classesInfo = targetClasses.map(c => ({ id: c.id, name: c.className }));

    const subjectsInfo = (allSubjects || []).map(s => ({
      id: s.id,
      name: s.name,
      applicableClasses: s.applicableClasses || [],
    }));

    const teachersInfo = (allTeachers || []).map(t => ({
      id: t.id,
      name: t.fullName,
      teachingAssignments: (t.teachingAssignments || []).map(a => ({
        classId: a.classId,
        subjectId: a.subjectId,
      })),
      assignedSubjects: t.assignedSubjects || [],
    }));

    const existingEntriesInfo = (existingEntries || [])
      .filter(e => !targetClassIds.includes(e.classId))
      .map(e => ({
        teacherId: e.teacherId,
        teacherName: e.teacherName,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
      }));

    const llmPrompt = `
You are a school timetable scheduling expert. Generate a complete weekly timetable strictly following the user's instructions.

## USER INSTRUCTIONS:
${prompt || 'Generate a balanced weekly timetable distributing all subjects evenly across the week for each class.'}

## SCHOOL DATA:

### Classes to schedule:
${JSON.stringify(classesInfo, null, 2)}

### Available Subjects (with applicable class IDs — empty array means applies to all classes):
${JSON.stringify(subjectsInfo, null, 2)}

### Teachers (with teaching assignments per class/subject):
${JSON.stringify(teachersInfo, null, 2)}

### Already-scheduled entries for OTHER classes (avoid teacher clashes with these):
${JSON.stringify(existingEntriesInfo, null, 2)}

## NON-NEGOTIABLE RULES:
1. No teacher should be in two classes at the same time.
2. No class should have two subjects scheduled at the same time.
3. Assign the correct teacher per subject+class using teachingAssignments. Fall back to assignedSubjects if no specific assignment exists.
4. For break/free period entries use: subjectId="", teacherId="", teacherName="".
5. All times must be in "HH:MM" 24-hour format (e.g. "08:30", "13:00").
6. dayOfWeek must be exactly one of: Monday, Tuesday, Wednesday, Thursday, Friday.

Everything else (period lengths, break times, subject priorities, distribution, special rules) must come entirely from the USER INSTRUCTIONS above.

## REQUIRED OUTPUT FORMAT:
Return ONLY valid JSON — no markdown fences, no explanation text:
{
  "entries": [
    {
      "classId": "string",
      "className": "string",
      "subjectId": "string",
      "subjectName": "string",
      "teacherId": "string",
      "teacherName": "string",
      "dayOfWeek": "string",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ],
  "warnings": ["string"]
}
`;

    console.log('[generateTimetable] Calling LLM...');

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          entries: {
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
      },
    });

    const entries = llmResult?.entries || [];
    const warnings = llmResult?.warnings || [];

    console.log(`[generateTimetable] LLM returned ${entries.length} entries`);

    if (entries.length === 0) {
      return Response.json({ error: 'LLM returned no entries. Try again or adjust your prompt.' }, { status: 400 });
    }

    // Clash detection before saving
    const clashCheck = {};
    const teacherClashCheck = {};
    let clashCount = 0;
    const validEntries = [];

    for (const entry of entries) {
      const classKey = `${entry.classId}|${entry.dayOfWeek}|${entry.startTime}`;
      const teacherKey = entry.teacherId ? `${entry.teacherId}|${entry.dayOfWeek}|${entry.startTime}` : null;

      let hasClash = false;

      if (clashCheck[classKey]) {
        warnings.push(`CLASS CLASH removed: ${entry.className} on ${entry.dayOfWeek} at ${entry.startTime} (${entry.subjectName})`);
        clashCount++;
        hasClash = true;
      }

      if (!hasClash && teacherKey && teacherClashCheck[teacherKey]) {
        warnings.push(`TEACHER CLASH removed: ${entry.teacherName} on ${entry.dayOfWeek} at ${entry.startTime}`);
        clashCount++;
        hasClash = true;
      }

      if (!hasClash) {
        clashCheck[classKey] = true;
        if (teacherKey) teacherClashCheck[teacherKey] = true;
        validEntries.push(entry);
      }
    }

    if (validEntries.length > 0) {
      await base44.asServiceRole.entities.TimetableEntry.bulkCreate(
        validEntries.map(e => ({ ...e, schoolId }))
      );
    }

    return Response.json({
      slots: validEntries,
      warnings,
      stats: {
        classes: targetClasses.length,
        subjects: (allSubjects || []).length,
        teachers: (allTeachers || []).length,
        slots: validEntries.length,
        clashes: clashCount,
      }
    });

  } catch (error) {
    console.error('[generateTimetable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});