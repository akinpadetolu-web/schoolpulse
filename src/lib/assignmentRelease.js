import { toDate } from '@/lib/periodUtils';

/**
 * Scheduled assignment visibility.
 *
 * A teacher can prepare assignments at the start of a term and give each one a
 * release date. Until that date arrives the assignment must not appear anywhere
 * in the student or parent portals, even though the record already exists.
 */

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function isReleased(assignment, today = new Date()) {
  if (!assignment) return false;
  if (!assignment.releaseDate) return true;
  const release = toDate(assignment.releaseDate);
  if (!release) return true;
  return startOfDay(release) <= startOfDay(today);
}

export function isScheduled(assignment) {
  return Boolean(assignment?.releaseDate) && !isReleased(assignment);
}

/** Keeps only the assignments a student or parent is allowed to see today. */
export function releasedOnly(assignments) {
  return (assignments || []).filter(a => isReleased(a));
}