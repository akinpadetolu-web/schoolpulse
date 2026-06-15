import React, { useMemo } from 'react';
import { Users, TrendingUp, Activity, BookOpen, CheckSquare, AlertTriangle, Star } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import ChartWidget from './ChartWidget';
import { calculateWeightedScore } from '@/lib/gradeWeightCalculator';

const PASS_MARK = 40;

function pct(num, denom) { return denom > 0 ? parseFloat(((num / denom) * 100).toFixed(1)) : 0; }
function avg(arr) { return arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0; }
function score(g) { return (g.score / (g.maxScore || 100)) * 100; }

const GRADE_DIST = [
  { label: 'A', range: [80, 101], color: '#22c55e' },
  { label: 'B', range: [65, 80], color: '#6366f1' },
  { label: 'C', range: [50, 65], color: '#f59e0b' },
  { label: 'D', range: [40, 50], color: '#f97316' },
  { label: 'F', range: [0, 40], color: '#ef4444' },
];

export default function StudentOverview({ students, grades, allGrades, classes, subjects, attendance, assignments, submissions, gradeCategories = [], visibleWidgets }) {
  // allGrades = unfiltered grades for accurate weighted score calculation
  // grades = filtered grades for display/filtering context
  const gradesForCalc = allGrades || grades;

  const data = useMemo(() => {
    // Build a weighted average per student by computing weighted score per subject then averaging
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.id] = { id: s.id, name: s.fullName || 'Unknown', gender: s.gender || '', classId: s.classId, className: s.className, scores: [], attendancePct: 0 };
    });
    // Also add students seen in grades but not in students list
    grades.forEach(g => {
      if (!g.studentId) return;
      if (!studentMap[g.studentId]) {
        const st = students.find(s => s.id === g.studentId);
        studentMap[g.studentId] = { id: g.studentId, name: g.studentName || st?.fullName || 'Unknown', gender: st?.gender || '', classId: g.classId, className: g.className, scores: [], attendancePct: 0 };
      }
    });

    // Compute weighted avg per student using ALL grades (not filtered) so missing categories don't zero out scores
    Object.values(studentMap).forEach(st => {
      const studentGrades = gradesForCalc.filter(g => g.studentId === st.id);
      const subjectIds = [...new Set(studentGrades.map(g => g.subjectId).filter(Boolean))];
      if (subjectIds.length === 0) { st.avg = 0; st.pass = false; return; }
      const classCats = gradeCategories.filter(c => c.classId === st.classId);
      const subjectScores = subjectIds.map(subjectId => {
        const result = calculateWeightedScore(gradesForCalc, classCats, st.id, subjectId);
        return result.overall;
      });
      st.avg = avg(subjectScores);
      st.pass = st.avg >= PASS_MARK;
    });

    const studentList = Object.values(studentMap).filter(s => s.avg > 0 || grades.some(g => g.studentId === s.id));
    const scores = studentList.map(s => s.avg);

    // Attendance per student
    const attMap = {};
    attendance.forEach(a => {
      if (!attMap[a.studentId]) attMap[a.studentId] = { total: 0, present: 0 };
      attMap[a.studentId].total++;
      if (a.status === 'present') attMap[a.studentId].present++;
    });
    studentList.forEach(s => {
      const a = attMap[s.id];
      s.attendancePct = a ? pct(a.present, a.total) : 0;
    });

    // Assignment completion per student
    const subMap = {};
    submissions.forEach(sub => { subMap[sub.studentId] = (subMap[sub.studentId] || 0) + 1; });
    studentList.forEach(s => {
      const relevantAssignments = assignments.filter(a => a.classId === s.classId).length;
      s.assignmentPct = relevantAssignments > 0 ? pct(subMap[s.id] || 0, relevantAssignments) : 0;
    });

    // Grade trend (determine improving/declining)
    const gradesByStudent = {};
    grades.forEach(g => {
      if (!gradesByStudent[g.studentId]) gradesByStudent[g.studentId] = [];
      gradesByStudent[g.studentId].push({ date: g.lastUpdatedAt || g.created_date, score: score(g) });
    });
    studentList.forEach(s => {
      const arr = (gradesByStudent[s.id] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      if (arr.length >= 2) {
        const first = avg(arr.slice(0, Math.ceil(arr.length / 2)).map(x => x.score));
        const last = avg(arr.slice(Math.floor(arr.length / 2)).map(x => x.score));
        s.trend = last > first + 2 ? 'improving' : last < first - 2 ? 'declining' : 'stable';
      } else s.trend = 'stable';
    });

    const top10 = [...studentList].sort((a, b) => b.avg - a.avg).slice(0, 10);
    const bottom10 = [...studentList].sort((a, b) => a.avg - b.avg).slice(0, 10);
    const atRisk = studentList.filter(s => s.avg < PASS_MARK && s.avg > 0);
    const overallPassRate = pct(studentList.filter(s => s.pass).length, studentList.length);
    const overallAvg = avg(scores);

    // Subject avg (weighted per student per subject, then averaged) — use all grades
    const subjectIds = [...new Set(gradesForCalc.map(g => g.subjectId).filter(Boolean))];
    const subjectAvgs = subjectIds.map(subjectId => {
      const name = gradesForCalc.find(g => g.subjectId === subjectId)?.subjectName || subjects.find(s => s.id === subjectId)?.name || 'Unknown';
      const shortName = name.length > 10 ? name.slice(0, 10) : name;
      const studentsWithSubject = [...new Set(gradesForCalc.filter(g => g.subjectId === subjectId).map(g => g.studentId))];
      const subjectScores = studentsWithSubject.map(studentId => {
        const st = studentMap[studentId];
        const classCats = gradeCategories.filter(c => c.classId === st?.classId);
        return calculateWeightedScore(gradesForCalc, classCats, studentId, subjectId).overall;
      }).filter(s => s > 0);
      return { name: shortName, score: avg(subjectScores), value: avg(subjectScores) };
    }).filter(s => s.value > 0);

    // Grade distribution based on weighted student averages
    const gradeDist = GRADE_DIST.map(g => ({
      label: g.label, name: g.label, count: scores.filter(s => s >= g.range[0] && s < g.range[1]).length,
      value: scores.filter(s => s >= g.range[0] && s < g.range[1]).length, color: g.color,
    }));

    // Pass rate trend (6 months) — use student weighted avgs
    const now = new Date();
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      // students who had any grade updated this month
      const activeStudentIds = [...new Set(grades.filter(g => { const at = g.lastUpdatedAt ? new Date(g.lastUpdatedAt) : null; return at && at >= startOfMonth(d) && at <= endOfMonth(d); }).map(g => g.studentId))];
      const ms = activeStudentIds.map(sid => studentList.find(s => s.id === sid)?.avg ?? 0).filter(s => s > 0);
      return { month: format(d, 'MMM'), rate: ms.length > 0 ? pct(ms.filter(s => s >= PASS_MARK).length, ms.length) : null, value: ms.length > 0 ? pct(ms.filter(s => s >= PASS_MARK).length, ms.length) : 0 };
    });

    // Enrollment by class
    const classEnrollment = classes.map(c => ({
      name: (c.className || '').length > 8 ? (c.className || '').slice(0, 8) : c.className,
      students: students.filter(s => s.classId === c.id).length,
      value: students.filter(s => s.classId === c.id).length,
    })).filter(c => c.students > 0);

    // Attendance trend (6 months)
    const attTrend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const monthAtt = attendance.filter(a => { const at = a.date ? new Date(a.date) : null; return at && at >= startOfMonth(d) && at <= endOfMonth(d); });
      return { month: format(d, 'MMM'), rate: monthAtt.length > 0 ? pct(monthAtt.filter(a => a.status === 'present').length, monthAtt.length) : 0, value: monthAtt.length > 0 ? pct(monthAtt.filter(a => a.status === 'present').length, monthAtt.length) : 0 };
    });

    // Gender comparison — use weighted student averages
    const maleAvgs = studentList.filter(s => s.gender === 'Male').map(s => s.avg);
    const femaleAvgs = studentList.filter(s => s.gender === 'Female').map(s => s.avg);
    const genderData = [
      { name: 'Male', avgScore: avg(maleAvgs), passRate: pct(maleAvgs.filter(s => s >= PASS_MARK).length, maleAvgs.length) },
      { name: 'Female', avgScore: avg(femaleAvgs), passRate: pct(femaleAvgs.filter(s => s >= PASS_MARK).length, femaleAvgs.length) },
    ];

    // Assignment completion by class
    const assignmentByClass = classes.map(c => {
      const classAssign = assignments.filter(a => a.classId === c.id);
      const classStudents = students.filter(s => s.classId === c.id);
      const expected = classAssign.length * classStudents.length;
      const actual = submissions.filter(sub => classAssign.some(a => a.id === sub.assignmentId)).length;
      return { name: (c.className || '').length > 8 ? (c.className || '').slice(0, 8) : c.className, rate: expected > 0 ? pct(actual, expected) : 0, value: expected > 0 ? pct(actual, expected) : 0 };
    }).filter(c => c.rate > 0);

    const totalAttPresent = attendance.filter(a => a.status === 'present').length;
    const attRate = pct(totalAttPresent, attendance.length);
    const totalSubAssign = assignments.length;
    const totalSubs = submissions.length;
    const assignCompletion = totalSubAssign > 0 ? pct(totalSubs, totalSubAssign * Math.max(students.length, 1)) : 0;

    return {
      studentList, top10, bottom10, atRisk, overallPassRate, overallAvg,
      subjectAvgs, gradeDist, trendData, classEnrollment, attTrend, genderData, assignmentByClass,
      attRate, assignCompletion: Math.min(assignCompletion, 100),
    };
  }, [students, grades, gradesForCalc, classes, subjects, attendance, assignments, submissions, gradeCategories]);

  const KPI_CARDS = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    { label: 'Average Score', value: `${data.overallAvg}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Pass Rate', value: `${data.overallPassRate}%`, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Attendance Rate', value: `${data.attRate}%`, icon: CheckSquare, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Assignment Completion', value: `${data.assignCompletion}%`, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Active Classes', value: classes.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'At-Risk Students', value: data.atRisk.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Top Performer', value: data.top10[0]?.name?.split(' ')[0] || 'N/A', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
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
        {visibleWidgets.passRateTrend && (
          <ChartWidget id="passRateTrend" title="Pass Rate Trend" subtitle="Monthly pass rate over last 6 months"
            data={data.trendData} dataKeys={['rate']} defaultType="area"
            allowedTypes={['line', 'area', 'bar']} height={200} />
        )}
        {visibleWidgets.attendanceTrend && (
          <ChartWidget id="attendanceTrend" title="Attendance Trend" subtitle="Monthly attendance rate"
            data={data.attTrend} dataKeys={['rate']} defaultType="line"
            allowedTypes={['line', 'area', 'bar']} height={200} />
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.subjectScores && (
          <ChartWidget id="subjectScores" title="Subject-wise Average Scores" subtitle="Average score per subject"
            data={data.subjectAvgs} dataKeys={['value']} defaultType="bar"
            allowedTypes={['bar', 'bar_h', 'radar', 'line']} height={200} />
        )}
        {visibleWidgets.gradeDistribution && (
          <ChartWidget id="gradeDistribution" title="Grade Distribution" subtitle="Students per grade band"
            data={data.gradeDist} dataKeys={['count']} defaultType="donut"
            allowedTypes={['pie', 'donut', 'bar', 'bar_h']} height={200} />
        )}
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.genderComparison && (
          <ChartWidget id="genderComparison" title="Gender Performance Comparison" subtitle="Avg score & pass rate by gender"
            data={data.genderData} dataKeys={['avgScore', 'passRate']} defaultType="bar"
            allowedTypes={['bar', 'stacked_bar', 'radar', 'line']} height={200} />
        )}
        {visibleWidgets.classEnrollment && (
          <ChartWidget id="classEnrollment" title="Student Enrollment by Class" subtitle="Number of students per class"
            data={data.classEnrollment} dataKeys={['value']} defaultType="bar"
            allowedTypes={['bar', 'bar_h', 'pie', 'donut']} height={200} />
        )}
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.assignmentByClass && (
          <ChartWidget id="assignmentByClass" title="Assignment Completion by Class" subtitle="Submission rate per class"
            data={data.assignmentByClass} dataKeys={['value']} defaultType="bar"
            allowedTypes={['bar', 'bar_h', 'line']} height={200} />
        )}
      </div>

      {/* Top 10 & Bottom 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.topStudents && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-3">Top 10 Performing Students</p>
            <div className="space-y-2">
              {data.top10.length > 0 ? data.top10.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.className}</span>
                  <span className="text-emerald-400 text-sm font-semibold shrink-0">{s.avg}%</span>
                </div>
              )) : <p className="text-slate-500 text-sm text-center py-4">No grade data</p>}
            </div>
          </div>
        )}
        {visibleWidgets.underperforming && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold mb-3">Bottom 10 Underperforming Students <span className="text-xs text-slate-400">(&lt;{PASS_MARK}%)</span></p>
            <div className="space-y-2">
              {data.bottom10.filter(s => s.avg < PASS_MARK).length > 0 ? data.bottom10.filter(s => s.avg < PASS_MARK).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.className}</span>
                  <span className="text-red-400 text-sm font-semibold shrink-0">{s.avg}%</span>
                </div>
              )) : <p className="text-emerald-400 text-sm text-center py-4">No underperforming students 🎉</p>}
            </div>
          </div>
        )}
      </div>

      {/* Student Performance Table */}
      {visibleWidgets.studentTable && (
        <div className="bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-3">Student Performance Table</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left pb-2 pr-3">Student</th>
                  <th className="text-left pb-2 pr-3">Class</th>
                  <th className="text-left pb-2 pr-3">Gender</th>
                  <th className="text-right pb-2 pr-3">Avg Score</th>
                  <th className="text-left pb-2 pr-3">Status</th>
                  <th className="text-right pb-2 pr-3">Attendance</th>
                  <th className="text-right pb-2 pr-3">Assignments</th>
                  <th className="text-left pb-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.studentList.slice(0, 20).map(s => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2 pr-3 font-medium truncate max-w-[120px]">{s.name}</td>
                    <td className="py-2 pr-3 text-slate-400 text-xs">{s.className || '—'}</td>
                    <td className="py-2 pr-3 text-slate-400 text-xs">{s.gender || '—'}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{s.avg}%</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {s.pass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-300">{s.attendancePct}%</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{s.assignmentPct}%</td>
                    <td className="py-2">
                      <span className={`text-xs ${s.trend === 'improving' ? 'text-emerald-400' : s.trend === 'declining' ? 'text-red-400' : 'text-slate-400'}`}>
                        {s.trend === 'improving' ? '↑ Improving' : s.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.studentList.length > 20 && <p className="text-slate-500 text-xs text-center mt-3">Showing 20 of {data.studentList.length} students</p>}
          </div>
        </div>
      )}
    </div>
  );
}