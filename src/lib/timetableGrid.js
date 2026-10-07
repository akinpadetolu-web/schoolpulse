// Shared helpers for rendering a weekly timetable grid
// (used by the desktop table view and the phone zoom view).
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BREAK_NAMES = ['Short Break', 'Long Break'];

export const isBreakEntry = (e) => !!(e && (BREAK_NAMES.includes(e.subjectName) || (typeof e.subjectId === 'string' && e.subjectId.startsWith('BREAK_'))));

export function breakSlotsForDay(breaks, day) {
  if (!Array.isArray(breaks)) return [];
  return breaks
    .filter(b => b && b.start && b.end)
    .map(b => {
      const o = b.overrides?.[day];
      return (o && o.start && o.end) ? { name: b.name, start: o.start, end: o.end } : { name: b.name, start: b.start, end: b.end };
    });
}

// Real entries plus virtual break rows from the school's break schedule, so
// blocked-out break times are always visible.
export function mergeBreakRows(entries, breaks) {
  const list = entries || [];
  const virtual = [];
  for (const day of DAYS) {
    for (const b of breakSlotsForDay(breaks, day)) {
      const hasReal = list.some(e => isBreakEntry(e) && e.dayOfWeek === day && e.subjectName === b.name);
      if (!hasReal) {
        virtual.push({ id: `vbreak-${day}-${b.name}`, isBreakRow: true, subjectName: b.name, dayOfWeek: day, startTime: b.start, endTime: b.end });
      }
    }
  }
  return [...list, ...virtual];
}

// Rows = times, columns = days.
export function buildGrid(merged) {
  const times = new Set();
  (merged || []).forEach(e => {
    if (e.startTime) times.add(e.startTime);
    if (e.endTime) times.add(e.endTime);
  });
  const sortedTimes = Array.from(times).sort();
  const grid = {};
  DAYS.forEach(day => {
    grid[day] = {};
    sortedTimes.forEach(time => { grid[day][time] = null; });
  });
  (merged || []).forEach(entry => {
    if (entry.dayOfWeek && entry.startTime && grid[entry.dayOfWeek]) {
      grid[entry.dayOfWeek][entry.startTime] = entry;
    }
  });
  return { times: sortedTimes, grid };
}

// Same grid, but every slot holds a list of entries — needed when a single
// week can contain more than one class per slot (e.g. "All Classes").
export function buildCellMap(merged) {
  const map = {};
  DAYS.forEach(day => { map[day] = {}; });
  (merged || []).forEach(entry => {
    if (!entry.dayOfWeek || !entry.startTime || !map[entry.dayOfWeek]) return;
    const slot = map[entry.dayOfWeek][entry.startTime] || (map[entry.dayOfWeek][entry.startTime] = []);
    slot.push(entry);
  });
  return map;
}