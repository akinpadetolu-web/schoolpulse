import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BREAK_NAMES = ['Short Break', 'Long Break'];
const isBreakEntry = (e) => !!(e && (BREAK_NAMES.includes(e.subjectName) || (typeof e.subjectId === 'string' && e.subjectId.startsWith('BREAK_'))));

function breakSlotsForDay(breaks, day) {
  if (!Array.isArray(breaks)) return [];
  return breaks
    .filter(b => b && b.start && b.end)
    .map(b => {
      const o = b.overrides?.[day];
      return (o && o.start && o.end) ? { name: b.name, start: o.start, end: o.end } : { name: b.name, start: b.start, end: b.end };
    });
}

export default function GridTimetable({ entries, title = 'Weekly Timetable', breaks }) {
  // Merge real entries with virtual break rows (from the school's break schedule)
  // so blocked-out break times are always visible — even on manual or teacher
  // timetables that have no break rows of their own.
  const mergedEntries = useMemo(() => {
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
  }, [entries, breaks]);

  // Extract unique times and sort them
  const sortedTimes = useMemo(() => {
    const times = new Set();
    mergedEntries.forEach(e => {
      if (e.startTime) times.add(e.startTime);
      if (e.endTime) times.add(e.endTime);
    });
    return Array.from(times).sort();
  }, [mergedEntries]);

  // Build a grid: rows = times, columns = days
  const grid = useMemo(() => {
    const timetable = {};
    DAYS.forEach(day => {
      timetable[day] = {};
      sortedTimes.forEach(time => { timetable[day][time] = null; });
    });
    mergedEntries.forEach(entry => {
      if (entry.dayOfWeek && entry.startTime && timetable[entry.dayOfWeek]) {
        timetable[entry.dayOfWeek][entry.startTime] = entry;
      }
    });
    return timetable;
  }, [mergedEntries, sortedTimes]);

  if (mergedEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No timetable entries available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Break legend */}
        {breaks?.length > 0 && (
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium">
              <Coffee className="w-3 h-3" /> Break
            </span>
            <span>Blocked-out times — no subjects are scheduled during breaks.</span>
          </div>
        )}
        {/* Grid Container */}
        <div className="overflow-x-auto">
          <div className="min-w-full inline-grid gap-px bg-border dark:bg-slate-700 p-px rounded-lg" style={{ gridTemplateColumns: `80px repeat(5, 1fr)` }}>
            {/* Time Header */}
            <div className="bg-slate-50 dark:bg-slate-800 p-2 sm:p-3 text-xs sm:text-sm font-semibold text-foreground flex items-center justify-center border-b border-border dark:border-slate-700 min-h-10"></div>

            {/* Day Headers */}
            {DAYS.map(day => (
              <div
                key={day}
                className="bg-slate-50 dark:bg-slate-800 p-2 sm:p-3 text-xs sm:text-sm font-semibold text-foreground text-center border-b border-border dark:border-slate-700 min-h-10 flex items-center justify-center"
              >
                {day}
              </div>
            ))}

            {/* Time Rows */}
            {sortedTimes.map(time => (
              <React.Fragment key={time}>
                {/* Time Label */}
                <div className="bg-card dark:bg-slate-900 p-2 sm:p-3 text-xs sm:text-sm font-medium text-foreground text-center border-r border-border dark:border-slate-700 min-h-20 flex items-center justify-center whitespace-nowrap">
                  {time}
                </div>

                {/* Grid Cells */}
                {DAYS.map(day => {
                  const entry = grid[day][time];
                  const isBreak = entry && (isBreakEntry(entry) || entry.isBreakRow);
                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`p-2 sm:p-3 min-h-20 flex flex-col items-center justify-center text-center border-b border-r border-border dark:border-slate-700 ${
                        isBreak
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : entry
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : 'bg-background dark:bg-slate-950'
                      }`}
                    >
                      {entry && isBreak && (
                        <div className="w-full flex flex-col items-center gap-1">
                          <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <p className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-200 truncate">
                            {entry.subjectName}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Break</p>
                          {entry.startTime && entry.endTime && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">{entry.startTime}–{entry.endTime}</p>
                          )}
                        </div>
                      )}
                      {entry && !isBreak && (
                        <div className="w-full">
                          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                            {entry.subjectName}
                          </p>
                          {entry.teacherName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.teacherName}
                            </p>
                          )}
                          {entry.className && (
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.className}
                            </p>
                          )}
                          {entry.startTime && entry.endTime && (
                            <p className="text-xs text-muted-foreground">
                              {entry.startTime} - {entry.endTime}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}