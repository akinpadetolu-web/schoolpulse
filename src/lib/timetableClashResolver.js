// Shared clash-resolution logic for the weekly timetable.
// Detects class & teacher clashes and RELOCATES clashing subjects to free
// (day, slot) pairs, returning a human-readable explanation for every move.
// Used by the "Resolve Clashes" action on the already-generated timetable.

export const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Breaks (Short Break / Long Break) are NOT subjects: they keep whatever time
// slot they occupy, are never relocated/swapped, and are never flagged as
// clashes. Detection is by NAME only — never by hard-coded time ranges — so
// any break time (e.g. 10:00–10:15, 12:00–13:00) is driven by the data, not code.
export function isBreak(entry) {
  const name = (entry?.subjectName || entry?.name || '').toLowerCase().trim();
  return name === 'short break' || name === 'long break';
}

export function timeToMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function timesOverlap(s1, e1, s2, e2) {
  const a = timeToMin(s1), b = timeToMin(e1);
  const c = timeToMin(s2), d = timeToMin(e2);
  if (a === null || b === null || c === null || d === null) return false;
  return a < d && c < b;
}

/**
 * Detect clashes for a candidate entry against a list of entries.
 * Returns array of clash descriptions (empty = no clash).
 */
export function detectClashes(candidate, existingEntries) {
  if (isBreak(candidate)) return []; // breaks are not subjects — never clash
  const clashes = [];
  const { classId, teacherId, dayOfWeek, startTime, endTime } = candidate;
  if (!dayOfWeek || !startTime || !endTime) return clashes;
  for (const e of existingEntries) {
    if (e.id === candidate.id) continue;
    if (e.dayOfWeek !== dayOfWeek) continue;
    if (!timesOverlap(startTime, endTime, e.startTime, e.endTime)) continue;
    if (classId && e.classId === classId) {
      clashes.push(`Class clash: ${e.className || 'Class'} already has "${e.subjectName}" at ${e.startTime}–${e.endTime} on ${dayOfWeek}`);
    }
    if (teacherId && teacherId !== '' && e.teacherId === teacherId) {
      clashes.push(`Teacher clash: ${e.teacherName || 'Teacher'} is already teaching "${e.subjectName}" (${e.className}) at ${e.startTime}–${e.endTime} on ${dayOfWeek}`);
    }
  }
  return clashes;
}

/**
 * Resolve clashes by relocating clashing entries to free (day, slot) pairs.
 *
 * @param {Array} entries - [{ id, classId, className, teacherId, teacherName, subjectId, subjectName, dayOfWeek, startTime, endTime }]
 * @param {Object} [options]
 * @param {string[]} [options.days] - weekdays to consider (defaults to Mon–Fri)
 * @param {Array} [options.slots] - [{ startTime, endTime }] available periods (derived from entries if omitted)
 * @returns {{ resolvedEntries, resolutions, unresolved, stats }}
 *   resolvedEntries: entries with moved day/time updated (unmoved ones unchanged)
 *   resolutions: [{ subjectName, className, teacherName, from:{day,startTime,endTime}, to:{day,startTime,endTime}, reason }]
 *   unresolved: [string] clash descriptions that could not be relocated
 *   stats: { totalClashes, resolved, unresolved }
 */
export function resolveClashes(entries, options = {}) {
  const days = options.days || TIMETABLE_DAYS;

  // Derive the school's discrete time slots from existing entries
  const slotMap = {};
  for (const e of entries) {
    if (e.startTime && e.endTime) slotMap[`${e.startTime}-${e.endTime}`] = { startTime: e.startTime, endTime: e.endTime };
  }
  const slots = options.slots || Object.values(slotMap).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Work on copies so we never mutate the caller's array
  const working = entries.map(e => ({ ...e }));
  const resolutions = [];
  const unresolved = [];

  function findClash(e) {
    for (const o of working) {
      if (o.id === e.id) continue;
      if (o.dayOfWeek !== e.dayOfWeek) continue;
      if (!timesOverlap(e.startTime, e.endTime, o.startTime, o.endTime)) continue;
      if (e.classId && o.classId === e.classId) return { type: 'class', with: o };
      if (e.teacherId && e.teacherId === o.teacherId) return { type: 'teacher', with: o };
    }
    return null;
  }

  function slotIsFree(e, day, slot, excludeIds = []) {
    if (day === e.dayOfWeek && slot.startTime === e.startTime) return false; // same slot
    for (const o of working) {
      if (o.id === e.id || excludeIds.includes(o.id)) continue;
      if (o.dayOfWeek !== day) continue;
      if (!timesOverlap(slot.startTime, slot.endTime, o.startTime, o.endTime)) continue;
      if (e.classId && o.classId === e.classId) return false; // class clash at target
      if (e.teacherId && o.teacherId === e.teacherId) return false; // teacher clash at target
    }
    // avoid scheduling the same subject twice on the target day
    if (e.subjectId) {
      for (const o of working) {
        if (o.id === e.id || excludeIds.includes(o.id)) continue;
        if (o.classId === e.classId && o.dayOfWeek === day && o.subjectId === e.subjectId) return false;
      }
    }
    return true;
  }

  // Score a candidate (day, slot) — lower is better. Prefers: same day as the
  // original, minimal time-of-day displacement, and adjacency to the class's
  // existing lessons on the target day (keeps the day contiguous / balanced).
  function scoreSlot(e, day, slot) {
    const origDayIdx = days.indexOf(e.dayOfWeek);
    const dayIdx = days.indexOf(day);
    let score = 0;
    // Strongly prefer keeping the subject on its original day
    score += (dayIdx !== origDayIdx ? 100 : 0);
    // Penalise day distance from the original
    score += Math.abs(dayIdx - origDayIdx) * 12;
    // Penalise time-of-day displacement (minutes)
    const origMin = timeToMin(e.startTime);
    const slotMin = timeToMin(slot.startTime);
    if (origMin !== null && slotMin !== null) score += Math.abs(origMin - slotMin) / 10;
    // Reward adjacency to an existing same-class lesson on the target day
    let gap = Infinity;
    for (const o of working) {
      if (o.id === e.id) continue;
      if (o.classId !== e.classId || o.dayOfWeek !== day) continue;
      const os = timeToMin(o.startTime), oe = timeToMin(o.endTime);
      if (os === null || oe === null) continue;
      gap = Math.min(gap, Math.abs(slotMin - os), Math.abs(slotMin - oe));
    }
    if (gap !== Infinity) score -= 25 * (gap === 0 ? 1 : 1 / (1 + gap)); // adjacent => bigger reward
    return score;
  }

  // Collect every valid candidate and pick the best-scoring one.
  function findBestSlot(e) {
    let best = null;
    let bestScore = Infinity;
    for (const day of days) {
      for (const slot of slots) {
        if (!slotIsFree(e, day, slot)) continue;
        const s = scoreSlot(e, day, slot);
        if (s < bestScore) { bestScore = s; best = { day, startTime: slot.startTime, endTime: slot.endTime }; }
      }
    }
    return best;
  }

  // When no free slot exists, try a SWAP: substitute another class's subject
  // slot. Move that subject into the clashing entry's old slot, and move the
  // clashing entry into the substituted slot — freeing the teacher without
  // creating a new clash. Different teachers only (swapping same-teacher
  // entries can't free the teacher).
  function findBestSwap(e) {
    let best = null;
    let bestScore = Infinity;
    for (const g of working) {
      if (g.id === e.id) continue;
      if (!g.dayOfWeek || !g.startTime || !g.endTime) continue;
      if (isBreak(g)) continue; // never substitute a break out of its slot
      if (g.dayOfWeek === e.dayOfWeek && g.startTime === e.startTime) continue; // same slot
      if (e.teacherId && g.teacherId === e.teacherId) continue; // same teacher — swapping won't help
      const eTarget = { day: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime };
      const gTarget = { day: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime };
      // E can take G's slot (G vacates it), G can take E's slot (E vacates it)
      if (!slotIsFree(e, eTarget.day, eTarget, [g.id])) continue;
      if (!slotIsFree(g, gTarget.day, gTarget, [e.id])) continue;
      // Score: prefer minimal displacement for E; small penalty for disturbing G
      const sc = scoreSlot(e, eTarget.day, eTarget)
        + 15
        + Math.abs(days.indexOf(g.dayOfWeek) - days.indexOf(e.dayOfWeek)) * 6;
      if (sc < bestScore) {
        bestScore = sc;
        best = { swapWith: g, eTarget, gTarget };
      }
    }
    return best;
  }

  let totalClashes = 0;
  let resolvedCount = 0;

  for (const e of working) {
    if (!e.dayOfWeek || !e.startTime || !e.endTime) continue;
    if (isBreak(e)) continue; // breaks keep their original slots — never relocate
    const clash = findClash(e);
    if (!clash) continue;
    totalClashes++;
    const from = { day: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime };
    const free = findBestSlot(e);
    if (free) {
      e.dayOfWeek = free.day;
      e.startTime = free.startTime;
      e.endTime = free.endTime;
      const reason = clash.type === 'teacher'
        ? `Teacher clash: ${e.teacherName || 'teacher'} would have been double-booked at ${from.day} ${from.startTime}–${from.endTime} with "${clash.with.subjectName}" (${clash.with.className || 'class'}). Moved to ${free.day} ${free.startTime}–${free.endTime}.`
        : `Class clash: ${e.className} already had "${clash.with.subjectName}" at ${from.day} ${from.startTime}–${from.endTime}. Moved to ${free.day} ${free.startTime}–${free.endTime}.`;
      resolutions.push({ subjectName: e.subjectName, className: e.className, teacherName: e.teacherName, from, to: free, reason });
      resolvedCount++;
      continue;
    }

    // No free slot — try substituting another class's subject slot (swap)
    const swap = findBestSwap(e);
    if (swap) {
      const g = swap.swapWith;
      const gFrom = { day: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime };
      // Move E into G's old slot
      e.dayOfWeek = swap.eTarget.day;
      e.startTime = swap.eTarget.startTime;
      e.endTime = swap.eTarget.endTime;
      // Move G into E's old slot
      g.dayOfWeek = swap.gTarget.day;
      g.startTime = swap.gTarget.startTime;
      g.endTime = swap.gTarget.endTime;
      resolutions.push({
        subjectName: e.subjectName, className: e.className, teacherName: e.teacherName,
        from, to: swap.eTarget,
        reason: `Teacher clash: ${e.teacherName || 'teacher'} was double-booked at ${from.day} ${from.startTime}–${from.endTime}. Substituted ${g.subjectName} (${g.className || 'class'}) out of ${gFrom.day} ${gFrom.startTime}–${gFrom.endTime} into ${swap.gTarget.day} ${swap.gTarget.startTime}–${swap.gTarget.endTime}, freeing the slot. ${e.subjectName} moved to ${swap.eTarget.day} ${swap.eTarget.startTime}–${swap.eTarget.endTime}.`,
      });
      resolutions.push({
        subjectName: g.subjectName, className: g.className, teacherName: g.teacherName,
        from: gFrom, to: swap.gTarget,
        reason: `Substituted to free teacher ${e.teacherName || ''}: ${g.subjectName} (${g.className || 'class'}) swapped from ${gFrom.day} ${gFrom.startTime}–${gFrom.endTime} to ${swap.gTarget.day} ${swap.gTarget.startTime}–${swap.gTarget.endTime}.`,
      });
      resolvedCount++;
      continue;
    }

    const reason = clash.type === 'teacher'
      ? `Teacher clash: ${e.teacherName || 'teacher'} was double-booked at ${from.day} ${from.startTime}–${from.endTime} with "${clash.with.subjectName}" (${clash.with.className || 'class'})`
      : `Class clash: ${e.className} already had "${clash.with.subjectName}" at ${from.day} ${from.startTime}–${from.endTime}`;
    unresolved.push(`Could not relocate "${e.subjectName}" (${e.className}) — ${reason}. No free slot or swap available.`);
    continue;
  }

  return {
    resolvedEntries: working,
    resolutions,
    unresolved,
    stats: { totalClashes, resolved: resolvedCount, unresolved: unresolved.length },
  };
}