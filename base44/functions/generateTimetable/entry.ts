import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIME_SLOTS = [
  { start: '08:30', end: '09:15' },
  { start: '09:15', end: '10:00' },
  { start: '10:30', end: '11:15' },
  { start: '11:15', end: '12:00' },
  { start: '13:00', end: '13:45' },
  { start: '13:45', end: '14:30' },
  { start: '14:30', end: '15:15' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function getSlotsForDay(day) {
  if (day === 'Friday') return TIME_SLOTS.slice(0, 6);
  return TIME_SLOTS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds, startTime, periodDuration, periodsPerDay, prompt } = await req.json();

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

    function getSubjectsForClass(classId) {
      return (allSubjects || []).filter(s => {
        if (!s.isArchived) {
          const applicable = s.applicableClasses || [];
          return applicable.length === 0 || applicable.includes(classId);
        }
        return false;
      });
    }

    function getTeacherForSubjectClass(subjectId, classId) {
      const assigned = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.teachingAssignments || []).some(a => a.subjectId === subjectId && a.classId === classId)
      );
      if (assigned) return assigned;

      const subjectOnly = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.teachingAssignments || []).some(a => a.subjectId === subjectId)
      );
      if (subjectOnly) return subjectOnly;

      const byAssignedSubjects = (allTeachers || []).find(t =>
        !t.isArchived &&
        (t.assignedSubjects || []).includes(subjectId)
      );
      return byAssignedSubjects || null;
    }

    const teacherBusy = {};
    const classBusy = {};

    (existingEntries || []).forEach(e => {
      if (!targetClassIds.includes(e.classId)) {
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

    const slots = [];
    const warnings = [];

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

      const totalSlots = allSlotPairs.length;
      const periodsPerSubject = Math.max(1, Math.min(5, Math.floor(totalSlots / classSubjects.length)));

      const priorityNames = ['mathematics', 'math', 'english', 'science', 'physics', 'chemistry', 'biology'];

      const scheduleRequests = classSubjects.map(subj => {
        const isPriority = priorityNames.some(p => subj.name.toLowerCase().includes(p));
        return { subject: subj, periodsNeeded: isPriority ? Math.min(periodsPerSubject + 1, 5) : periodsPerSubject };
      });

      scheduleRequests.sort((a, b) => b.periodsNeeded - a.periodsNeeded);

      for (const { subject, periodsNeeded } of scheduleRequests) {
        const teacher = getTeacherForSubjectClass(subject.id, cls.id);
        let assigned = 0;
        const daysUsed = new Set();

        for (const { day, slotIdx, start, end } of allSlotPairs) {
          if (assigned >= periodsNeeded) break;
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

    if (slots.length > 0) {
      await base44.asServiceRole.entities.TimetableEntry.bulkCreate(
        slots.map(s => ({ ...s, schoolId }))
      );
    }

    return Response.json({
      slots,
      warnings,
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