import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, TrendingUp, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function AdminDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [stats, setStats] = useState({ students: 0, avgScore: 0, passRate: 0, activeClasses: 0 });
  const [subjectScores, setSubjectScores] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  // Store raw data so subscriptions can trigger recompute without re-fetching everything
  const rawRef = useRef({ students: [], grades: [], classes: [], subjects: [] });

  const computeStats = useCallback((students, grades, classes, subjects) => {
    rawRef.current = { students, grades, classes, subjects };

    const passMark = 40;
    const totalStudents = students.length;
    const activeClasses = classes.length;

    const gradeScores = grades.map(g => (g.score / (g.maxScore || 100)) * 100);
    const avgScore = gradeScores.length > 0
      ? gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length
      : 0;
    const passRate = gradeScores.length > 0
      ? (gradeScores.filter(s => s >= passMark).length / gradeScores.length) * 100
      : 0;

    setStats({
      students: totalStudents,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: parseFloat(passRate.toFixed(1)),
      activeClasses,
    });

    // Subject average scores
    const subjectMap = {};
    grades.forEach(g => {
      if (!g.subjectId) return;
      const name = g.subjectName || subjects.find(s => s.id === g.subjectId)?.name || 'Unknown';
      if (!subjectMap[g.subjectId]) subjectMap[g.subjectId] = { name, scores: [] };
      subjectMap[g.subjectId].scores.push((g.score / (g.maxScore || 100)) * 100);
    });
    const subjectData = Object.values(subjectMap).map(s => ({
      name: s.name.length > 8 ? s.name.slice(0, 8) : s.name,
      score: parseFloat((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1)),
    })).slice(0, 7);
    setSubjectScores(subjectData);

    // Pass rate trend — last 6 months
    const now = new Date();
    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthGrades = grades.filter(g => {
        const at = g.lastUpdatedAt ? new Date(g.lastUpdatedAt) : null;
        return at && at >= start && at <= end;
      });
      const monthScores = monthGrades.map(g => (g.score / (g.maxScore || 100)) * 100);
      const rate = monthScores.length > 0
        ? parseFloat(((monthScores.filter(s => s >= passMark).length / monthScores.length) * 100).toFixed(1))
        : null;
      return { month: format(d, 'MMM'), rate };
    });
    setTrendData(trend);

    // Top students by average grade score
    const studentScoreMap = {};
    grades.forEach(g => {
      if (!g.studentId) return;
      const name = g.studentName || students.find(s => s.id === g.studentId)?.fullName || 'Unknown';
      if (!studentScoreMap[g.studentId]) studentScoreMap[g.studentId] = { name, scores: [] };
      studentScoreMap[g.studentId].scores.push((g.score / (g.maxScore || 100)) * 100);
    });
    const top = Object.entries(studentScoreMap)
      .map(([id, v]) => ({
        id,
        name: v.name,
        avg: parseFloat((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1)),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);
    setTopStudents(top);

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }

    async function load() {
      const [students, grades, classes, subjects] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }),
        base44.entities.Grade.filter({ schoolId }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
      ]);
      computeStats(students || [], grades || [], classes || [], subjects || []);
    }
    load();

    // Real-time subscriptions
    const unsubGrade = base44.entities.Grade.subscribe(() => {
      base44.entities.Grade.filter({ schoolId }).then(grades => {
        computeStats(rawRef.current.students, grades || [], rawRef.current.classes, rawRef.current.subjects);
      });
    });
    const unsubStudent = base44.entities.SchoolUser.subscribe(() => {
      base44.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }).then(students => {
        computeStats(students || [], rawRef.current.grades, rawRef.current.classes, rawRef.current.subjects);
      });
    });

    return () => { unsubGrade(); unsubStudent(); };
  }, [schoolId, computeStats]);

  const statCards = [
    { label: 'Total Students', value: stats.students, icon: Users, trend: null },
    { label: 'Avg. Score', value: `${stats.avgScore}%`, icon: TrendingUp, trend: null },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Activity, trend: null },
    { label: 'Active Classes', value: stats.activeClasses, icon: BookOpen, trend: null },
  ];

  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-full bg-[#12152a] text-white p-4 md:p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Academic Performance Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            {user?.schoolName || 'Your School'} &nbsp;·&nbsp;
            {lastUpdated ? `Updated ${format(lastUpdated, 'h:mm:ss a')}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1e2340] rounded-full px-3 py-1.5 text-sm text-emerald-400 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <div key={card.label} className="bg-[#1e2340] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <card.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-emerald-400 text-xs font-semibold">
                {loading ? '...' : '● Live'}
              </span>
            </div>
            <p className="text-3xl font-bold">
              {loading ? <span className="w-16 h-8 bg-slate-700 rounded animate-pulse inline-block" /> : card.value}
            </p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Pass Rate Trend */}
        <div className="lg:col-span-3 bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-1">Pass Rate Trend</p>
          <p className="text-slate-400 text-xs mb-4">Monthly pass rate across all classes</p>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4a" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#6366f1' }}
                  formatter={v => v !== null ? [`${v}%`, 'Pass Rate'] : ['No data', 'Pass Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No grade data yet</div>
          )}
        </div>

        {/* Subject Scores */}
        <div className="lg:col-span-2 bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-1">Subject Scores</p>
          <p className="text-slate-400 text-xs mb-4">Average score by subject</p>
          {subjectScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectScores} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#6366f1' }}
                  formatter={v => [`${v}%`, 'Avg Score']}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No grade data yet</div>
          )}
        </div>
      </div>

      {/* Top Performing Students */}
      <div className="bg-[#1e2340] rounded-2xl p-5">
        <p className="font-semibold mb-4">Top Performing Students</p>
        {topStudents.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">{s.name}</p>
                  <p className="text-emerald-400 text-xs font-semibold mt-0.5">↑ {s.avg}%</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-4">No grade data yet</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
        {[
          { label: 'Students', to: '/school-admin/students' },
          { label: 'Teachers', to: '/school-admin/teachers' },
          { label: 'Classes', to: '/school-admin/classes' },
          { label: 'Grades', to: '/school-admin/grade-weighting' },
          { label: 'Timetable', to: '/school-admin/timetable' },
          { label: 'Reports', to: '/school-admin/report-cards' },
        ].map(l => (
          <Link key={l.to} to={l.to}>
            <div className="bg-[#1e2340] hover:bg-[#252b48] transition-colors rounded-xl px-3 py-2.5 text-center text-sm text-slate-300 hover:text-white cursor-pointer">
              {l.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}