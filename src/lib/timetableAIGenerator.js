// Front-end AI timetable generation.
//
// Everything here is driven by the school's own data:
//   • time periods  → derived from the school's existing timetable entries + break schedule
//   • subjects      → the Subject records applicable to each class
//   • teachers      → SchoolUser (role: teacher) with their teachingAssignments
//   • breaks        → the school-wide break schedule passed in from the UI
// Nothing about a particular school's curriculum, periods, subjects or staff is
// hard-coded. The only fixed value is the standard Monday–Friday school week,
// which is a calendar fact shared by every part of the app.

import { base44 } from '@/api/base44Client';
import { resolveClashes } from '@/lib/timetableClashResolver';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Accept whatever day wording the model returns (any case, or abbreviations).
const DAY_LOOKUP = {
  monday: 'Monday', mon: 'Monday',
  tuesday: 'Tuesday', tue: 'Tuesday', tues: 'Tuesday',
  wednesday: 'Wednesday', wed: 'Wednesday', weds: 'Wednesday',
  thursday: 'Thursday', thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday',
  friday: 'Friday', fri: 'Friday',
};

function normalizeDay(day) {
  return DAY_LOOKUP[String(day || '').toLowerCase().replace(/[^a-z]/g, '')] || null;
}

function toMin(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

function breakForDay(b, day) {
  const o = b.overrides && b.overrides[day];
  return o && o.start && o.end
    ? { name: b.name, start: o.start, end: o.end }
    : { name: b.name, start: b.start, end: b.end };
}

// Build the set of distinct teaching periods the school actually uses, from its
// own existing entries (never a hard-coded list of periods). Break times are
// rest periods, never teachable periods, so they are excluded here — they are
// passed to the model separately and reserved so no subject lands on them.
function deriveTimeSlots(entries, breakList) {
  const breakRanges = [];
  for (const b of breakList) {
    if (b.start && b.end) breakRanges.push([toMin(b.start), toMin(b.end)]);
    for (const o of Object.values(b.overrides || {})) {
      if (o && o.start && o.end) breakRanges.push([toMin(o.start), toMin(o.end)]);
    }
  }
  const overlapsBreak = (start, end) => {
    const s = toMin(start);
    const e = toMin(end);
    return breakRanges.some(([bs, be]) => s < be && e > bs);
  };

  const map = {};
  for (const e of entries || []) {
    if (e.startTime && e.endTime) map[`${e.startTime}-${e.endTime}`] = { start: e.startTime, end: e.endTime };
  }
  return Object.values(map)
    .filter(s => !overlapsBreak(s.start, s.end))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function snapToSlot(time, timeSlots) {
  if (!timeSlots.length) return null;
  const exact = timeSlots.find(s => s.start === time);
  if (exact) return exact;
  return timeSlots.reduce((closest, s) =>
    Math.abs(toMin(s.start) - toMin(time)) < Math.abs(toMin(closest.start) - toMin(time)) ? s : closest);
}

function buildClassPrompt({ cls, classSubjects, teachers, timeSlots, breakList, userPrompt, onlyDays }) {
  const slotBlock = timeSlots.length > 0
    ? `## SCHOOL'S EXISTING DAILY TIME PERIODS (MANDATORY — use ONLY these exact start/end times):
${timeSlots.map((s, i) => `Period ${i + 1}: ${s.start} - ${s.end}`).join('\n')}

These periods are already established by this school. Do NOT invent, round or alter any times. Every entry's startTime and endTime must match one of these exactly. Generate one entry per period per day.`
    : `## TIME STRUCTURE
This school has no existing periods yet. Follow the time structure described in the USER INSTRUCTIONS. If none is given, use a consistent school day with equal-length periods.`;

  const breakBlock = breakList.length > 0
    ? WEEK_DAYS.map(day => `- ${day}: ` + breakList.map(b => {
        const bd = breakForDay(b, day);
        return `${bd.name} ${bd.start}-${bd.end}`;
      }).join(', ')).join('\n')
    : 'None specified.';

  const dayBlock = onlyDays && onlyDays.length
    ? `THIS REQUEST COVERS ONLY THESE DAYS: ${onlyDays.join(', ')}. Return a COMPLETE day of periods for each of those days, and nothing for any other day.`
    : `Return a COMPLETE week — every period of every one of these five days: ${WEEK_DAYS.join(', ')}.`;

  return `You are a school timetable scheduling expert. Build a timetable for ONE class, strictly following the user's instructions and using only the school's real data below.

## USER INSTRUCTIONS:
${userPrompt || 'Generate a balanced weekly timetable distributing all subjects evenly across the week.'}

## CLASS:
ID: ${cls.id}
Name: ${cls.className}

## SUBJECTS AVAILABLE TO THIS CLASS:
${JSON.stringify(classSubjects.map(s => ({ id: s.id, name: s.name })), null, 2)}

## TEACHERS (with their assignments for this class):
${JSON.stringify(teachers, null, 2)}

## DAYS REQUIRED (mandatory):
${dayBlock}

${slotBlock}

## BREAKS (rest periods — never schedule a subject during these times):
${breakBlock}

## RULES:
1. Use the school's time periods exactly as listed (or the user's structure if none exist).
2. Assign the correct teacher for each subject using the teachers' assignments. Leave teacherId/teacherName empty only if no teacher fits.
3. Times must be "HH:MM" 24-hour format (e.g. "08:30", "13:00").
4. dayOfWeek must be exactly one of: Monday, Tuesday, Wednesday, Thursday, Friday.
5. Never schedule the same subject more than once on the same day — spread subjects across the week.
6. Never place a subject that overlaps a break on that day.
7. Output EVERY entry for EVERY period of EVERY required day. A partial timetable (for example only Monday) is invalid and will be rejected — never give a sample, a summary or a pattern, and never stop early.

## OUTPUT — return ONLY valid JSON, no markdown:
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
  ]
}`;
}

// One model request for a class — the whole week, or onlyDays for a follow-up.
async function requestEntries({ cls, classSubjects, teachers, timeSlots, breakList, userPrompt, onlyDays }) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: buildClassPrompt({ cls, classSubjects, teachers, timeSlots, breakList, userPrompt, onlyDays }),
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
      },
    },
  });
  const data = res?.response || res;
  return data?.entries || [];
}

/**
 * Generate a full weekly timetable for the selected classes.
 * Returns { slots, warnings, resolutions, stats } on success, or { error } on failure.
 * Result shape matches what the generator UI expects.
 */
export async function generateWeeklyTimetable({ schoolId, targetClassIds, prompt, breaks }) {
  const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
    base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
    base44.entities.Subject.filter({ schoolId, isArchived: false }),
    base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
    base44.entities.TimetableEntry.filter({ schoolId }),
  ]);

  const breakList = (breaks || [])
    .filter(b => b && b.start && b.end)
    .map(b => ({ name: b.name || 'Break', start: b.start, end: b.end, overrides: b.overrides || {} }));

  const timeSlots = deriveTimeSlots(existingEntries, breakList);

  const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
  if (targetClasses.length === 0) {
    return { error: 'No valid classes found for the selected classes.' };
  }

  const warnings = [];
  const collected = [];

  for (const cls of targetClasses) {
    const classSubjects = (allSubjects || []).filter(s =>
      !s.applicableClasses || s.applicableClasses.length === 0 || s.applicableClasses.includes(cls.id)
    );

    // Only the teachers who actually teach this class (or one of its subjects).
    const classTeachers = (allTeachers || []).map(t => ({
      id: t.id,
      name: t.fullName,
      teachingAssignments: (t.teachingAssignments || []).filter(a => a.classId === cls.id),
      assignedSubjects: (t.assignedSubjects || []).filter(sid => classSubjects.some(s => s.id === sid)),
    })).filter(t => t.teachingAssignments.length > 0 || t.assignedSubjects.length > 0);

    const teachersForPrompt = classTeachers.length > 0
      ? classTeachers
      : (allTeachers || []).map(t => ({ id: t.id, name: t.fullName, teachingAssignments: [], assignedSubjects: [] }));

    let rawEntries = [];
    try {
      rawEntries = await requestEntries({ cls, classSubjects, teachers: teachersForPrompt, timeSlots, breakList, userPrompt: prompt });
      // The model sometimes answers with only part of the week. Fill every
      // missing weekday with a focused follow-up so the week is always complete.
      const missingDays = WEEK_DAYS.filter(d => !rawEntries.some(e => normalizeDay(e.dayOfWeek) === d));
      if (missingDays.length) {
        const extras = await Promise.all(missingDays.map(day =>
          requestEntries({ cls, classSubjects, teachers: teachersForPrompt, timeSlots, breakList, userPrompt: prompt, onlyDays: [day] })
        ));
        rawEntries = rawEntries.concat(...extras);
      }
    } catch (err) {
      warnings.push(`[${cls.className}] Generation failed: ${err?.message || err}`);
      continue;
    }

    // Reserve break slots so no subject lands on a break.
    const seenDaySlots = {};
    for (const day of WEEK_DAYS) {
      for (const b of breakList) {
        seenDaySlots[`${day}|${breakForDay(b, day).start}`] = true;
      }
    }

    for (const e of rawEntries) {
      if (!e.subjectId || e.subjectId === '<UNKNOWN>' || !e.startTime || !e.endTime) continue;
      const day = normalizeDay(e.dayOfWeek);
      if (!day) continue;

      const subject = classSubjects.find(s => s.id === e.subjectId);
      if (!subject) continue; // ignore subjects that don't belong to this class

      let start = e.startTime;
      let end = e.endTime;
      if (timeSlots.length > 0) {
        const slot = snapToSlot(e.startTime, timeSlots);
        if (slot) { start = slot.start; end = slot.end; }
      }

      const key = `${day}|${start}`;
      if (seenDaySlots[key]) continue;
      seenDaySlots[key] = true;

      // Resolve the teacher from the school's data (fall back to class+subject assignment).
      let teacherId = e.teacherId;
      let teacherName = e.teacherName;
      const teacherValid = teacherId && teacherId !== '<UNKNOWN>' && teacherId !== 'null' &&
        (allTeachers || []).some(t => t.id === teacherId);
      if (!teacherValid) {
        const match = (allTeachers || []).find(t =>
          (t.teachingAssignments || []).some(a => a.classId === cls.id && a.subjectId === e.subjectId)
        );
        teacherId = match?.id || '';
        teacherName = match?.fullName || '';
      }

      collected.push({
        schoolId,
        classId: cls.id,
        className: cls.className,
        subjectId: e.subjectId,
        subjectName: subject.name || e.subjectName || '',
        teacherId,
        teacherName,
        dayOfWeek: day,
        startTime: start,
        endTime: end,
      });
    }
  }

  if (collected.length === 0) {
    return { error: 'No entries were generated. Try adjusting your prompt.' };
  }

  // Add break rows so the resolver treats break slots as occupied (immovable).
  for (const cls of targetClasses) {
    for (const day of WEEK_DAYS) {
      for (const b of breakList) {
        const bd = breakForDay(b, day);
        collected.push({
          schoolId,
          classId: cls.id,
          className: cls.className,
          subjectId: `BREAK_${b.name.replace(/\s+/g, '_').toUpperCase()}`,
          subjectName: b.name,
          teacherId: '',
          teacherName: '',
          dayOfWeek: day,
          startTime: bd.start,
          endTime: bd.end,
        });
      }
    }
  }

  // Resolve any class/teacher clashes across all classes, relocating subjects to
  // free periods and reporting every move.
  const { resolvedEntries, resolutions, unresolved, stats } = resolveClashes(collected);

  // Replace the target classes' existing entries so regeneration never duplicates.
  await base44.entities.TimetableEntry.deleteMany({ schoolId, classId: { $in: targetClassIds } });

  // Persist in batches (bulk write limit is 500 per call).
  for (let i = 0; i < resolvedEntries.length; i += 500) {
    await base44.entities.TimetableEntry.bulkCreate(resolvedEntries.slice(i, i + 500));
  }

  return {
    slots: resolvedEntries,
    warnings: [...warnings, ...unresolved],
    resolutions,
    stats: {
      classes: targetClasses.length,
      slots: resolvedEntries.length,
      clashes: stats.resolved + stats.unresolved,
      clashesResolved: stats.resolved,
    },
  };
}