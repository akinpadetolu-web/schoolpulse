import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, parseISO, addMonths, subMonths } from 'date-fns';

const STATUS_CONFIG = {
  present: { label: 'Present', icon: CheckCircle2, cls: 'text-emerald-600' },
  absent:  { label: 'Absent',  icon: XCircle,      cls: 'text-red-600' },
  late:    { label: 'Late',    icon: Clock,        cls: 'text-amber-600' },
  excused: { label: 'Excused', icon: CheckCircle2, cls: 'text-blue-600' },
};

function getDayColor(dayRecords) {
  if (dayRecords.length === 0) return null; // no school / no records
  const absent = dayRecords.filter(r => r.status === 'absent').length;
  const total = dayRecords.length;
  if (absent === 0) return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // full attendance
  if (absent === total) return 'bg-red-100 text-red-700 border-red-200'; // full absence
  return 'bg-amber-100 text-amber-700 border-amber-200'; // partial
}

export default function AttendanceCalendarView({ records }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group records by date
  const byDate = {};
  records.forEach(r => {
    if (!r.date) return;
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedRecords = selectedDateStr ? (byDate[selectedDateStr] || []) : [];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Attendance Calendar</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[110px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-1">
          {[
            { label: 'Full Attendance', cls: 'bg-emerald-100 border border-emerald-200' },
            { label: 'Partial', cls: 'bg-amber-100 border border-amber-200' },
            { label: 'All Absent', cls: 'bg-red-100 border border-red-200' },
            { label: 'No Records', cls: 'bg-muted border border-border' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded ${l.cls}`} />
              {l.label}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calDays.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const dayRecs = byDate[ds] || [];
            const colorCls = getDayColor(dayRecs);
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === ds;

            return (
              <button
                key={ds}
                onClick={() => {
                  if (!inMonth) return;
                  setSelectedDay(isSelected ? null : day);
                }}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-lg border text-xs font-medium transition-all
                  ${!inMonth ? 'opacity-25 cursor-default border-transparent' : 'cursor-pointer hover:opacity-80'}
                  ${colorCls || (inMonth ? 'bg-muted/30 border-border' : 'border-transparent')}
                  ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
              >
                <span className={!inMonth ? 'text-muted-foreground' : ''}>{format(day, 'd')}</span>
                {dayRecs.length > 0 && inMonth && (
                  <span className="text-[9px] opacity-70">{dayRecs.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail popup */}
        {selectedDay && (
          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedDay(null)}>Close</Button>
            </div>
            {selectedRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedRecords.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.absent;
                  const Icon = cfg.icon;
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-card p-3 border">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${cfg.cls}`} />
                        <div>
                          <p className="text-sm font-medium">{r.subjectName || 'General'}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.teacherName && `${r.teacherName}`}
                            {r.startTime && ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ''}`}
                          </p>
                          {r.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.note}"</p>}
                        </div>
                      </div>
                      <Badge className={
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'absent' ? 'bg-red-100 text-red-700' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }>{cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}