import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function GridTimetable({ entries, title = 'Weekly Timetable' }) {
  // Extract unique times and sort them
  const sortedTimes = useMemo(() => {
    const times = new Set();
    entries.forEach(e => {
      if (e.startTime) times.add(e.startTime);
      if (e.endTime) times.add(e.endTime);
    });
    return Array.from(times).sort();
  }, [entries]);

  // Build a grid: rows = times, columns = days
  const grid = useMemo(() => {
    const timetable = {};
    DAYS.forEach(day => {
      timetable[day] = {};
      sortedTimes.forEach(time => {
        timetable[day][time] = null;
      });
    });

    entries.forEach(entry => {
      if (entry.dayOfWeek && entry.startTime) {
        const day = entry.dayOfWeek;
        const time = entry.startTime;
        if (timetable[day]) {
          timetable[day][time] = entry;
        }
      }
    });

    return timetable;
  }, [entries, sortedTimes]);

  if (entries.length === 0) {
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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
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
                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`p-2 sm:p-3 min-h-20 flex flex-col items-center justify-center text-center border-b border-r border-border dark:border-slate-700 ${
                        entry
                          ? 'bg-primary/10 dark:bg-primary/20'
                          : 'bg-background dark:bg-slate-950'
                      }`}
                    >
                      {entry && (
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