import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  present:  { label: 'Present',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  absent:   { label: 'Absent',   color: 'bg-red-100 text-red-700',         icon: XCircle,      iconColor: 'text-red-500' },
  late:     { label: 'Late',     color: 'bg-amber-100 text-amber-700',     icon: Clock,        iconColor: 'text-amber-500' },
  excused:  { label: 'Excused',  color: 'bg-blue-100 text-blue-700',       icon: MinusCircle,  iconColor: 'text-blue-500' },
};

function getWeekLabel(weekStart) {
  const now = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (weekStart.getTime() === now.getTime()) return 'This Week';
  const prev = startOfWeek(new Date(now.getTime() - 7 * 86400000), { weekStartsOn: 1 });
  if (weekStart.getTime() === prev.getTime()) return 'Last Week';
  return `Week of ${format(weekStart, 'MMM d')}`;
}

function ChildAttendance({ child, records }) {
  const total = records.length;
  const presentCount = records.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : null;

  // Group by week
  const byWeek = {};
  records.forEach(record => {
    if (!record.date) return;
    const date = parseISO(record.date);
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const key = ws.toISOString();
    if (!byWeek[key]) byWeek[key] = { weekStart: ws, records: [] };
    byWeek[key].records.push(record);
  });
  const weeks = Object.values(byWeek).sort((a, b) => b.weekStart - a.weekStart);

  // This week
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekDays = eachDayOfInterval({ start: thisWeekStart, end: endOfWeek(thisWeekStart, { weekStartsOn: 1 }) })
    .filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  const thisWeekRecords = records.filter(a => {
    if (!a.date) return false;
    const d = parseISO(a.date);
    return d >= thisWeekStart && d <= endOfWeek(thisWeekStart, { weekStartsOn: 1 });
  });

  return (
    <div className="space-y-4">
      {/* Overall % banner */}
      {attendancePct !== null && (
        <div className={`rounded-xl p-4 flex items-center justify-between ${attendancePct >= 80 ? 'bg-emerald-50' : attendancePct >= 60 ? 'bg-amber-50' : 'bg-red-50'}`}>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overall Attendance Rate</p>
            <p className={`text-3xl font-bold mt-0.5 ${attendancePct >= 80 ? 'text-emerald-700' : attendancePct >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
              {attendancePct}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{presentCount} of {total} days attended</p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold border-4 ${
            attendancePct >= 80 ? 'border-emerald-400 text-emerald-700' : attendancePct >= 60 ? 'border-amber-400 text-amber-700' : 'border-red-400 text-red-700'
          }`}>
            {attendancePct}%
          </div>
        </div>
      )}

      {/* This week */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Week</p>
        <div className="space-y-2">
          {thisWeekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = thisWeekRecords.find(r => r.date === dateStr);
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
            const isFuture = day > new Date();
            const cfg = record ? STATUS_CONFIG[record.status] : null;
            const Icon = cfg?.icon;
            return (
              <div key={dateStr} className={`flex items-center justify-between rounded-lg px-4 py-3 ${isToday ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/40'}`}>
                <div className="flex items-center gap-3">
                  {Icon ? <Icon className={`w-4 h-4 ${cfg.iconColor}`} /> : <MinusCircle className="w-4 h-4 text-muted-foreground/40" />}
                  <div>
                    <p className="font-medium text-sm">{format(day, 'EEEE')}</p>
                    <p className="text-xs text-muted-foreground">{format(day, 'MMM d')}</p>
                  </div>
                </div>
                {record ? (
                  <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{isFuture ? '—' : 'Not recorded'}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {weeks.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History</p>
          {weeks.map(({ weekStart, weekRecords: wr, records: wRecs }) => {
            const recs = wRecs || wr;
            const wPresent = (recs || []).filter(r => r.status === 'present' || r.status === 'late').length;
            return (
              <div key={weekStart.toISOString()} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{getWeekLabel(weekStart)}</p>
                  <span className="text-xs text-muted-foreground">{wPresent}/{(recs || []).length} days</span>
                </div>
                {(recs || [])
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(record => {
                    const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.absent;
                    const Icon = cfg.icon;
                    return (
                      <div key={record.id} className="flex items-center justify-between rounded-md px-3 py-2 bg-secondary/40">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                          <p className="text-sm">{record.date ? format(parseISO(record.date), 'EEEE, MMM d') : '—'}</p>
                        </div>
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet.</p>
      )}
    </div>
  );
}

export default function ParentAttendance() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();

    const unsub = base44.entities.Attendance.subscribe((event) => {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.includes(event.data?.studentId)) load();
    });
    return () => unsub();
  }, [user?.id]);

  async function load() {
    try {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.length === 0) { setLoading(false); return; }

      const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' });
      const linked = (allStudents || []).filter(s => linkedIds.includes(s.id));
      setChildren(linked);

      const records = await Promise.all(
        linkedIds.map(id => base44.entities.Attendance.filter({ schoolId: user.schoolId, studentId: id }).catch(() => []))
      );
      setAttendance(records.flat().filter(Boolean));
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (children.length === 0) return <div className="text-center text-muted-foreground py-12">No linked children found.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {children.map(child => (
        <Card key={child.id} className="border-0 shadow-sm">
          {children.length > 1 && (
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{child.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">{child.className || 'No class assigned'}</p>
            </CardHeader>
          )}
          <CardContent className={children.length > 1 ? 'pt-0' : 'pt-4'}>
            <ChildAttendance
              child={child}
              records={attendance.filter(a => a.studentId === child.id)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}