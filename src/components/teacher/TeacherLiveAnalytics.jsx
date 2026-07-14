import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';
import { Users, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PASS_MARK = 40;

function pct(num, denom) { return denom > 0 ? parseFloat(((num / denom) * 100).toFixed(1)) : 0; }
function avg(arr) { return arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0; }
function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return format(new Date(date), 'MMM d');
}

export default function TeacherLiveAnalytics({ onLoaded }) {
  const { schoolUser: user } = useSchoolAuth();
  const [data, setData] = useState({ grades: [], students: [], classes: [], subjects: [], gradeCategories: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const load = useCallback(async () => {
    if (!user?.schoolId) return;
    const teachingPairs = (user?.teachingAssignments || []).filter(a => a.classId && a.subjectId);
    const assignedClassIds = [...new Set(teachingPairs.map(a => a.classId))];
    const assignedSubjectIds = [...new Set(teachingPairs.map(a => a.subjectId))];

    const [allGrades, allStudents, allClasses, allSubjects, gradeCategories] = await Promise.all([
      base44.entities.Grade.filter({ schoolId: user.schoolId }),
      base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student', isArchived: false }),
      base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user.schoolId, isArchived: false }),
      base44.entities.GradeCategory.filter({ schoolId: user.schoolId }).catch(() => []),
    ]);

    const teacherGrades = teachingPairs.length > 0
      ? (allGrades || []).filter(g => teachingPairs.some(p => p.classId === g.classId && p.subjectId === g.subjectId))
      : (allGrades || []).filter(g => g.teacherId === user?.id);

    const teacherStudents = assignedClassIds.length > 0
      ? (allStudents || []).filter(s => assignedClassIds.includes(s.classId))
      : (allStudents || []);

    setData({
      grades: teacherGrades,
      students: teacherStudents,
      classes: (allClasses || []).filter(c => assignedClassIds.includes(c.id)),
      subjects: (allSubjects || []).filter(s => assignedSubjectIds.includes(s.id)),
      gradeCategories: gradeCategories || [],
    });
    setLastUpdated(new Date());
    setLoading(false);
    if (onLoaded) onLoaded();
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    load();
    const unsubGrade = base44.entities.Grade.subscribe(() => { if (user?.schoolId) load(); });
    const unsubQuiz = base44.entities.QuizSubmission.subscribe(() => { if (user?.schoolId) load(); });
    const poll = setInterval(load, 10000);
    return () => { unsubGrade(); unsubQuiz(); clearInterval(poll); };
  }, [load]);

  const filteredGrades = useMemo(() => {
    let g = data.grades;
    if (filterClass !== 'all') g = g.filter(x => x.classId === filterClass);
    if (filterSubject !== 'all') g = g.filter(x => x.subjectId === filterSubject);
    return g;
  }, [data.grades, filterClass, filterSubject]);

  const filteredStudents = useMemo(() => {
    let s = data.students;
    if (filterClass !== 'all') s = s.filter(x => x.classId === filterClass);
    return s;
  }, [data.students, filterClass]);

  const computed = useMemo(() => {
    const studentMap = {};
    filteredStudents.forEach(s => {
      studentMap[s.id] = { id: s.id, name: s.fullName || 'Unknown', gender: s.gender || '', classId: s.classId, className: s.className, subjectScores: {}, avg: 0, pass: false };
    });
    filteredGrades.forEach(g => {
      if (!g.studentId || studentMap[g.studentId]) return;
      const st = filteredStudents.find(s => s.id === g.studentId);
      studentMap[g.studentId] = { id: g.studentId, name: g.studentName || st?.fullName || 'Unknown', gender: st?.gender || '', classId: g.classId, className: g.className, subjectScores: {}, avg: 0, pass: false };
    });

    Object.values(studentMap).forEach(st => {
      const studentGrades = filteredGrades.filter(g => g.studentId === st.id);
      const subjectIds = [...new Set(studentGrades.map(g => g.subjectId).filter(Boolean))];
      if (subjectIds.length === 0) return;
      const classCats = data.gradeCategories.filter(c => !c.classId || c.classId === st.classId);
      const scores = subjectIds.map(subjectId => {
        const subjGrades = studentGrades.filter(g => g.subjectId === subjectId);
        const score = getSubjectFinalGrade(subjGrades, classCats.filter(c => c.subjectId === subjectId)).overall ?? 0;
        const subjName = studentGrades.find(g => g.subjectId === subjectId)?.subjectName
          || data.subjects.find(s => s.id === subjectId)?.name || 'Unknown';
        st.subjectScores[subjectId] = { name: subjName, score };
        return score;
      });
      st.avg = avg(scores);
      st.pass = st.avg >= PASS_MARK;
    });

    const studentList = Object.values(studentMap).filter(s => Object.keys(s.subjectScores).length > 0);
    const scores = studentList.map(s => s.avg);

    const allSubjectIds = [...new Set(filteredGrades.map(g => g.subjectId).filter(Boolean))];
    const subjectNameMap = {};
    allSubjectIds.forEach(subjectId => {
      subjectNameMap[subjectId] = filteredGrades.find(g => g.subjectId === subjectId)?.subjectName
        || data.subjects.find(s => s.id === subjectId)?.name || 'Unknown';
    });

    const perSubjectTop10 = allSubjectIds.map(subjectId => {
      const studentsWithSubject = studentList
        .filter(st => st.subjectScores[subjectId] && st.subjectScores[subjectId].score > 0)
        .map(st => ({ id: st.id, name: st.name, className: st.className, score: st.subjectScores[subjectId].score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return { subjectId, subjectName: subjectNameMap[subjectId], students: studentsWithSubject };
    });

    const top10 = [...studentList].sort((a, b) => b.avg - a.avg).slice(0, 10);
    const atRisk = studentList.filter(s => s.avg < PASS_MARK && s.avg > 0);
    const overallPassRate = pct(studentList.filter(s => s.pass).length, studentList.length);
    const overallAvg = avg(scores);

    const recentUpdates = [...filteredGrades]
      .sort((a, b) => new Date(b.lastUpdatedAt || b.created_date || 0) - new Date(a.lastUpdatedAt || a.created_date || 0))
      .slice(0, 8);

    return { studentList, top10, perSubjectTop10, atRisk, overallPassRate, overallAvg, recentUpdates, allSubjectIds, subjectNameMap };
  }, [filteredGrades, filteredStudents, data.gradeCategories, data.subjects]);

  if (loading) return null;

  const KPI_CARDS = [
    { label: 'Total Students', value: computed.studentList.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    { label: 'Average Score', value: `${computed.overallAvg}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Pass Rate', value: `${computed.overallPassRate}%`, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'At-Risk Students', value: computed.atRisk.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
  ];

  const showPerSubject = filterSubject === 'all';

  const RecentUpdates = ({ grid }) => (
    <div className="bg-[#1e2340] rounded-2xl p-5">
      <p className="font-semibold mb-3">Recent Grade Updates</p>
      <div className={grid ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "space-y-2"}>
        {computed.recentUpdates.length > 0 ? computed.recentUpdates.map((g, i) => (
          <div key={g.id || i} className="flex items-center gap-3 text-sm">
            <span className="flex-1 truncate">
              <span className="text-white">{g.studentName}</span>
              <span className="text-slate-400"> · {g.subjectName}</span>
            </span>
            <span className="text-slate-400 text-xs capitalize hidden sm:inline">{g.assessmentType}</span>
            <span className={`font-semibold shrink-0 ${((g.score / (g.maxScore || 100)) * 100) >= PASS_MARK ? 'text-emerald-400' : 'text-red-400'}`}>
              {g.score}/{g.maxScore || 100}
            </span>
            <span className="text-slate-500 text-xs shrink-0">{timeAgo(g.lastUpdatedAt || g.created_date)}</span>
          </div>
        )) : <p className={`text-slate-500 text-sm text-center py-4 ${grid ? 'md:col-span-2' : ''}`}>No recent updates</p>}
      </div>
    </div>
  );

  return (
    <div className="bg-[#12152a] text-white p-4 md:p-6 rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Live Grade Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            {lastUpdated ? `Updated ${format(lastUpdated, 'h:mm:ss a')}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#1e2340] rounded-full px-3 py-1.5 text-xs text-emerald-400 font-medium w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
        </div>
      </div>

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

      <div className="flex flex-wrap gap-2">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-40 bg-[#1e2340] border-slate-700 text-white"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All My Classes</SelectItem>
            {data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40 bg-[#1e2340] border-slate-700 text-white"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {data.subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showPerSubject ? '' : 'lg:grid-cols-2'}`}>
        <div className="bg-[#1e2340] rounded-2xl p-5">
          <p className="font-semibold mb-3">Top 10 Performing Students</p>
          {showPerSubject && computed.perSubjectTop10 && computed.perSubjectTop10.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {computed.perSubjectTop10.map(subj => (
                <div key={subj.subjectId} className="min-w-[180px] flex-1">
                  <p className="text-xs text-slate-300 font-medium mb-2 truncate border-b border-slate-700 pb-1">{subj.subjectName}</p>
                  <div className="space-y-1.5">
                    {subj.students.length > 0 ? subj.students.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                        <span className="flex-1 text-xs truncate">{s.name}</span>
                        <span className="text-emerald-400 text-xs font-semibold shrink-0">{s.score}%</span>
                      </div>
                    )) : <p className="text-slate-500 text-xs text-center py-2">No data</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {computed.top10.length > 0 ? computed.top10.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.className}</span>
                  <span className="text-emerald-400 text-sm font-semibold shrink-0">{s.avg}%</span>
                </div>
              )) : <p className="text-slate-500 text-sm text-center py-4">No grade data</p>}
            </div>
          )}
        </div>

        {!showPerSubject && <RecentUpdates />}
      </div>

      <div className="bg-[#1e2340] rounded-2xl p-5">
        <p className="font-semibold mb-3">Student Performance</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="text-left pb-2 pr-3">Student</th>
                <th className="text-left pb-2 pr-3">Class</th>
                {showPerSubject && computed.allSubjectIds && computed.allSubjectIds.length > 0 ? (
                  computed.allSubjectIds.map(subjectId => (
                    <th key={subjectId} className="text-right pb-2 pr-3 whitespace-nowrap text-xs">{(computed.subjectNameMap[subjectId] || '—').slice(0, 10)}</th>
                  ))
                ) : (
                  <th className="text-right pb-2 pr-3">Score</th>
                )}
                <th className="text-left pb-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {computed.studentList.slice(0, 30).map(s => (
                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2 pr-3 font-medium truncate max-w-[120px]">{s.name}</td>
                  <td className="py-2 pr-3 text-slate-400 text-xs">{s.className || '—'}</td>
                  {showPerSubject && computed.allSubjectIds && computed.allSubjectIds.length > 0 ? (
                    computed.allSubjectIds.map(subjectId => (
                      <td key={subjectId} className="py-2 pr-3 text-right text-slate-300">{s.subjectScores[subjectId] ? `${s.subjectScores[subjectId].score}%` : '—'}</td>
                    ))
                  ) : (
                    <td className="py-2 pr-3 text-right font-semibold">{s.avg}%</td>
                  )}
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {s.pass ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {computed.studentList.length > 30 && <p className="text-slate-500 text-xs text-center mt-3">Showing 30 of {computed.studentList.length} students</p>}
        </div>
      </div>

      {showPerSubject && <RecentUpdates grid />}
    </div>
  );
}