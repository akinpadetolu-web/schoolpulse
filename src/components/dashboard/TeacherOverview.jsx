import React, { useMemo } from 'react';
import { Users, TrendingUp, Activity, BookOpen, CheckSquare, Star, Award } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import ChartWidget from './ChartWidget';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';

const PASS_MARK = 40;
function pct(num, denom) { return denom > 0 ? parseFloat(((num / denom) * 100).toFixed(1)) : 0; }
function avg(arr) { return arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0; }

export default function TeacherOverview({ teachers, students, grades, classes, assignments, submissions, attendance, staffAttendance, gradeCategories = [], visibleWidgets }) {
  const data = useMemo(() => {
    // Per-teacher metrics
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id, name: t.fullName, subjects: t.assignedSubjects || [], classes: t.assignedClasses || [],
        scores: [], studentIds: new Set(), assignmentsSet: 0, assignmentsGraded: 0,
        attendanceTotal: 0, attendancePresent: 0,
      };
    });

    // Track studentIds per teacher
    grades.forEach(g => {
      if (!g.teacherId || !teacherMap[g.teacherId]) return;
      if (g.studentId) teacherMap[g.teacherId].studentIds.add(g.studentId);
    });

    // Compute weighted score per teacher-student-subject, then push to teacher's scores
    const teacherSubjectGroups = {};
    grades.forEach(g => {
      if (!g.teacherId || !teacherMap[g.teacherId] || !g.studentId || !g.subjectId) return;
      const key = `${g.teacherId}__${g.studentId}__${g.subjectId}`;
      if (!teacherSubjectGroups[key]) teacherSubjectGroups[key] = [];
      teacherSubjectGroups[key].push(g);
    });
    Object.entries(teacherSubjectGroups).forEach(([key, groupGrades]) => {
      const [teacherId, studentId, subjectId] = key.split('__');
      const classId = groupGrades[0]?.classId;
      const classCats = gradeCategories.filter(c => (!c.classId || c.classId === classId) && c.subjectId === subjectId);
      const result = getSubjectFinalGrade(groupGrades, classCats);
      teacherMap[teacherId].scores.push(result.overall ?? 0);
    });

    assignments.forEach(a => {
      if (!a.teacherId || !teacherMap[a.teacherId]) return;
      teacherMap[a.teacherId].assignmentsSet++;
    });

    submissions.forEach(sub => {
      const assign = assignments.find(a => a.id === sub.assignmentId);
      if (assign?.teacherId && teacherMap[assign.teacherId]) {
        teacherMap[assign.teacherId].assignmentsGraded += sub.isGraded ? 1 : 0;
      }
    });

    (staffAttendance || []).forEach(a => {
      const t = teacherMap[a.staffId];
      if (!t) return;
      t.attendanceTotal++;
      if (a.status === 'present' || a.status === 'on_time') t.attendancePresent++;
    });

    const teacherList = Object.values(teacherMap).map(t => {
      const avgScore = avg(t.scores);
      const passRate = t.scores.length > 0 ? pct(t.scores.filter(s => s >= PASS_MARK).length, t.scores.length) : 0;
      const attRate = t.attendanceTotal > 0 ? pct(t.attendancePresent, t.attendanceTotal) : 0;
      const gradeRatio = (avgScore / 100) * 0.5 + (passRate / 100) * 0.5;
      const rating = gradeRatio >= 0.8 ? 'Excellent' : gradeRatio >= 0.6 ? 'Good' : gradeRatio >= 0.4 ? 'Average' : 'Needs Improvement';
      return { ...t, avgScore, passRate, attRate, totalStudents: t.studentIds.size, rating, gradeRatio };
    });

    const sortedByPassRate = [...teacherList].sort((a, b) => b.passRate - a.passRate);
    const mostActive = [...teacherList].sort((a, b) => b.assignmentsSet - a.assignmentsSet)[0];

    const overallTeacherAvg = avg(teacherList.map(t => t.avgScore).filter(x => x > 0));

    // Chart data
    const performanceRanking = sortedByPassRate.slice(0, 8).map(t => ({
      name: t.name.split(' ')[0],
      passRate: t.passRate,
      avgScore: t.avgScore,
    }));

    const workloadData = teacherList.filter(t => t.totalStudents > 0).map(t => ({
      name: t.name.split(' ')[0],
      students: t.totalStudents,
      value: t.totalStudents,
    })).sort((a, b) => b.students - a.students).slice(0, 8);

    const assignData = teacherList.filter(t => t.assignmentsSet > 0).map(t => ({
      name: t.name.split(' ')[0],
      set: t.assignmentsSet,
      graded: t.assignmentsGraded,
    })).slice(0, 8);

    const now = new Date();
    const attTrend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const monthAtt = (staffAttendance || []).filter(a => { const at = a.date ? new Date(a.date) : null; return at && at >= startOfMonth(d) && at <= endOfMonth(d); });
      return { month: format(d, 'MMM'), rate: monthAtt.length > 0 ? pct(monthAtt.filter(a => a.status === 'present').length, monthAtt.length) : 0 };
    });

    const subjectCoverage = {};
    teachers.forEach(t => {
      (t.assignedSubjects || []).forEach(sid => {
        subjectCoverage[sid] = (subjectCoverage[sid] || 0) + 1;
      });
    });

    return { teacherList, sortedByPassRate, mostActive, overallTeacherAvg, performanceRanking, workloadData, assignData, attTrend };
  }, [teachers, students, grades, classes, assignments, submissions, attendance, staffAttendance, gradeCategories]);

  const KPI_CARDS = [
    { label: 'Total Teachers', value: teachers.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    { label: 'Avg Teacher Score', value: `${data.overallTeacherAvg}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Classes Taught', value: classes.length, icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Assignments Set', value: assignments.length, icon: CheckSquare, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Avg Pass Rate', value: `${avg(data.teacherList.map(t => t.passRate))}%`, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Assignments Graded', value: data.teacherList.reduce((a, t) => a + t.assignmentsGraded, 0), icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    { label: 'Most Active', value: data.mostActive?.name?.split(' ')[0] || 'N/A', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_CARDS.map(card => (
          <div key={card.label} className="bg-[#1e2340] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.teacherRanking && (
          <ChartWidget id="teacherRanking" title="Teacher Performance Ranking" subtitle="Ranked by student pass rate"
            data={data.performanceRanking} dataKeys={['passRate', 'avgScore']} defaultType="bar"
            allowedTypes={['bar', 'bar_h', 'line', 'radar', 'stacked_bar']} height={200} />
        )}
        {visibleWidgets.teacherWorkload && (
          <ChartWidget id="teacherWorkload" title="Teacher Workload" subtitle="Number of students per teacher"
            data={data.workloadData} dataKeys={['value']} defaultType="bar_h"
            allowedTypes={['bar', 'bar_h', 'pie', 'donut']} height={200} />
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.assignmentsSetVsGraded && (
          <ChartWidget id="assignmentsSetVsGraded" title="Assignments Set vs Graded" subtitle="Per teacher"
            data={data.assignData} dataKeys={['set', 'graded']} defaultType="stacked_bar"
            allowedTypes={['bar', 'stacked_bar', 'line', 'bar_h']} height={200} />
        )}
        {visibleWidgets.teacherAttTrend && (
          <ChartWidget id="teacherAttTrend" title="Staff Attendance Trend" subtitle="Monthly attendance rate"
            data={data.attTrend} dataKeys={['rate']} defaultType="area"
            allowedTypes={['line', 'area', 'bar']} height={200} />
        )}
      </div>

      {/* Teacher Performance Table */}
      {visibleWidgets.teacherTable && (
        <div className="bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-3">Teacher Performance Table</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left pb-2 pr-3">Teacher</th>
                  <th className="text-right pb-2 pr-3">Students</th>
                  <th className="text-right pb-2 pr-3">Avg Score</th>
                  <th className="text-right pb-2 pr-3">Pass Rate</th>
                  <th className="text-right pb-2 pr-3">Assign Set</th>
                  <th className="text-right pb-2 pr-3">Graded</th>
                  <th className="text-right pb-2 pr-3">Attendance</th>
                  <th className="text-left pb-2">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.sortedByPassRate.map(t => (
                  <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2 pr-3 font-medium truncate max-w-[120px]">{t.name}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{t.totalStudents}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{t.avgScore}%</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={`font-semibold ${t.passRate >= 60 ? 'text-emerald-400' : t.passRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{t.passRate}%</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-300">{t.assignmentsSet}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{t.assignmentsGraded}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{t.attRate > 0 ? `${t.attRate}%` : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.rating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                        t.rating === 'Good' ? 'bg-indigo-500/20 text-indigo-400' :
                        t.rating === 'Average' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{t.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}