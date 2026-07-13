import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
      // Strip each teacher to only assignments/subjects relevant to THIS class — minimizes LLM payload
      const llmTeachers = (classTeachersInfo.length > 0 ? classTeachersInfo : teachersInfo).map(t => ({
        id: t.id,
        name: t.name,
        teachingAssignments: (t.teachingAssignments || []).filter(a => a.classId === cls.id),
        assignedSubjects: (t.assignedSubjects || []).filter(sid => classSubjects.some(s => s.id === sid)),
      }));

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

## ALREADY BOOKED TEACHER SLOTS (DO NOT use these teacher+dayOfWeek+startTime combinations):
${JSON.stringify(Object.keys(scheduledTeacherSlots), null, 2)}
(Format: "teacherId|dayOfWeek|startTime")

## EXACT DAILY TIME SLOTS (MANDATORY — you MUST use ONLY these exact start/end times for every day):
Slot 1:  08:30 - 09:15  (Period 1)
Slot 2:  09:15 - 10:00  (Period 2)
         10:00 - 10:30  (Short Break — do NOT assign a subject here)
Slot 3:  10:30 - 11:15  (Period 3)
Slot 4:  11:15 - 12:00  (Period 4)
         12:00 - 13:00  (Long Break — do NOT assign a subject here)
Slot 5:  13:00 - 13:45  (Period 5)
Slot 6:  13:45 - 14:30  (Period 6)
Slot 7:  14:30 - 15:15  (Period 7)

There are exactly 7 teaching periods per day (Slots 1-4 morning, Slots 5-7 afternoon).
Each teaching period is exactly 45 minutes. Do NOT change period durations.
Do NOT invent, round, or alter any times. Use the start and end times EXACTLY as listed above.

## NON-NEGOTIABLE RULES:
1. You MUST use ONLY the exact time slots listed above. Every entry's startTime and endTime must match one of the 7 teaching slots exactly. Do NOT use 1-hour periods, do NOT use 08:00, do NOT invent times.
2. Do NOT schedule a subject during break times (10:00-10:30 or 12:00-13:00). Simply omit those slots.
3. No teacher should be in two classes at the same time — check the booked slots above.
4. Assign the correct teacher per subject using teachingAssignments. Fall back to assignedSubjects if needed.
5. dayOfWeek must be exactly one of: Monday, Tuesday, Wednesday, Thursday, Friday.
6. Do NOT schedule the same subject more than ONCE per day. Spread each subject across different days of the week.
7. Distribute subjects evenly — aim for variety so students don't see the same subject twice in a day.
8. Generate exactly 7 entries per day (one per teaching slot), 35 entries total for the 5-day week.

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
      } catch (llmErr) {
        console.error(`[generateTimetable] LLM failed for ${cls.className}:`, llmErr.message);
        console.timeEnd(`[generateTimetable] LLM_Class_${cls.className}`);
        allWarnings.push(`[${cls.className}] Generation failed: ${llmErr.message}`);
        continue;
      }
      console.timeEnd(`[generateTimetable] LLM_Class_${cls.className}`);

      // Handle both wrapped {response: {...}} and direct {...} LLM response formats
      const llmData = llmResult?.response || llmResult;

      // Allowed exact time slots — entries must match one of these
      const VALID_SLOTS = [
        { start: '08:30', end: '09:15' },
        { start: '09:15', end: '10:00' },
        { start: '10:30', end: '11:15' },
        { start: '11:15', end: '12:00' },
        { start: '13:00', end: '13:45' },
        { start: '13:45', end: '14:30' },
        { start: '14:30', end: '15:15' },
      ];

      // Sanitize entries: snap times to nearest valid slot and dedupe same-day same-slot
      const seenDaySlots = {};
      const sanitizedEntries = [];
      for (const e of (llmData?.entries || [])) {
        if (!e.subjectId || e.subjectId === '<UNKNOWN>' || !e.dayOfWeek || !e.startTime || !e.endTime) continue;

        // Find the matching valid slot by startTime, or snap to nearest
        let matchedSlot = VALID_SLOTS.find(s => s.start === e.startTime && s.end === e.endTime);
        if (!matchedSlot) {
          matchedSlot = VALID_SLOTS.find(s => s.start === e.startTime) ||
                        VALID_SLOTS.reduce((closest, slot) => {
                          const diff = Math.abs(parseInt(slot.start) - parseInt(e.startTime));
                          return diff < Math.abs(parseInt(closest.start) - parseInt(e.startTime)) ? slot : closest;
                        });
        }

        const daySlotKey = `${e.dayOfWeek}|${matchedSlot.start}`;
        if (seenDaySlots[daySlotKey]) continue; // skip duplicate slot on same day
        seenDaySlots[daySlotKey] = true;

        sanitizedEntries.push({ ...e, startTime: matchedSlot.start, endTime: matchedSlot.end });
      }
      const entries = sanitizedEntries;
      const warnings = llmData?.warnings || [];

      if (warnings.length) allWarnings.push(...warnings.map(w => `[${cls.className}] ${w}`));

      // Clash check and register teacher slots — skip placeholder teacher IDs
      for (const entry of entries) {
        const validTeacher = entry.teacherId && entry.teacherId !== '<UNKNOWN>' && entry.teacherId !== 'null';
        const teacherKey = validTeacher ? `${entry.teacherId}|${entry.dayOfWeek}|${entry.startTime}` : null;
        if (teacherKey && scheduledTeacherSlots[teacherKey]) {
          allWarnings.push(`TEACHER CLASH removed: ${entry.teacherName} on ${entry.dayOfWeek} at ${entry.startTime} (${cls.className})`);
          continue;
        }
        if (teacherKey) scheduledTeacherSlots[teacherKey] = true;
        allEntries.push({ ...entry, schoolId, teacherId: validTeacher ? entry.teacherId : '', teacherName: validTeacher ? entry.teacherName : '' });
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