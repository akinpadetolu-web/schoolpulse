import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, FileText, ClipboardList, Loader2, TrendingUp, CheckCircle2, Clock, Award, AlertTriangle, Home, Bed } from 'lucide-react';
import DashboardCalendar from '@/components/calendar/DashboardCalendar';
import TermProgressTab from '@/components/student/TermProgressTab';
import GradeTrendChart from '@/components/student/GradeTrendChart';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';
import { getGradeLabel, getBarColor } from '@/lib/gradeMapper';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function StudentDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [gradeCategories, setGradeCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [timetableCount, setTimetableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [letterGrade, setLetterGrade] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [tt, asgn, grd, subs, cats] = await Promise.all([
      base44.entities.TimetableEntry.filter({ schoolId: user.schoolId, classId: user.classId }),
      base44.entities.Assignment.filter({ schoolId: user.schoolId, classId: user.classId, isPublished: true }),
      base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }),
      base44.entities.Submission.filter({ schoolId: user.schoolId, studentId: user.id }),
      base44.entities.GradeCategory.filter({ schoolId: user.schoolId, classId: user.classId }),
    ]);
    setTimetableCount((tt || []).length);
    setAssignments(asgn || []);
    setGrades(grd || []);
    setSubmissions(subs || []);
    setGradeCategories(cats || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Compute weighted overall average: per-subject weighted average, then average across subjects
  const overallAvg = useMemo(() => {
    if (!grades.length) return null;
    const bySubject = {};
    grades.forEach(g => {
      if (!g.subjectId) return;
      if (!bySubject[g.subjectId]) bySubject[g.subjectId] = { grades: [], subjectName: g.subjectName };
      bySubject[g.subjectId].grades.push(g);
    });
    const subjectAvgs = Object.entries(bySubject).map(([subjectId, { grades: subjectGrades }]) => {
      const cats = gradeCategories.filter(c => c.subjectId === subjectId);
      const { overall } = getSubjectFinalGrade(subjectGrades, cats);
      return overall;
    }).filter(v => v != null);
    if (subjectAvgs.length === 0) return null;
    return Math.round(subjectAvgs.reduce((s, v) => s + v, 0) / subjectAvgs.length);
  }, [grades, gradeCategories]);

  useEffect(() => {
    if (overallAvg != null && user?.schoolId) {
      getGradeLabel(overallAvg, user.schoolId).then(setLetterGrade);
    }
  }, [overallAvg, user?.schoolId]);

  const subjectData = useMemo(() => {
    const bySubject = {};
    grades.forEach(g => {
      if (!g.subjectName) return;
      if (!bySubject[g.subjectName]) bySubject[g.subjectName] = { grades: [], subjectId: g.subjectId };
      bySubject[g.subjectName].grades.push(g);
    });
    return Object.entries(bySubject).map(([name, { grades: subjectGrades, subjectId }]) => {
      const cats = gradeCategories.filter(c => c.subjectId === subjectId);
      const { overall } = getSubjectFinalGrade(subjectGrades, cats);
      return {
        subject: name.length > 10 ? name.slice(0, 10) + '…' : name,
        fullName: name,
        avg: overall != null ? Math.round(overall) : 0,
      };
    }).filter(d => d.avg > 0).sort((a, b) => b.avg - a.avg);
  }, [grades, gradeCategories]);

  const submittedIds = useMemo(() => new Set(submissions.map(s => s.assignmentId)), [submissions]);
  const completedCount = assignments.filter(a => submittedIds.has(a.id)).length;
  const pendingCount = assignments.length - completedCount;
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = assignments.filter(a => !submittedIds.has(a.id) && a.dueDate && a.dueDate < today).length;

  const pendingList = assignments
    .filter(a => !submittedIds.has(a.id))
    .sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1)
    .slice(0, 5);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-3 p-3 md:space-y-6 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mt-1 md:mt-2">
          <h1 className="text-xl md:text-2xl font-bold">Welcome, {user?.fullName}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{user?.className || user?.schoolName}</p>
        </div>

        {user?.hostelName && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.hostelName}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {user.hostelRoomNumber && <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" /> Room {user.hostelRoomNumber}</span>}
                {user.hostelBedNumber && <span>Bed {user.hostelBedNumber}</span>}
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="mb-2 md:mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">My Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 auto-rows-fr">
               <Card className="border-0 shadow-sm">
                 <CardContent className="p-2 md:p-5 flex flex-col items-start justify-between h-full min-h-[100px] md:min-h-[160px]">
                  <div className="w-full">
                     <p className="text-xs md:text-sm text-muted-foreground">Overall Average</p>
                     {overallAvg != null ? (
                       <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                         <p className="text-lg md:text-3xl font-bold">{overallAvg}%</p>
                         <span className={`text-xs md:text-lg font-bold ${letterGrade?.color}`}>{letterGrade?.label}</span>
                      </div>
                    ) : (
                      <p className="text-lg md:text-2xl font-bold mt-1 text-muted-foreground">N/A</p>
                      )}
                      </div>
                      <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600 mt-1 md:mt-2">
                      <Award className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
                  <div className="w-full">
                     <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                     <p className="text-lg md:text-3xl font-bold mt-1">{completedCount}</p>
                     <p className="text-xs text-muted-foreground">of {assignments.length}</p>
                   </div>
                   <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 mt-1 md:mt-2">
                     <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
                  <div className="w-full">
                     <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                     <p className="text-lg md:text-3xl font-bold mt-1">{pendingCount}</p>
                     {overdueCount > 0 && <p className="text-xs text-red-500 font-medium">{overdueCount} overdue</p>}
                   </div>
                   <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 mt-1 md:mt-2">
                     <Clock className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-5 flex flex-col items-start justify-between h-full min-h-[160px]">
                  <div className="w-full">
                     <p className="text-xs md:text-sm text-muted-foreground">Timetable Slots</p>
                     <p className="text-lg md:text-3xl font-bold mt-1">{timetableCount}</p>
                   </div>
                   <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 mt-1 md:mt-2">
                     <Calendar className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="w-full hidden md:block">
               <DashboardCalendar />
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {isOverdue && (
                                <Badge className="text-xs bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Late
                                </Badge>
                              )}
                              {a.dueDate ? (
                                <Badge variant="outline" className={`text-xs ${isOverdue ? 'border-red-300 text-red-500' : 'text-muted-foreground'}`}>
                                  {a.dueDate}
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

            <GradeTrendChart grades={grades} gradeCategories={gradeCategories} />

            </TabsContent>

          <TabsContent value="progress">
            <TermProgressTab user={user} grades={grades} />
          </TabsContent>
        </Tabs>
      </div>
  );
}