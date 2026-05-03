import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fixed time slots per day (with breaks excluded)
const TIME_SLOTS = [
  { start: '08:30', end: '09:15' },
  { start: '09:15', end: '10:00' },
  // Short break 10:00–10:30
  { start: '10:30', end: '11:15' },
  { start: '11:15', end: '12:00' },
  // Long break 12:00–13:00
  { start: '13:00', end: '13:45' },
  { start: '13:45', end: '14:30' },
  { start: '14:30', end: '15:15' }, // Mon–Thu only
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Friday has one fewer period (no 14:30–15:15)
function getSlotsForDay(day) {
  if (day === 'Friday') return TIME_SLOTS.slice(0, 6);
  return TIME_SLOTS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds } = await req.json();

    if (!schoolId || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, targetClassIds' }, { status: 400 });
    }

    console.log(`[generateTimetable] Fetching school data for ${schoolId}...`);

    // ── Step 1: Fetch all data from DB ─────────────────────────────────────
    const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.asServiceRole.entities.TimetableEntry.filter({ schoolId }),
    ]);

    console.log(`[generateTimetable] Found: ${allClasses?.length} classes, ${allSubjects?.length} subjects, ${allTeachers?.length} teachers`);

    // ── Step 2: Filter to target classes ──────────────────────────────────
    const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
    if (targetClasses.length === 0) {
      return Response.json({ error: 'No valid classes found for the given IDs' }, { status: 400 });
    }

    // ── Step 3: Get subjects for each target class ─────────────────────────
    // Subject.applicableClasses is an array of classIds the subject applies to
    // If applicableClasses is empty/missing, subject applies to all classes
    function getSubjectsForClass(classId) {
      return (allSubjects || []).filter(s => {
        if (!s.isArchived) {
          const applicable = s.applicableClasses || [];
          return applicable.length === 0 || applicable.includes(classId);
        }
        return false;
      });
    }

    // ── Step 4: Get teacher for a subject+class combination ────────────────
    function getTeacherForSubjectClass(subjectId, classId) {
      // First try to find teacher with explicit teaching assignment
      const assigned = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.teachingAssignments || []).some(a => a.subjectId === subjectId && a.classId === classId)
      );
      if (assigned) return assigned;

      // Fallback: teacher assigned to subject only (any class)
      const subjectOnly = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.teachingAssignments || []).some(a => a.subjectId === subjectId)
      );
      if (subjectOnly) return subjectOnly;

      // Fallback: teacher with subject in assignedSubjects array
      const byAssignedSubjects = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.assignedSubjects || []).includes(subjectId)
      );
      return byAssignedSubjects || null;
    }

    // ── Step 5: Build clash tracking maps ─────────────────────────────────
    // teacherBusy[teacherId][day][slotIndex] = true
    // classBusy[classId][day][slotIndex] = true
    const teacherBusy = {};
    const classBusy = {};

    // Pre-populate with existing entries
    (existingEntries || []).forEach(e => {
      if (!targetClassIds.includes(e.classId)) {
        // Existing entry for another class — still need to block teachers
        if (e.teacherId && e.dayOfWeek && e.startTime) {
          const slotIdx = TIME_SLOTS.findIndex(s => s.start === e.startTime);
          if (slotIdx >= 0) {
            if (!teacherBusy[e.teacherId]) teacherBusy[e.teacherId] = {};
            if (!teacherBusy[e.teacherId][e.dayOfWeek]) teacherBusy[e.teacherId][e.dayOfWeek] = {};
            teacherBusy[e.teacherId][e.dayOfWeek][slotIdx] = true;
          }
        }
      }
    });

    function canAssign(teacherId, classId, day, slotIdx) {
      if (teacherId) {
        if (teacherBusy[teacherId]?.[day]?.[slotIdx]) return false;
      }
      if (classBusy[classId]?.[day]?.[slotIdx]) return false;
      return true;
    }

    function markBusy(teacherId, classId, day, slotIdx) {
      if (teacherId) {
        if (!teacherBusy[teacherId]) teacherBusy[teacherId] = {};
        if (!teacherBusy[teacherId][day]) teacherBusy[teacherId][day] = {};
        teacherBusy[teacherId][day][slotIdx] = true;
      }
      if (!classBusy[classId]) classBusy[classId] = {};
      if (!classBusy[classId][day]) classBusy[classId][day] = {};
      classBusy[classId][day][slotIdx] = true;
    }

    // ── Step 6: Algorithmic timetable generation ───────────────────────────
    const slots = [];
    const warnings = [];

    // Build all available (day, slotIdx) pairs, shuffled for variety
    const allSlotPairs = [];
    DAYS.forEach(day => {
      getSlotsForDay(day).forEach((slot, idx) => {
        allSlotPairs.push({ day, slotIdx: idx, start: slot.start, end: slot.end });
      });
    });

    for (const cls of targetClasses) {
      const classSubjects = getSubjectsForClass(cls.id);
      if (classSubjects.length === 0) {
        warnings.push(`No subjects found for class ${cls.className} — skipping`);
        continue;
      }

      console.log(`[generateTimetable] Class ${cls.className}: ${classSubjects.length} subjects found`);

      // Determine how many periods per week each subject gets
      // Spread subjects evenly: total available slots / number of subjects (min 1, max 5)
      const totalSlots = allSlotPairs.length; // 34 slots per week (Mon-Thu 7 + Fri 6)
      const periodsPerSubject = Math.max(1, Math.min(5, Math.floor(totalSlots / classSubjects.length)));

      // Priority subjects get more periods
      const priorityNames = ['mathematics', 'math', 'english', 'science', 'physics', 'chemistry', 'biology'];
      
      // Build subject schedule requests: [{ subject, periodsNeeded }]
      const scheduleRequests = classSubjects.map(subj => {
        const isPriority = priorityNames.some(p => subj.name.toLowerCase().includes(p));
        return { subject: subj, periodsNeeded: isPriority ? Math.min(periodsPerSubject + 1, 5) : periodsPerSubject };
      });

      // Sort: priority subjects first
      scheduleRequests.sort((a, b) => b.periodsNeeded - a.periodsNeeded);

      // Assign slots for this class
      // We iterate subject by subject and try to spread across days
      for (const { subject, periodsNeeded } of scheduleRequests) {
        const teacher = getTeacherForSubjectClass(subject.id, cls.id);
        let assigned = 0;
        const daysUsed = new Set();

        // Try to spread across different days
        for (const { day, slotIdx, start, end } of allSlotPairs) {
          if (assigned >= periodsNeeded) break;
          // Prefer not repeating on same day unless necessary
          if (daysUsed.has(day) && assigned < periodsNeeded && daysUsed.size < DAYS.length) continue;

          if (canAssign(teacher?.id || null, cls.id, day, slotIdx)) {
            markBusy(teacher?.id || null, cls.id, day, slotIdx);
            slots.push({
              classId: cls.id,
              className: cls.className,
              subjectId: subject.id,
              subjectName: subject.name,
              teacherId: teacher?.id || '',
              teacherName: teacher?.fullName || '',
              dayOfWeek: day,
              startTime: start,
              endTime: end,
            });
            daysUsed.add(day);
            assigned++;
          }
        }

        // If we couldn't spread across days, try same-day slots
        if (assigned < periodsNeeded) {
          for (const { day, slotIdx, start, end } of allSlotPairs) {
            if (assigned >= periodsNeeded) break;
            if (canAssign(teacher?.id || null, cls.id, day, slotIdx)) {
              markBusy(teacher?.id || null, cls.id, day, slotIdx);
              slots.push({
                classId: cls.id,
                className: cls.className,
                subjectId: subject.id,
                subjectName: subject.name,
                teacherId: teacher?.id || '',
                teacherName: teacher?.fullName || '',
                dayOfWeek: day,
                startTime: start,
                endTime: end,
              });
              assigned++;
            }
          }
        }

        if (assigned === 0) {
          warnings.push(`Could not schedule ${subject.name} for ${cls.className} — no available slots`);
        } else if (assigned < periodsNeeded) {
          warnings.push(`Only scheduled ${assigned}/${periodsNeeded} periods for ${subject.name} in ${cls.className}`);
        }

        if (!teacher) {
          warnings.push(`No teacher found for ${subject.name} in ${cls.className}`);
        }
      }
    }

    // ── Step 7: Clash validation ───────────────────────────────────────────
    const clashCheck = {};
    let clashCount = 0;
    for (const slot of slots) {
      const key = `${slot.classId}|${slot.dayOfWeek}|${slot.startTime}`;
      if (clashCheck[key]) {
        clashCount++;
        warnings.push(`CLASS CLASH: ${slot.className} on ${slot.dayOfWeek} at ${slot.startTime}`);
      } else {
        clashCheck[key] = true;
      }
    }

    // Teacher clash check
    const teacherClashCheck = {};
    for (const slot of slots) {
      if (!slot.teacherId) continue;
      const key = `${slot.teacherId}|${slot.dayOfWeek}|${slot.startTime}`;
      if (teacherClashCheck[key]) {
        clashCount++;
        warnings.push(`TEACHER CLASH: ${slot.teacherName} on ${slot.dayOfWeek} at ${slot.startTime}`);
      } else {
        teacherClashCheck[key] = true;
      }
    }

    console.log(`[generateTimetable] Generated ${slots.length} slots, ${clashCount} clashes, ${warnings.length} warnings`);

    // ── Step 8: Save to DB ────────────────────────────────────────────────
    if (slots.length > 0) {
      await base44.asServiceRole.entities.TimetableEntry.bulkCreate(
        slots.map(s => ({ ...s, schoolId }))
      );
      console.log(`[generateTimetable] Saved ${slots.length} entries`);
    }

    return Response.json({
      slots,
      warnings,
      reasoning: `Generated ${slots.length} timetable entries for ${targetClasses.length} class(es) using ${(allSubjects || []).length} subjects and ${(allTeachers || []).length} teachers. ${clashCount === 0 ? 'No clashes detected.' : `${clashCount} clash(es) found.`}`,
      stats: {
        classes: targetClasses.length,
        subjects: (allSubjects || []).length,
        teachers: (allTeachers || []).length,
        slots: slots.length,
        clashes: clashCount,
      }
    });

  } catch (error) {
    console.error('[generateTimetable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});