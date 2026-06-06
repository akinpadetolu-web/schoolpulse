import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, isToday } from 'date-fns';

const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri

function StatusCell({ status }) {
  if (!status) return <span className="text-muted-foreground/40 text-base">—</span>;
  if (status === 'present') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === 'absent') return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'late') return <Clock className="w-4 h-4 text-amber-500" />;
  return <MinusCircle className="w-4 h-4 text-blue-500" />;
}

function cellBg(status) {
  if (!status) return '';
  if (status === 'present') return 'bg-emerald-50';
  if (status === 'absent') return 'bg-red-50';
  if (status === 'late') return 'bg-amber-50';
  return 'bg-blue-50';
}

export default function WeeklyAttendanceGrid({ records }) {
  const [weekRef, setWeekRef] = useState(new Date());
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekRef, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => WEEKDAYS.includes(d.getDay()));

  const prevWeek = () => setWeekRef(w => subWeeks(w, 1));
  const nextWeek = () => setWeekRef(w => addWeeks(w, 1));
  const goToday = () => setWeekRef(new Date());

  // Build subject × day matrix
  const subjectSet = new Set();
  const dateToRecords = {};
  records.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date + 'T00:00:00');
    if (d < weekStart || d > weekEnd) return;
    const s = r.subjectName || 'General';
    subjectSet.add(s);
    if (!dateToRecords[r.date]) dateToRecords[r.date] = {};
    if (!dateToRecords[r.date][s]) dateToRecords[r.date][s] = [];
    dateToRecords[r.date][s].push(r);
  });
  const subjects = [...subjectSet].sort();

  const isCurrentWeek = format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Weekly Summary</CardTitle>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-center min-w-[160px]">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isCurrentWeek && (
              <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToday}>
                This Week
              </Button>
            )}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-1">
          {[
            { icon: CheckCircle2, cls: 'text-emerald-500', label: 'Present' },
            { icon: XCircle, cls: 'text-red-500', label: 'Absent' },
            { icon: Clock, cls: 'text-amber-500', label: 'Late' },
            { icon: MinusCircle, cls: 'text-blue-500', label: 'Excused' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1 text-xs text-muted-foreground">
              <l.icon className={`w-3 h-3 ${l.cls}`} /> {l.label}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {subjects.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 px-4 text-sm">No attendance records for this week.</div>
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-xs w-32">Subject</th>
                {days.map(d => (
                  <th key={d.toISOString()} className={`text-center px-2 py-2.5 font-semibold text-xs ${isToday(d) ? 'text-primary' : ''}`}>
                    <div>{format(d, 'EEE')}</div>
                    <div className="font-normal text-muted-foreground">{format(d, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subjects.map(subj => (
                <tr key={subj} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-xs max-w-[120px] truncate">{subj}</td>
                  {days.map(d => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const daySubjRecs = dateToRecords[ds]?.[subj] || [];
                    const st = daySubjRecs[0]?.status || null;
                    return (
                      <td key={d.toISOString()} className={`text-center px-2 py-2 ${cellBg(st)}`}>
                        <div className="flex items-center justify-center">
                          <StatusCell status={st} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}