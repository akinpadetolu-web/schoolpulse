import { base44 } from '@/api/base44Client';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * The school's academic calendar lives on the Sessions page. Student, parent and
 * teacher portals scope their records to whichever session and term cover today,
 * so a newly created session automatically hides the previous one. Only the admin
 * dashboard can look back at past sessions.
 */

export const EMPTY_PERIOD = { session: null, term: null, ranges: [], inPeriod: () => true };

export function rangeOf(record) {
  if (!record?.startDate || !record?.endDate) return null;
  return { from: startOfDay(new Date(record.startDate)), to: endOfDay(new Date(record.endDate)) };
}

export function termsOfSession(sessions, terms, session) {
  if (!session) return terms;
  return terms.filter(t => t.sessionId === session.id || (!t.sessionId && t.academicYear === session.academicYear));
}

// The session and term covering today, falling back to the ones flagged as current.
export function currentPeriod(sessions, terms) {
  const today = new Date().toISOString().split('T')[0];
  const covers = (r) => Boolean(r.startDate && r.endDate && r.startDate <= today && r.endDate >= today);
  const byStart = (a, b) => (a.startDate || '').localeCompare(b.startDate || '');
  const ordered = [...(sessions || [])].sort(byStart);

  const session = ordered.find(covers) || ordered.find(s => s.isCurrent) || null;
  const sessionTerms = termsOfSession(ordered, terms || [], session).sort(byStart);
  const term = sessionTerms.find(covers) || sessionTerms.find(t => t.isCurrent) || null;
  return { session, term };
}

// Grades only carry lastUpdatedAt once they've been edited — fall back to the
// record timestamps so untouched grades aren't discarded.
export function gradeDate(g) {
  return g.lastUpdatedAt || g.updated_date || g.created_date;
}

export function periodLabel(period) {
  if (!period?.session && !period?.term) return null;
  return [period.term?.name, period.session?.name || period.session?.academicYear].filter(Boolean).join(' · ');
}

// Fetches the school calendar and returns a scope for the current session/term.
export async function loadCurrentPeriod(schoolId) {
  if (!schoolId) return EMPTY_PERIOD;
  const [sessions, terms] = await Promise.all([
    base44.entities.AcademicSession.filter({ schoolId }).catch(() => []),
    base44.entities.AcademicTerm.filter({ schoolId }).catch(() => []),
  ]);
  const { session, term } = currentPeriod(sessions || [], terms || []);
  const ranges = [rangeOf(session), rangeOf(term)].filter(Boolean);
  return {
    session,
    term,
    ranges,
    inPeriod: (date) => {
      if (!ranges.length) return true;
      if (!date) return false;
      const t = new Date(date).getTime();
      if (Number.isNaN(t)) return false;
      return ranges.every(r => t >= r.from.getTime() && t <= r.to.getTime());
    },
  };
}