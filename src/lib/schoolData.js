/**
 * Central helpers for school-configured academic data.
 * All functions use school-created subjects, categories, and classes
 * as the source of truth — no hardcoded curriculum assumptions.
 */
import { base44 } from '@/api/base44Client';

/** Get all active subjects for a school */
export async function getSubjects(schoolId) {
  try {
    const all = await base44.entities.Subject.filter({ schoolId, isArchived: false });
    return all || [];
  } catch { return []; }
}

/** Get subjects mapped to a specific class (by classId) */
export async function getSubjectsForClass(classId, schoolId) {
  try {
    const all = await getSubjects(schoolId);
    return all.filter(s => (s.applicableClasses || []).includes(classId));
  } catch { return []; }
}

/** Get subjects mapped to a class AND a category */
export async function getSubjectsForClassAndCategory(classId, categoryId, schoolId) {
  try {
    const all = await getSubjectsForClass(classId, schoolId);
    if (!categoryId) return all;
    return all.filter(s => s.categoryId === categoryId);
  } catch { return []; }
}

/** Get all active categories for a school */
export async function getCategories(schoolId) {
  try {
    const all = await base44.entities.SubjectCategory.filter({ schoolId, isArchived: false });
    return all || [];
  } catch { return []; }
}

/** Get all active classes for a school */
export async function getClasses(schoolId) {
  try {
    const all = await base44.entities.SchoolClass.filter({ schoolId, isArchived: false });
    return all || [];
  } catch { return []; }
}

/** Find a class by className (exact match) */
export async function getClassByName(className, schoolId) {
  try {
    const all = await getClasses(schoolId);
    return all.find(c => c.className.toLowerCase() === className.toLowerCase()) || null;
  } catch { return null; }
}

/**
 * AI timetable generation for any class using school-configured subjects.
 * Generates a full Monday–Friday week.
 */
export async function generateWeeklyTimetableForClass(classObj, subjects, options = {}) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const DEFAULT_SLOTS = [
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
    { start: "10:15", end: "11:15" },
    { start: "11:15", end: "12:15" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
  ];

  const slots = options.slots || DEFAULT_SLOTS;
  const entries = [];

  if (!subjects.length) return entries;

  // Distribute subjects across days — cycle through subjects
  let subjectIndex = 0;
  for (const day of DAYS) {
    const dailySlots = slots.slice(0, Math.min(slots.length, options.periodsPerDay || 5));
    for (const slot of dailySlots) {
      const subj = subjects[subjectIndex % subjects.length];
      entries.push({
        schoolId: classObj.schoolId,
        classId: classObj.id,
        className: classObj.className,
        subjectId: subj.id,
        subjectName: subj.name || subj.subjectName || "",
        teacherId: "",
        teacherName: "",
        dayOfWeek: day,
        startTime: slot.start,
        endTime: slot.end,
      });
      subjectIndex++;
    }
  }

  return entries;
}

/**
 * Auto-link teachers to timetable entries based on teachingAssignments.
 * Updates existing entries that have no teacher yet.
 */
export async function autoLinkTeachersToTimetable(schoolId) {
  try {
    const [entries, teachers] = await Promise.all([
      base44.entities.TimetableEntry.filter({ schoolId }),
      base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
    ]);

    const updates = [];
    for (const entry of (entries || [])) {
      if (entry.teacherId) continue; // already linked
      // Find a teacher assigned to this class+subject
      const match = (teachers || []).find(t =>
        (t.teachingAssignments || []).some(
          a => a.classId === entry.classId && a.subjectId === entry.subjectId
        )
      );
      if (match) {
        updates.push(
          base44.entities.TimetableEntry.update(entry.id, {
            teacherId: match.id,
            teacherName: match.fullName,
          })
        );
      }
    }
    await Promise.all(updates);
    return updates.length;
  } catch (e) {
    console.error('autoLinkTeachersToTimetable error', e);
    return 0;
  }
}

/** Parse a natural-language timetable prompt to extract className */
export function parseTimetablePrompt(prompt) {
  if (!prompt) return null;
  // Match patterns like JS1A, JS2B, SS1 Science A, SS2 Commercial, JS3C, etc.
  const match = prompt.match(/\b(JS[1-3][A-Za-z]?|SS[1-3]\s*[A-Za-z\s]*?[A-Za-z])\b/i);
  return match ? match[0].trim() : null;
}