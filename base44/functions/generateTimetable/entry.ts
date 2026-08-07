import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds, prompt, breaks } = await req.json();

    if (!schoolId || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, targetClassIds' }, { status: 400 });
    }

    console.log(`[generateTimetable] Fetching school data for ${schoolId}...`);
    console.time('[generateTimetable] Total generation');

    const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.asServiceRole.entities.TimetableEntry.filter({ schoolId }),
    ]);

    // Derive the school's own time structure from existing timetable entries (no hardcoding)
    const slotMap = {};
    for (const e of (existingEntries || [])) {
      if (e.startTime && e.endTime) {
        slotMap[`${e.startTime}-${e.endTime}`] = { start: e.startTime, end: e.endTime };
      }
    }
    // Breaks allocated by the admin — reserved slots, not subjects
    const breakList = (breaks || []).filter(b => b && b.start && b.end).map(b => ({ name: b.name || 'Break', start: b.start, end: b.end }));
    for (const b of breakList) {
      const key = `${b.start}-${b.end}`;
      if (!slotMap[key]) slotMap[key] = { start: b.start, end: b.end };
    }
    const schoolTimeSlots = Object.values(slotMap).sort((a, b) => a.start.localeCompare(b.start));

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
    const allResolutions = [];
    const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const scheduledTeacherSlots = {}; // track across classes to avoid teacher clashes
    const classSubjectDay = {}; // classId -> Set("day|subjectId") to avoid duplicate subjects per day
    const getSubjectDaySet = (cid) => { if (!classSubjectDay[cid]) classSubjectDay[cid] = new Set(); return classSubjectDay[cid]; };

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

${schoolTimeSlots.length > 0 ? `## SCHOOL'S EXISTING DAILY TIME SLOTS (MANDATORY — you MUST use ONLY these exact start/end times):
${schoolTimeSlots.map((s, i) => `Slot ${i + 1}: ${s.start} - ${s.end}`).join('\n')}

These are the time periods already established by this school. Do NOT invent, round, or alter any times. Every entry's startTime and endTime must match one of these slots exactly. Generate one entry per slot per day.` : `## TIME STRUCTURE
No existing timetable entries found for this school. Follow the time structure described in the USER INSTRUCTIONS above. If none is specified, use a standard school day with consistent period durations.`}

## BREAKS (DO NOT schedule any subject during these times — they apply EVERY day):
${breakList.length > 0 ? breakList.map(b => `- ${b.name}: ${b.start} - ${b.end}`).join('\n') : 'None specified.'}
These are rest periods. Never place a subject that overlaps them.

## NON-NEGOTIABLE RULES:
1. ${schoolTimeSlots.length > 0 ? 'You MUST use ONLY the exact time slots listed above. Do NOT invent times or change period durations.' : 'Use the time structure from the USER INSTRUCTIONS. Keep period durations consistent throughout the day.'}
2. No teacher should be in two classes at the same time — check the booked slots above.
3. Assign the correct teacher per subject using teachingAssignments. Fall back to assignedSubjects if needed.
4. All times must be in "HH:MM" 24-hour format (e.g. "08:30", "13:00").
5. dayOfWeek must be exactly one of: Monday, Tuesday, Wednesday, Thursday, Friday.
6. Do NOT schedule the same subject more than ONCE per day. Spread each subject across different days of the week.
7. Distribute subjects evenly — aim for variety so students don't see the same subject twice in a day.

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

      // If the school has established time slots, snap entries to those; dedupe same-day same-slot
      const seenDaySlots = {};
      // Reserve break slots for every day so no subject is placed there
      for (const day of DAYS_LIST) {
        for (const b of breakList) {
          seenDaySlots[`${day}|${b.start}`] = true;
        }
      }
      const sanitizedEntries = [];
      for (const e of (llmData?.entries || [])) {
        if (!e.subjectId || e.subjectId === '<UNKNOWN>' || !e.dayOfWeek || !e.startTime || !e.endTime) continue;

        let finalStart = e.startTime;
        let finalEnd = e.endTime;

        if (schoolTimeSlots.length > 0) {
          // Match exact slot, or snap to nearest by startTime
          let matchedSlot = schoolTimeSlots.find(s => s.start === e.startTime && s.end === e.endTime);
          if (!matchedSlot) {
            matchedSlot = schoolTimeSlots.find(s => s.start === e.startTime) ||
                          schoolTimeSlots.reduce((closest, slot) => {
                            const diff = Math.abs(parseInt(slot.start) - parseInt(e.startTime));
                            return diff < Math.abs(parseInt(closest.start) - parseInt(e.startTime)) ? slot : closest;
                          });
          }
          finalStart = matchedSlot.start;
          finalEnd = matchedSlot.end;
        }

        const daySlotKey = `${e.dayOfWeek}|${finalStart}`;
        if (seenDaySlots[daySlotKey]) continue;
        seenDaySlots[daySlotKey] = true;

        sanitizedEntries.push({ ...e, startTime: finalStart, endTime: finalEnd });
      }
      const entries = sanitizedEntries;
      const warnings = llmData?.warnings || [];

      if (warnings.length) allWarnings.push(...warnings.map(w => `[${cls.className}] ${w}`));

      // Clash RESOLUTION: detect teacher clashes and RELOCATE the subject to a free
      // slot in the same class (instead of dropping it). Every relocation is explained
      // in allResolutions so the UI can show the user what was moved and why.
      const canRelocate = schoolTimeSlots.length > 0;

      for (const entry of entries) {
        const validTeacher = entry.teacherId && entry.teacherId !== '<UNKNOWN>' && entry.teacherId !== 'null';
        const teacherId = validTeacher ? entry.teacherId : '';
        const teacherName = validTeacher ? entry.teacherName : '';
        const teacherKey = teacherId ? `${teacherId}|${entry.dayOfWeek}|${entry.startTime}` : null;

        // No teacher clash → register the slot and keep the entry
        if (!teacherKey || !scheduledTeacherSlots[teacherKey]) {
          if (teacherKey) scheduledTeacherSlots[teacherKey] = true;
          if (entry.subjectId) getSubjectDaySet(cls.id).add(`${entry.dayOfWeek}|${entry.subjectId}`);
          allEntries.push({ ...entry, schoolId, teacherId, teacherName });
          continue;
        }

        // Teacher clash detected — try to relocate within this class's free slots
        if (!canRelocate) {
          allWarnings.push(`TEACHER CLASH unresolved: ${teacherName} on ${entry.dayOfWeek} at ${entry.startTime} (${cls.className}) — no school time slots to relocate to. Entry skipped.`);
          continue;
        }

        // Score a candidate slot — lower is better. Prefers the original day,
        // minimal day-distance, minimal time-of-day displacement, and adjacency
        // to the class's existing lessons on the target day.
        const toMin = (t: string) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
        const origDayIdx = DAYS_LIST.indexOf(entry.dayOfWeek);
        const scoreCandidate = (day: string, slot: any): number => {
          const dayIdx = DAYS_LIST.indexOf(day);
          let s = dayIdx !== origDayIdx ? 100 : 0;
          s += Math.abs(dayIdx - origDayIdx) * 12;
          s += Math.abs(toMin(entry.startTime) - toMin(slot.start)) / 10;
          let gap = Infinity;
          for (const o of allEntries) {
            if (o.classId !== cls.id || o.dayOfWeek !== day) continue;
            const os = toMin(o.startTime), oe = toMin(o.endTime);
            gap = Math.min(gap, Math.abs(toMin(slot.start) - os), Math.abs(toMin(slot.start) - oe));
          }
          if (gap !== Infinity) s -= 25 * (gap === 0 ? 1 : 1 / (1 + gap));
          return s;
        };

        let relocated = null;
        let bestScore = Infinity;
        for (const day of DAYS_LIST) {
          if (entry.subjectId && getSubjectDaySet(cls.id).has(`${day}|${entry.subjectId}`)) continue; // subject already that day
          for (const slot of schoolTimeSlots) {
            if (day === entry.dayOfWeek && slot.start === entry.startTime) continue; // same slot
            const tk = `${teacherId}|${day}|${slot.start}`;
            if (scheduledTeacherSlots[tk]) continue; // teacher busy
            if (seenDaySlots[`${day}|${slot.start}`]) continue; // class slot already occupied
            const sc = scoreCandidate(day, slot);
            if (sc < bestScore) {
              bestScore = sc;
              relocated = { day, startTime: slot.start, endTime: slot.end };
            }
          }
        }

        if (relocated) {
          const fromDay = entry.dayOfWeek, fromStart = entry.startTime, fromEnd = entry.endTime;
          entry.dayOfWeek = relocated.day;
          entry.startTime = relocated.startTime;
          entry.endTime = relocated.endTime;
          const newTeacherKey = `${teacherId}|${entry.dayOfWeek}|${entry.startTime}`;
          scheduledTeacherSlots[newTeacherKey] = true;
          seenDaySlots[`${entry.dayOfWeek}|${entry.startTime}`] = true;
          if (entry.subjectId) getSubjectDaySet(cls.id).add(`${entry.dayOfWeek}|${entry.subjectId}`);
          allEntries.push({ ...entry, schoolId, teacherId, teacherName });
          allResolutions.push({
            className: cls.className,
            subjectName: entry.subjectName,
            teacherName,
            fromDay, fromStart, fromEnd,
            toDay: relocated.day, toStart: relocated.startTime, toEnd: relocated.endTime,
            reason: `Teacher clash: ${teacherName} would have been double-booked at ${fromDay} ${fromStart}–${fromEnd}. Moved ${entry.subjectName} to ${relocated.day} ${relocated.startTime}–${relocated.endTime}.`,
          });
        } else {
          allWarnings.push(`TEACHER CLASH unresolved: ${teacherName} on ${entry.dayOfWeek} at ${entry.startTime} (${cls.className}) — no free slot found. Entry skipped.`);
        }
      }

      // Insert break rows for this class (one per day) — protected as immovable breaks
      for (const day of DAYS_LIST) {
        for (const b of breakList) {
          allEntries.push({
            schoolId, classId: cls.id, className: cls.className,
            subjectId: b.name === 'Short Break' ? 'BREAK_SHORT' : (b.name === 'Long Break' ? 'BREAK_LONG' : `BREAK_${b.name.replace(/\s+/g, '_').toUpperCase()}`),
            subjectName: b.name, teacherId: '', teacherName: '',
            dayOfWeek: day, startTime: b.start, endTime: b.end,
          });
        }
      }

      console.log(`[generateTimetable] Class ${cls.className}: ${allEntries.filter(e => e.classId === cls.id).length} entries`);
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
      resolutions: allResolutions,
      stats: {
        classes: targetClasses.length,
        slots: allEntries.length,
        clashes: allWarnings.filter(w => w.includes('CLASH')).length,
        clashesResolved: allResolutions.length,
      }
    });

  } catch (error) {
    console.error('[generateTimetable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});