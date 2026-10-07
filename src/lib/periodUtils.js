import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Pure helpers for the school's academic calendar (sessions and terms created on
 * the Sessions page). No data access here — see portalScope.js for loading.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Date-only strings (2026-09-01) are calendar days, not UTC instants.
export function toDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function rangeOf(record) {
  const from = toDate(record?.startDate);
  const to = toDate(record?.endDate);
  if (!from || !to) return null;
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function termsOfSession(terms, session) {
  if (!session) return terms;
  return terms.filter(t => t.sessionId === session.id || (!t.sessionId && t.academicYear === session.academicYear));
}

// Picks the current session/term from an ascending list: one the school flagged
// as current (and that hasn't ended), else the one covering today, else the latest
// that has already started — so the gap between two sessions still has an answer.
function pickCurrent(ordered, today) {
  const covers = (r) => Boolean(r.startDate && r.endDate && r.startDate <= today && r.endDate >= today);
  const notOver = (r) => !r.endDate || r.endDate >= today;
  const started = (r) => Boolean(r.startDate && r.startDate <= today);
  const latestFirst = [...ordered].reverse();
  return latestFirst.find(r => r.isCurrent && notOver(r)) || ordered.find(covers) || latestFirst.find(started) || null;
}

// The session and term for today, plus the ones immediately before them, so
// "last term" / "last year" resolve against the real calendar.
export function currentPeriod(sessions, terms) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const byStart = (a, b) => (a.startDate || '').localeCompare(b.startDate || '');
  const ordered = [...(sessions || [])].sort(byStart);

  const session = pickCurrent(ordered, today);
  const sessionTerms = termsOfSession(terms || [], session).sort(byStart);
  const term = pickCurrent(sessionTerms, today);

  const tIdx = term ? sessionTerms.findIndex(t => t.id === term.id) : -1;
  const sIdx = session ? ordered.findIndex(s => s.id === session.id) : -1;
  return {
    session,
    term,
    prevTerm: tIdx > 0 ? sessionTerms[tIdx - 1] : null,
    prevSession: sIdx > 0 ? ordered[sIdx - 1] : null,
  };
}

// No calendar (or an authorised role) means no restriction.
export const EMPTY_PERIOD = { session: null, term: null, ranges: [], unrestricted: false, inPeriod: () => true };

// A period scoped to one session: inPeriod(date) is true only inside its dates.
export function buildPeriod(session, term, unrestricted = false) {
  const range = rangeOf(session);
  if (unrestricted || !range) return { ...EMPTY_PERIOD, session, term, unrestricted };
  return {
    session,
    term,
    ranges: [range],
    unrestricted: false,
    inPeriod(date) {
      const d = toDate(date);
      return Boolean(d) && d >= range.from && d <= range.to;
    },
  };
}

// Grades only carry lastUpdatedAt once they've been edited — fall back to the
// record timestamps so untouched grades aren't discarded.
export function gradeDate(g) {
  return g.lastUpdatedAt || g.updated_date || g.created_date;
}

export function periodLabel(period) {
  if (!period || period.unrestricted || !period.ranges.length) return null;
  return period.session?.name || period.session?.academicYear || null;
}