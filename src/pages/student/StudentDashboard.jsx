import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshWrapper from '@/components/mobile/PullToRefreshWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, ClipboardList, Loader2, TrendingUp, CheckCircle2, Clock, Award } from 'lucide-react';
import DashboardCalendar from '@/components/calendar/DashboardCalendar';
import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

function getLetterGrade(pct) {
  if (pct >= 90) return { label: 'A', color: 'text-emerald-600' };
  if (pct >= 80) return { label: 'B', color: 'text-blue-600' };
  if (pct >= 70) return { label: 'C', color: 'text-amber-600' };
  if (pct >= 60) return { label: 'D', color: 'text-orange-600' };
  return { label: 'F', color: 'text-red-600' };
}

function getBarColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#3b82f6';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function StudentDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [timetableCount, setTimetableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [tt, asgn, grd, subs] = await Promise.all([
      base44.entities.TimetableEntry.filter({ schoolId: user.schoolId, classId: user.classId }),
      base44.entities.Assignment.filter({ schoolId: user.schoolId, classId: user.classId, isPublished: true }),
      base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }),
      base44.entities.Submission.filter({ schoolId: user.schoolId, studentId: user.id }),
    ]);
    setTimetableCount((tt || []).length);
    setAssignments(asgn || []);
    setGrades(grd || []);
    setSubmissions(subs || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const ptr = usePullToRefresh(load);

  // Overall average
  const overallAvg = useMemo(() => {
    if (!grades.length) return null;
    const valid = grades.filter(g => g.score != null && g.maxScore > 0);
    if (!valid.length) return null;
    const total = valid.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0);
    return Math.round(total / valid.length);
  }, [grades]);

  // Per-subject averages for chart
  const subjectData = useMemo(() => {
    const map = {};
    grades.filter(g => g.subjectName && g.score != null && g.maxScore > 0).forEach(g => {
      if (!map[g.subjectName]) map[g.subjectName] = { sum: 0, count: 0 };
      map[g.subjectName].sum += (g.score / g.maxScore) * 100;
      map[g.subjectName].count += 1;
    });
    return Object.entries(map).map(([name, d]) => ({
      subject: name.length > 10 ? name.slice(0, 10) + '…' : name,
      fullName: name,
      avg: Math.round(d.sum / d.count),
    })).sort((a, b) => b.avg - a.avg);
  }, [grades]);

  // Assignment completion
  const submittedIds = useMemo(() => new Set(submissions.map(s => s.assignmentId)), [submissions]);
  const completedCount = assignments.filter(a => submittedIds.has(a.id)).length;
  const pendingCount = assignments.length - completedCount;
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = assignments.filter(a => !submittedIds.has(a.id) && a.dueDate && a.dueDate < today).length;

  // Recent pending assignments (next 5)
  const pendingList = assignments
    .filter(a => !submittedIds.has(a.id))
    .sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1)
    .slice(0, 5);

  const letterGrade = overallAvg != null ? getLetterGrade(overallAvg) : null;

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <PullToRefreshWrapper {...ptr}>
    <div className="space-y-6 p-4 md:p-6 md:pr-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mt-2">
        <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>
        <p className="text-muted-foreground">{user?.className || user?.schoolName}</p>
      </div>

      {/* Top stat cards - responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-fr">
        {/* Overall Grade */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Overall Average</p>
              {overallAvg != null ? (
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl md:text-3xl font-bold">{overallAvg}%</p>
                  <span className={`text-base md:text-lg font-bold ${letterGrade?.color}`}>{letterGrade?.label}</span>
                </div>
              ) : (
                <p className="text-2xl font-bold mt-2 text-muted-foreground">N/A</p>
              )}
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600 mt-2">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Assignments */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{completedCount}</p>
              <p className="text-xs text-muted-foreground">of {assignments.length}</p>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 mt-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{pendingCount}</p>
              {overdueCount > 0 && <p className="text-xs text-red-500 font-medium">{overdueCount} overdue</p>}
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 mt-2">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Timetable Slots */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Timetable Slots</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{timetableCount}</p>
            </div>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 mt-2">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <div className="overflow-x-hidden">
        <DashboardCalendar />
      </div>

      {/* Charts + Pending list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Subject Performance Bar Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Performance by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <ClipboardList className="w-8 h-8 opacity-30" />
                <p>No grade data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value, _, props) => [`${value}%`, props.payload.fullName]}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {subjectData.map((entry, idx) => (
                      <Cell key={idx} fill={getBarColor(entry.avg)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {[['#22c55e', '80–100%'], ['#3b82f6', '60–79%'], ['#f59e0b', '40–59%'], ['#ef4444', '< 40%']].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <CheckCircle2 className="w-8 h-8 opacity-30" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map(a => {
                  const isOverdue = a.dueDate && a.dueDate < today;
                  return (
                    <div key={a.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.subjectName}</p>
                      </div>
                      <div className="shrink-0">
                        {a.dueDate ? (
                          <Badge variant="outline" className={`text-xs ${isOverdue ? 'border-red-400 text-red-600' : 'text-muted-foreground'}`}>
                            {isOverdue ? '⚠ ' : ''}{a.dueDate}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No due date</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Assignment completion bar */}
            {assignments.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Completion rate</span>
                  <span>{Math.round((completedCount / assignments.length) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.round((completedCount / assignments.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 pt-6 border-t">
        <DeleteAccountDialog />
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}