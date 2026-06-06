import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, TrendingUp, Activity, Eye, EyeOff, SlidersHorizontal, X } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PASS_MARK = 40;
const WIDGET_KEYS = ['passRateTrend', 'subjectScores', 'topStudents', 'attendanceRate', 'assignmentCompletion', 'gradeDistribution', 'underperforming'];
const WIDGET_LABELS = {
  passRateTrend: 'Pass Rate Trend',
  subjectScores: 'Subject Scores',
  topStudents: 'Top Performing Students',
  attendanceRate: 'Attendance Rate',
  assignmentCompletion: 'Assignment Completion',
  gradeDistribution: 'Grade Distribution',
  underperforming: 'Underperforming Students',
};

function dateRangeForFilter(filter, customFrom, customTo) {
  const now = new Date();
  if (filter === 'week') return { from: startOfWeek(now), to: now };
  if (filter === 'month') return { from: startOfMonth(now), to: now };
  if (filter === 'term') return { from: subMonths(now, 3), to: now };
  if (filter === 'session') return { from: subMonths(now, 9), to: now };
  if (filter === 'custom' && customFrom && customTo) return { from: new Date(customFrom), to: new Date(customTo) };
  return null; // 'all'
}

export default function AdminDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [showCustomize, setShowCustomize] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(() => Object.fromEntries(WIDGET_KEYS.map(k => [k, true])));

  // Data
  const [allStudents, setAllStudents] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  // Computed
  const [stats, setStats] = useState({ students: 0, avgScore: 0, passRate: 0, activeClasses: 0 });
  const [subjectScores, setSubjectScores] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [underperforming, setUnderperforming] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [attendanceStat, setAttendanceStat] = useState(0);
  const [assignmentCompletion, setAssignmentCompletion] = useState(0);

  const computeAll = useCallback((students, grades, classes, subjects, teachers, attendance, assignments, submissions, dFilter, cFilter, tFilter, cFrom, cTo) => {
    const dateRange = dateRangeForFilter(dFilter, cFrom, cTo);

    // Filter grades
    let fg = grades;
    if (cFilter !== 'all') fg = fg.filter(g => g.classId === cFilter);
    if (tFilter !== 'all') fg = fg.filter(g => g.teacherId === tFilter);
    if (dateRange) fg = fg.filter(g => {
      const d = g.lastUpdatedAt ? new Date(g.lastUpdatedAt) : null;
      return d && d >= dateRange.from && d <= dateRange.to;
    });

    // Filter students
    let fs = students;
    if (cFilter !== 'all') fs = fs.filter(s => s.classId === cFilter);

    // Filter classes
    let fc = classes;
    if (cFilter !== 'all') fc = fc.filter(c => c.id === cFilter);

    const gradeScores = fg.map(g => (g.score / (g.maxScore || 100)) * 100);
    const avgScore = gradeScores.length > 0 ? gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length : 0;
    const passRate = gradeScores.length > 0 ? (gradeScores.filter(s => s >= PASS_MARK).length / gradeScores.length) * 100 : 0;

    setStats({
      students: fs.length,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: parseFloat(passRate.toFixed(1)),
      activeClasses: fc.length,
    });

    // Subject scores
    const subjectMap = {};
    fg.forEach(g => {
      if (!g.subjectId) return;
      const name = g.subjectName || subjects.find(s => s.id === g.subjectId)?.name || 'Unknown';
      if (!subjectMap[g.subjectId]) subjectMap[g.subjectId] = { name, scores: [] };
      subjectMap[g.subjectId].scores.push((g.score / (g.maxScore || 100)) * 100);
    });
    setSubjectScores(Object.values(subjectMap).map(s => ({
      name: s.name.length > 9 ? s.name.slice(0, 9) : s.name,
      score: parseFloat((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1)),
    })).slice(0, 8));

    // Trend
    const now = new Date();
    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      let mGrades = grades;
      if (cFilter !== 'all') mGrades = mGrades.filter(g => g.classId === cFilter);
      if (tFilter !== 'all') mGrades = mGrades.filter(g => g.teacherId === tFilter);
      const monthGrades = mGrades.filter(g => {
        const at = g.lastUpdatedAt ? new Date(g.lastUpdatedAt) : null;
        return at && at >= start && at <= end;
      });
      const ms = monthGrades.map(g => (g.score / (g.maxScore || 100)) * 100);
      return { month: format(d, 'MMM'), rate: ms.length > 0 ? parseFloat(((ms.filter(s => s >= PASS_MARK).length / ms.length) * 100).toFixed(1)) : null };
    });
    setTrendData(trend);

    // Top students
    const studentScoreMap = {};
    fg.forEach(g => {
      if (!g.studentId) return;
      const name = g.studentName || students.find(s => s.id === g.studentId)?.fullName || 'Unknown';
      if (!studentScoreMap[g.studentId]) studentScoreMap[g.studentId] = { name, scores: [] };
      studentScoreMap[g.studentId].scores.push((g.score / (g.maxScore || 100)) * 100);
    });
    const sorted = Object.entries(studentScoreMap)
      .map(([id, v]) => ({ id, name: v.name, avg: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)) }))
      .sort((a, b) => b.avg - a.avg);
    setTopStudents(sorted.slice(0, 4));
    setUnderperforming(sorted.filter(s => s.avg < PASS_MARK).slice(0, 5));

    // Grade distribution
    const dist = [
      { label: 'A (80-100)', count: gradeScores.filter(s => s >= 80).length, color: '#22c55e' },
      { label: 'B (65-79)', count: gradeScores.filter(s => s >= 65 && s < 80).length, color: '#6366f1' },
      { label: 'C (50-64)', count: gradeScores.filter(s => s >= 50 && s < 65).length, color: '#f59e0b' },
      { label: 'D (40-49)', count: gradeScores.filter(s => s >= 40 && s < 50).length, color: '#f97316' },
      { label: 'F (<40)', count: gradeScores.filter(s => s < 40).length, color: '#ef4444' },
    ];
    setGradeDistribution(dist);

    // Attendance
    let fa = attendance;
    if (cFilter !== 'all') fa = fa.filter(a => a.classId === cFilter);
    if (dateRange) fa = fa.filter(a => { const d = a.date ? new Date(a.date) : null; return d && d >= dateRange.from && d <= dateRange.to; });
    const presentCount = fa.filter(a => a.status === 'present').length;
    setAttendanceStat(fa.length > 0 ? parseFloat(((presentCount / fa.length) * 100).toFixed(1)) : 0);

    // Assignment completion
    let fAssign = assignments;
    if (cFilter !== 'all') fAssign = fAssign.filter(a => a.classId === cFilter);
    if (tFilter !== 'all') fAssign = fAssign.filter(a => a.teacherId === tFilter);
    const totalExpected = fAssign.length * (cFilter !== 'all' ? (fs.length || 1) : (students.filter(s => fAssign.some(a => a.classId === s.classId)).length || 1));
    const actualSubs = submissions.filter(sub => fAssign.some(a => a.id === sub.assignmentId)).length;
    setAssignmentCompletion(totalExpected > 0 ? parseFloat(Math.min((actualSubs / totalExpected) * 100, 100).toFixed(1)) : 0);

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      const [students, grades, classes, subjects, teachers, attendance, assignments, submissions] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }),
        base44.entities.Grade.filter({ schoolId }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
        base44.entities.Attendance.filter({ schoolId }),
        base44.entities.Assignment.filter({ schoolId }),
        base44.entities.Submission.filter({ schoolId }),
      ]);
      setAllStudents(students || []);
      setAllGrades(grades || []);
      setAllClasses(classes || []);
      setAllSubjects(subjects || []);
      setAllTeachers(teachers || []);
      setAllAttendance(attendance || []);
      setAllAssignments(assignments || []);
      setAllSubmissions(submissions || []);
      computeAll(students || [], grades || [], classes || [], subjects || [], teachers || [], attendance || [], assignments || [], submissions || [], 'all', 'all', 'all', '', '');
    }
    load();

    const unsubGrade = base44.entities.Grade.subscribe(() => {
      base44.entities.Grade.filter({ schoolId }).then(grades => {
        setAllGrades(grades || []);
      });
    });
    const unsubAttendance = base44.entities.Attendance.subscribe(() => {
      base44.entities.Attendance.filter({ schoolId }).then(att => setAllAttendance(att || []));
    });
    const unsubSubmission = base44.entities.Submission.subscribe(() => {
      base44.entities.Submission.filter({ schoolId }).then(subs => setAllSubmissions(subs || []));
    });
    return () => { unsubGrade(); unsubAttendance(); unsubSubmission(); };
  }, [schoolId]);

  // Re-compute whenever filters or raw data change
  useEffect(() => {
    if (!loading && allClasses.length >= 0) {
      computeAll(allStudents, allGrades, allClasses, allSubjects, allTeachers, allAttendance, allAssignments, allSubmissions, dateFilter, classFilter, teacherFilter, customFrom, customTo);
    }
  }, [dateFilter, classFilter, teacherFilter, customFrom, customTo, allGrades, allAttendance, allSubmissions]);

  const toggleWidget = k => setVisibleWidgets(prev => ({ ...prev, [k]: !prev[k] }));
  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-full bg-[#12152a] text-white p-4 md:p-6 rounded-xl space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Academic Performance Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            {user?.schoolName || 'Your School'} · {lastUpdated ? `Updated ${format(lastUpdated, 'h:mm:ss a')}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-[#1e2340] rounded-full px-3 py-1.5 text-sm text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Live
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white bg-[#1e2340] hover:bg-[#252b48] rounded-full"
            onClick={() => setShowCustomize(v => !v)}>
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Customize
          </Button>
        </div>
      </div>

      {/* Widget Customize Panel */}
      {showCustomize && (
        <div className="bg-[#1e2340] rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3 text-slate-300">Show / Hide Widgets</p>
          <div className="flex flex-wrap gap-2">
            {WIDGET_KEYS.map(k => (
              <button key={k} onClick={() => toggleWidget(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${visibleWidgets[k] ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-slate-600 text-slate-400'}`}>
                {visibleWidgets[k] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {WIDGET_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#1e2340] rounded-2xl p-4">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="bg-[#12152a] border-slate-700 text-white text-sm h-9">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e2340] border-slate-700 text-white">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="term">This Term</SelectItem>
              <SelectItem value="session">This Session</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="bg-[#12152a] border-slate-700 text-white text-sm h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e2340] border-slate-700 text-white">
              <SelectItem value="all">All Classes</SelectItem>
              {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="bg-[#12152a] border-slate-700 text-white text-sm h-9">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e2340] border-slate-700 text-white">
              <SelectItem value="all">All Teachers</SelectItem>
              {allTeachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          {(classFilter !== 'all' || teacherFilter !== 'all' || dateFilter !== 'all') && (
            <button onClick={() => { setClassFilter('all'); setTeacherFilter('all'); setDateFilter('all'); setCustomFrom(''); setCustomTo(''); }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white text-sm transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">From</p>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="w-full bg-[#12152a] border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">To</p>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="w-full bg-[#12152a] border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: stats.students, icon: Users, sub: classFilter !== 'all' ? allClasses.find(c => c.id === classFilter)?.className : 'All classes' },
          { label: 'Avg. Score', value: `${stats.avgScore}%`, icon: TrendingUp, sub: 'Across all subjects' },
          { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Activity, sub: `≥${PASS_MARK}% pass mark` },
          { label: 'Active Classes', value: stats.activeClasses, icon: BookOpen, sub: 'Classes with students' },
        ].map(card => (
          <div key={card.label} className="bg-[#1e2340] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <card.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-emerald-400 text-xs font-semibold">● Live</span>
            </div>
            <p className="text-3xl font-bold">{loading ? <span className="w-16 h-8 bg-slate-700 rounded animate-pulse inline-block" /> : card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
            <p className="text-slate-500 text-xs mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Extra KPIs — Attendance & Assignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleWidgets.attendanceRate && (
          <div className="bg-[#1e2340] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-emerald-400">{attendanceStat}%</span>
            </div>
            <div>
              <p className="font-semibold">Attendance Rate</p>
              <p className="text-slate-400 text-sm">Present records vs total</p>
            </div>
          </div>
        )}
        {visibleWidgets.assignmentCompletion && (
          <div className="bg-[#1e2340] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-indigo-400">{assignmentCompletion}%</span>
            </div>
            <div>
              <p className="font-semibold">Assignment Completion</p>
              <p className="text-slate-400 text-sm">Submissions vs expected</p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {visibleWidgets.passRateTrend && (
          <div className="lg:col-span-3 bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-1">Pass Rate Trend</p>
            <p className="text-slate-400 text-xs mb-4">Monthly pass rate across all classes</p>
            {trendData.some(d => d.rate !== null) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4a" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#6366f1' }} formatter={v => v !== null ? [`${v}%`, 'Pass Rate'] : ['No data', '']} />
                  <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No grade data for this period</div>}
          </div>
        )}
        {visibleWidgets.subjectScores && (
          <div className="lg:col-span-2 bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-1">Subject Scores</p>
            <p className="text-slate-400 text-xs mb-4">Average score by subject</p>
            {subjectScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subjectScores} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#6366f1' }} formatter={v => [`${v}%`, 'Avg Score']} />
                  <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No data</div>}
          </div>
        )}
      </div>

      {/* Grade Distribution */}
      {visibleWidgets.gradeDistribution && (
        <div className="bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-1">Grade Distribution</p>
          <p className="text-slate-400 text-xs mb-4">Number of grades in each band</p>
          {gradeDistribution.some(d => d.count > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={gradeDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                    {gradeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center gap-2">
                {gradeDistribution.map(d => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-sm text-slate-300 flex-1">{d.label}</span>
                    <span className="font-semibold text-sm">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No grade data for this period</div>}
        </div>
      )}

      {/* Bottom Row: Top Students + Underperforming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.topStudents && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-4">Top Performing Students</p>
            {topStudents.length > 0 ? (
              <div className="space-y-3">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: avatarColors[i % avatarColors.length] }}>{i + 1}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{s.name}</p></div>
                    <span className="text-emerald-400 text-sm font-semibold shrink-0">↑ {s.avg}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm text-center py-4">No grade data yet</p>}
          </div>
        )}
        {visibleWidgets.underperforming && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-4">Underperforming Students <span className="text-xs text-slate-400 font-normal">(&lt;{PASS_MARK}%)</span></p>
            {underperforming.length > 0 ? (
              <div className="space-y-3">
                {underperforming.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{s.name}</p></div>
                    <span className="text-red-400 text-sm font-semibold shrink-0">↓ {s.avg}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-emerald-400 text-sm text-center py-4">No underperforming students 🎉</p>}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Students', to: '/school-admin/students' },
          { label: 'Teachers', to: '/school-admin/teachers' },
          { label: 'Classes', to: '/school-admin/classes' },
          { label: 'Grades', to: '/school-admin/grade-weighting' },
          { label: 'Timetable', to: '/school-admin/timetable' },
          { label: 'Reports', to: '/school-admin/report-cards' },
        ].map(l => (
          <Link key={l.to} to={l.to}>
            <div className="bg-[#1e2340] hover:bg-[#252b48] transition-colors rounded-xl px-3 py-2.5 text-center text-sm text-slate-300 hover:text-white cursor-pointer">{l.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}