import { EMPTY_PERIOD, buildPeriod, currentPeriod, gradeDate } from '@/lib/periodUtils';

/**
 * Global session scope for the student, parent and teacher portals.
 *
 * Every read of a period-bound record (grades, attendance, assignments, ...) made
 * through the app's data client is narrowed to the school's current academic
 * session — and so are realtime updates. A school can authorise a role to see
 * earlier sessions from School Settings (School.pastSessionAccess). Admins and
 * other staff are never restricted.
 */

const SCOPED_ROLES = ['student', 'parent', 'teacher'];
const CACHE_MS = 30000;

// The date that places each kind of record inside a session.
const DATE_OF = {
  Grade: gradeDate,
  Attendance: (r) => r.date || r.created_date,
  Assignment: (r) => r.dueDate || r.created_date,
  Submission: (r) => r.submittedAt || r.created_date,
  ExamResult: (r) => r.uploadedAt || r.created_date,
  Quiz: (r) => r.scheduledAt || r.created_date,
  QuizSubmission: (r) => r.submittedAt || r.created_date,
  ReportCard: (r) => r.generatedDate || r.created_date,
  ExamTimetable: (r) => r.startDate || r.date || r.created_date,
  StudentInsight: (r) => r.created_date,
};

let rawClient = null;
let activeUser = null; // { schoolId, role } of whoever is signed in
const cache = new Map(); // key -> { at, promise }
const ready = new Map(); // key -> resolved period, for synchronous realtime checks
const lastGood = new Map();

const keyOf = (schoolId, role) => `${schoolId}:${role}`;
const isScoped = () => Boolean(activeUser?.schoolId && SCOPED_ROLES.includes(activeUser.role));

async function fetchPeriod(schoolId, role) {
  const entities = rawClient.entities;
  const [sessions, terms, schools] = await Promise.all([
    entities.AcademicSession.filter({ schoolId }),
    entities.AcademicTerm.filter({ schoolId }),
    entities.School.filter({ id: schoolId }),
  ]);
  const unrestricted = !SCOPED_ROLES.includes(role) || Boolean(schools?.[0]?.pastSessionAccess?.[role]);
  const { session, term } = currentPeriod(sessions || [], terms || []);
  return buildPeriod(session, term, unrestricted);
}

function getPeriod(schoolId, role) {
  const key = keyOf(schoolId, role);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const promise = fetchPeriod(schoolId, role)
    .then((period) => { lastGood.set(key, period); ready.set(key, period); return period; })
    .catch(() => { cache.delete(key); return lastGood.get(key) || EMPTY_PERIOD; });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/** The period the signed-in portal user is confined to, or null when unrestricted. */
async function activePeriod() {
  if (!isScoped()) return null;
  const period = await getPeriod(activeUser.schoolId, activeUser.role);
  return period.unrestricted ? null : period;
}

/** Period for pages that want to tell the user which session they're viewing. */
export function loadCurrentPeriod(schoolId, role = activeUser?.role) {
  if (!schoolId) return Promise.resolve(EMPTY_PERIOD);
  return getPeriod(schoolId, role);
}

export function setPortalScopeUser(user) {
  activeUser = user ? { schoolId: user.schoolId, role: user.role } : null;
  cache.clear();
  ready.clear();
  if (isScoped()) getPeriod(activeUser.schoolId, activeUser.role);
}

export const clearPortalScope = () => setPortalScopeUser(null);

function scopeResult(name, result, period) {
  const dateOf = DATE_OF[name];
  const keep = (r) => (r && typeof r === 'object' ? period.inPeriod(dateOf(r)) : true);
  if (Array.isArray(result)) return result.filter(keep);
  if (result && Array.isArray(result.items)) return { ...result, items: result.items.filter(keep) };
  return result;
}

function eventInScope(name, event) {
  if (!isScoped()) return true;
  const period = ready.get(keyOf(activeUser.schoolId, activeUser.role));
  if (!period) return false;
  if (period.unrestricted || !event?.data) return true;
  return period.inPeriod(DATE_OF[name](event.data));
}

function scopedHandler(name, handler) {
  return new Proxy(handler, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof value !== 'function') return value;

      if (prop === 'filter' || prop === 'list') {
        return async (...args) => {
          const [period, result] = await Promise.all([activePeriod(), value.apply(target, args)]);
          return period ? scopeResult(name, result, period) : result;
        };
      }
      if (prop === 'subscribe') {
        return (callback, ...rest) =>
          value.call(target, (event) => { if (eventInScope(name, event)) callback(event); }, ...rest);
      }
      return value.bind(target);
    },
  });
}

/** Wraps the data client so period-bound entities are read through the session scope. */
export function installPortalScope(client) {
  rawClient = client;
  const scopedEntities = new Proxy(client.entities, {
    get(target, name) {
      const handler = Reflect.get(target, name);
      return typeof name === 'string' && DATE_OF[name] && handler ? scopedHandler(name, handler) : handler;
    },
  });
  return new Proxy(client, {
    get(target, prop) {
      return prop === 'entities' ? scopedEntities : Reflect.get(target, prop);
    },
  });
}