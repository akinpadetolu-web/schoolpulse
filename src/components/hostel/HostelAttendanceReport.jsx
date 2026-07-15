import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BedDouble, ChevronLeft, ChevronRight, TrendingUp, CalendarDays } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function shiftWeek(weekStart, days) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatDisplay(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  late_arrival: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  early_departure: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function HostelAttendanceReport({ allocations, hostels, attendance }) {
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [weekStart, setWeekStart] = useState(() => formatDate(getWeekStart(formatDate(new Date()))));

  const activeHostels = useMemo(() => hostels.filter(h => h.isActive), [hostels]);

  const weekStartObj = useMemo(() => new Date(weekStart + 'T00:00:00'), [weekStart]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = shiftWeek(weekStartObj, i);
      return { date: formatDate(d), label: DAY_NAMES[i], display: formatDisplay(d) };
    });
  }, [weekStartObj]);

  const hostelAllocations = useMemo(() => {
    if (!selectedHostelId) return [];
    return allocations
      .filter(a => a.hostelId === selectedHostelId && a.status === 'active')
      .sort((a, b) => {
        const rc = (a.roomNumber || 'ZZZ').localeCompare(b.roomNumber || 'ZZZ', undefined, { numeric: true });
        if (rc !== 0) return rc;
        return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true });
      });
  }, [allocations, selectedHostelId]);

  const rooms = useMemo(() => {
    const grouped = {};
    hostelAllocations.forEach(a => {
      const room = a.roomNumber || 'Unassigned';
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(a);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [hostelAllocations]);

  // Build chart data: one entry per day, showing present/absent counts
  const chartData = useMemo(() => {
    if (!selectedHostelId) return [];
    return weekDays.map(day => {
      const dayRecords = attendance.filter(
        a => a.hostelId === selectedHostelId && a.attendanceDate === day.date
      );
      // Deduplicate by student — a student may have multiple sessions; count once per day
      const studentMap = {};
      dayRecords.forEach(r => {
        if (!studentMap[r.studentId] || r.status === 'present') {
          studentMap[r.studentId] = r.status;
        }
      });
      const statuses = Object.values(studentMap);
      const present = statuses.filter(s => s === 'present').length;
      const absent = statuses.filter(s => s === 'absent').length;
      const onLeave = statuses.filter(s => s === 'on_leave').length;
      const total = statuses.length;
      return {
        day: day.label,
        date: day.display,
        Present: present,
        Absent: absent,
        'On Leave': onLeave,
        'Presence %': total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [weekDays, attendance, selectedHostelId]);

  // Build per-room history matrix
  const roomHistory = useMemo(() => {
    return rooms.map(([room, students]) => {
      const dayBreakdown = weekDays.map(day => {
        const dayRecords = attendance.filter(
          a => a.hostelId === selectedHostelId && a.attendanceDate === day.date
        );
        const present = students.filter(s => {
          const recs = dayRecords.filter(r => r.studentId === s.studentId);
          return recs.some(r => r.status === 'present');
        }).length;
        const absent = students.filter(s => {
          const recs = dayRecords.filter(r => r.studentId === s.studentId);
          return recs.length > 0 && recs.every(r => r.status !== 'present') && !recs.some(r => r.status === 'present');
        }).length;
        const unmarked = students.filter(s => {
          const recs = dayRecords.filter(r => r.studentId === s.studentId);
          return recs.length === 0;
        }).length;
        const presenceRate = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
        return { ...day, present, absent, unmarked, presenceRate, total: students.length };
      });
      const avgPresence = dayBreakdown.length > 0
        ? Math.round(dayBreakdown.reduce((sum, d) => sum + d.presenceRate, 0) / dayBreakdown.length)
        : 0;
      return { room, students, dayBreakdown, avgPresence };
    });
  }, [rooms, weekDays, attendance, selectedHostelId]);

  const weekRangeLabel = useMemo(() => {
    const end = shiftWeek(weekStartObj, 6);
    return `${formatDisplay(weekStartObj)} – ${formatDisplay(end)}`;
  }, [weekStartObj]);

  if (activeHostels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No active hostels available for your access level.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Hostel</Label>
              <Select
                value={selectedHostelId}
                onValueChange={v => { setSelectedHostelId(v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hostel..." />
                </SelectTrigger>
                <SelectContent>
                  {activeHostels.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Week</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setWeekStart(formatDate(shiftWeek(weekStartObj, -7)))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm font-medium">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {weekRangeLabel}
                </div>
                <Button variant="outline" size="icon" onClick={() => setWeekStart(formatDate(shiftWeek(weekStartObj, 7)))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setWeekStart(formatDate(getWeekStart(formatDate(new Date()))))}>
              This Week
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedHostelId ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a hostel to view weekly attendance trends.</p>
        </div>
      ) : hostelAllocations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active allocations in this hostel.</p>
        </div>
      ) : (
        <>
          {/* Weekly trend chart */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Weekly Presence Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Absent" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="On Leave" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-room daily history */}
          <div className="space-y-4">
            {roomHistory.map(({ room, students, dayBreakdown, avgPresence }) => (
              <Card key={room} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Room {room}</span>
                      <Badge variant="secondary" className="ml-1">{students.length} student{students.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <Badge className={avgPresence >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : avgPresence >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                      Avg {avgPresence}% present
                    </Badge>
                  </div>

                  {/* Day-by-day grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">Day</th>
                          {dayBreakdown.map(d => (
                            <th key={d.date} className="text-center font-medium text-muted-foreground px-2 py-2">
                              <div>{d.label}</div>
                              <div className="text-xs font-normal">{d.display}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2 font-medium text-green-600">Present</td>
                          {dayBreakdown.map(d => (
                            <td key={d.date} className="text-center px-2 py-2">
                              {d.total > 0 ? (
                                <span className="font-medium text-green-600">{d.present}/{d.total}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2 font-medium text-red-600">Absent</td>
                          {dayBreakdown.map(d => (
                            <td key={d.date} className="text-center px-2 py-2">
                              {d.total > 0 ? (
                                <span className="font-medium text-red-600">{d.absent}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2 font-medium text-amber-600">Unmarked</td>
                          {dayBreakdown.map(d => (
                            <td key={d.date} className="text-center px-2 py-2">
                              {d.total > 0 ? (
                                <span className="font-medium text-amber-600">{d.unmarked}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-muted-foreground">Presence</td>
                          {dayBreakdown.map(d => (
                            <td key={d.date} className="text-center px-2 py-2">
                              {d.total > 0 ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="font-bold text-xs">{d.presenceRate}%</span>
                                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${d.presenceRate >= 75 ? 'bg-green-500' : d.presenceRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${d.presenceRate}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}