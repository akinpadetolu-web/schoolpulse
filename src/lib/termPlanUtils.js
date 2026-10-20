import { base44 } from '@/api/base44Client';
import { toDate } from '@/lib/periodUtils';

/**
 * Helpers for term lesson plans — the weekly topic schedule a teacher builds
 * once per term, which the admin approves as a whole before students and
 * parents can see it.
 */

const DAY_MS = 86400000;
const MAX_WEEKS = 30;

const iso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Splits a term's date range into consecutive 7-day teaching weeks. */
export function buildWeeks(term) {
  const start = toDate(term?.startDate);
  const end = toDate(term?.endDate);
  if (!start || !end || end < start) return [];

  const weeks = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let weekNumber = 1;

  while (cursor <= end && weekNumber <= MAX_WEEKS) {
    const weekEnd = new Date(Math.min(cursor.getTime() + 6 * DAY_MS, end.getTime()));
    weeks.push({
      weekNumber,
      startDate: iso(cursor),
      endDate: iso(weekEnd),
      topic: '',
      objectives: '',
      notes: '',
      isMidterm: false,
      isExam: false,
      pdfFileUri: '',
      pdfFileName: '',
    });
    cursor = new Date(weekEnd.getTime() + DAY_MS);
    weekNumber += 1;
  }
  return weeks;
}

/** Rebuilds the week list for a term while keeping anything already written. */
export function mergeWeeks(existing, generated) {
  const byNumber = new Map((existing || []).map(w => [w.weekNumber, w]));
  return generated.map(week => {
    const prev = byNumber.get(week.weekNumber);
    if (!prev) return week;
    return { ...week, ...prev, startDate: week.startDate, endDate: week.endDate };
  });
}

export const weekLabel = (week) => `Week ${week?.weekNumber ?? ''}`;

export const weekRange = (week) => {
  const from = toDate(week?.startDate);
  const to = toDate(week?.endDate);
  if (!from || !to) return '';
  const opts = { month: 'short', day: 'numeric' };
  return `${from.toLocaleDateString('en-US', opts)} – ${to.toLocaleDateString('en-US', opts)}`;
};

export const filledWeeks = (weeks) => (weeks || []).filter(w => (w.topic || '').trim()).length;

/** Groups approved term plans by subject so each portal shows one dropdown per subject. */
export function groupBySubject(plans) {
  const groups = new Map();
  (plans || []).forEach(plan => {
    const key = plan.subjectId || plan.subjectName || plan.id;
    if (!groups.has(key)) {
      groups.set(key, { key, subjectName: plan.subjectName || 'Subject', plans: [] });
    }
    groups.get(key).plans.push(plan);
  });
  return [...groups.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

/** Opens a week's topic PDF through a short-lived signed link. */
export async function openTopicPdf(week) {
  if (!week?.pdfFileUri) return;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: week.pdfFileUri,
    expires_in: 300,
  });
  if (signed_url) window.open(signed_url, '_blank', 'noopener');
}