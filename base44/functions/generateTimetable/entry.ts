import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds, prompt } = await req.json();

    if (!schoolId || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, targetClassIds' }, { status: 400 });
    }

    console.log(`[generateTimetable] Fetching school data for ${schoolId}...`);
    console.time('[generateTimetable] Total generation');

    const [allClasses, allSubjects, allTeachers] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
    ]);

    const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
    if (targetClasses.length === 0) {
      return Response.json({ error: 'No valid classes found for the given IDs' }, { status: 400 });
    }

    const teachersInfo = (allTeachers || []).map(t => ({
      id: t.id,
      name: t.fullName,
      teachingAssignments: (t.teachingAssignments || []),
      assignedSubjects: t.assignedSubjects || [],
    }));

    const allEntries = [];
    const allWarnings = [];
    const scheduledTeacherSlots = {}; // track across classes to avoid teacher clashes

    // Generate timetable one class at a time
    for (const cls of targetClasses) {
      const classSubjects = (allSubjects || []).filter(s =>
        !s.applicableClasses || s.applicableClasses.length === 0 || s.applicableClasses.includes(cls.id)
      );

      // Filter teachers to only those relevant to this class — minimizes LLM input
      const classTeachersInfo = teachersInfo.filter(t => {
        const assignments = t.teachingAssignments || [];
        return assignments.some(a => a.classId === cls.id) ||
               classSubjects.some(s => (t.assignedSubjects || []).includes(s.id));
      });
      const llmTeachers = classTeachersInfo.length > 0 ? classTeachersInfo : teachersInfo;

      const llmPrompt = `
You are a school timetable scheduling expert. Generate a weekly timetable for ONE class strictly following the user's instructions.

## USER INSTRUCTIONS:
${prompt || 'Generate a balanced weekly timetable distributing all subjects evenly across the week.'}

## CLASS TO SCHEDULE:
ID: ${cls.id}
Name: ${cls.className}

## AVAILABLE SUBJECTS FOR THIS CLASS:
${JSON.stringify(classSubjects.map(s => ({ id: s.id, name: s.name })), null, 2)}

## TEACHERS (with assignments):
${JSON.stringify(llmTeachers, null, 2)}

## ALREADY BOOKED TEACHER SLOTS (DO NOT use these teacher+day+time combinations):
${JSON.stringify(Object.keys(scheduledTeacherSlots), null, 2)}
(Format: "teacherId|dayOfWeek|startTime")

## NON-NEGOTIABLE RULES:
1. No teacher should be in two classes at the same time — check the booked slots above.
2. Assign the correct teacher per subject using teachingAssignments. Fall back to assignedSubjects if needed.
3. For break/free period entries use: subjectId="", teacherId="", teacherName="".
4. All times must be in "HH:MM" 24-hour format (e.g. "08:30", "13:00").
5. dayOfWeek must be exactly one of: Monday, Tuesday, Wednesday, Thursday, Friday.

## REQUIRED OUTPUT FORMAT:
Return ONLY valid JSON — no markdown, no explanation:
{
  "entries": [
    {
      "classId": "${cls.id}",
      "className": "${cls.className}",
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
}`;

      console.log(`[generateTimetable] Generating for class: ${cls.className} (${classSubjects.length} subjects, ${llmTeachers.length} teachers)`);
      console.time(`[generateTimetable] LLM_Class_${cls.className}`);

      let llmResult;
      try {
        llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: llmPrompt,
          model: 'claude_opus_4_8',
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
      } catch (llmErr) {
        console.error(`[generateTimetable] LLM failed for ${cls.className}:`, llmErr.message);
        console.timeEnd(`[generateTimetable] LLM_Class_${cls.className}`);
        allWarnings.push(`[${cls.className}] Generation failed: ${llmErr.message}`);
        continue;
      }
      console.timeEnd(`[generateTimetable] LLM_Class_${cls.className}`);

      const entries = llmResult?.entries || [];
      const warnings = llmResult?.warnings || [];

      if (warnings.length) allWarnings.push(...warnings.map(w => `[${cls.className}] ${w}`));

      // Clash check and register teacher slots
      for (const entry of entries) {
        const teacherKey = entry.teacherId ? `${entry.teacherId}|${entry.dayOfWeek}|${entry.startTime}` : null;
        if (teacherKey && scheduledTeacherSlots[teacherKey]) {
          allWarnings.push(`TEACHER CLASH removed: ${entry.teacherName} on ${entry.dayOfWeek} at ${entry.startTime} (${cls.className})`);
          continue;
        }
        if (teacherKey) scheduledTeacherSlots[teacherKey] = true;
        allEntries.push({ ...entry, schoolId });
      }

      console.log(`[generateTimetable] Class ${cls.className}: ${entries.length} entries`);
    }

    if (allEntries.length === 0) {
      console.timeEnd('[generateTimetable] Total generation');
      return Response.json({ error: 'No entries were generated. Try adjusting your prompt.' }, { status: 400 });
    }

    // Bulk save all entries
    console.time('[generateTimetable] BulkSave');
    await base44.asServiceRole.entities.TimetableEntry.bulkCreate(allEntries);
    console.timeEnd('[generateTimetable] BulkSave');

    console.timeEnd('[generateTimetable] Total generation');
    return Response.json({
      slots: allEntries,
      warnings: allWarnings,
      stats: {
        classes: targetClasses.length,
        slots: allEntries.length,
        clashes: allWarnings.filter(w => w.includes('CLASH')).length,
      }
    });

  } catch (error) {
    console.error('[generateTimetable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});