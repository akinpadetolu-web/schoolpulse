import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { SlidersHorizontal, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

import DashboardFilters, { DEFAULT_FILTERS } from '@/components/dashboard/DashboardFilters';
import DashboardCustomize, {
  STUDENT_WIDGETS, TEACHER_WIDGETS, getDefaultVisible,
} from '@/components/dashboard/DashboardCustomize';
import StudentOverview from '@/components/dashboard/StudentOverview';
import TeacherOverview from '@/components/dashboard/TeacherOverview';
import ActivityTrends from '@/components/dashboard/ActivityTrends';
import StudentProgressAgentChat from '@/components/agents/StudentProgressAgentChat';

import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, subYears, startOfYear, endOfYear,
} from 'date-fns';

function getDateRange(f) {
  const now = new Date();
  if (f.timePeriod === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (f.timePeriod === 'yesterday') { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
  if (f.timePeriod === 'this_week') return { from: startOfWeek(now), to: now };
  if (f.timePeriod === 'last_week') { const lw = subDays(now, 7); return { from: startOfWeek(lw), to: endOfWeek(lw) }; }
  if (f.timePeriod === 'this_month') return { from: startOfMonth(now), to: now };
  if (f.timePeriod === 'last_month') { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
  if (f.timePeriod === 'this_term') return { from: subMonths(now, 3), to: now };
  if (f.timePeriod === 'last_term') return { from: subMonths(now, 6), to: subMonths(now, 3) };
  if (f.timePeriod === 'this_session') return { from: startOfYear(now), to: now };
  if (f.timePeriod === 'last_session') { const ly = subYears(now, 1); return { from: startOfYear(ly), to: endOfYear(ly) }; }
  if (f.timePeriod === 'custom' && f.customFrom && f.customTo) return { from: new Date(f.customFrom), to: new Date(f.customTo) };
  return null;
}

const PASS_MARK = 40;
function gradeScore(g) { return (g.score / (g.maxScore || 100)) * 100; }

function gradeRangeFilter(score) {
  return (range) => {
    if (range === 'all') return true;
    if (range === 'A') return score >= 80;
    if (range === 'B') return score >= 65 && score < 80;
    if (range === 'C') return score >= 50 && score < 65;
    if (range === 'D') return score >= 40 && score < 50;
    if (range === 'F') return score < 40;
    return true;
  };
}

function applyFiltersToData(raw, filters) {
  const dr = getDateRange(filters);

  // Academic year → additional date range (Sept of start year → Aug of end year)
  let yearDr = null;
  if (filters.academicYear !== 'all') {
    const m = filters.academicYear.match(/^(\d{4})-(\d{4})$/);
    if (m) yearDr = { from: new Date(Number(m[1]), 8, 1), to: new Date(Number(m[2]), 7, 31, 23, 59, 59) };
  }
  const inDate = (d) => {
    if (!dr && !yearDr) return true;
    if (!d) return false;
    const t = new Date(d).getTime();
    if (dr && (t < dr.from.getTime() || t > dr.to.getTime())) return false;
    if (yearDr && (t < yearDr.from.getTime() || t > yearDr.to.getTime())) return false;
    return true;
  };

  let grades = raw.grades;
  if (filters.classId !== 'all') grades = grades.filter(g => g.classId === filters.classId);
  if (filters.subjectId !== 'all') grades = grades.filter(g => g.subjectId === filters.subjectId);
  if (filters.teacherId !== 'all') grades = grades.filter(g => g.teacherId === filters.teacherId);
  if (filters.term !== 'all') grades = grades.filter(g => (g.term || '').toLowerCase().includes(filters.term));
  if (dr || yearDr) grades = grades.filter(g => inDate(g.lastUpdatedAt));
  if (filters.gradeRange !== 'all') grades = grades.filter(g => gradeRangeFilter(gradeScore(g))(filters.gradeRange));
  if (filters.passFailStatus === 'passed') grades = grades.filter(g => gradeScore(g) >= PASS_MARK);
  if (filters.passFailStatus === 'failed') grades = grades.filter(g => gradeScore(g) < PASS_MARK);

  let students = raw.students;
  if (filters.classId !== 'all') students = students.filter(s => s.classId === filters.classId);
  if (filters.gender !== 'all') students = students.filter(s => s.gender === filters.gender);
  if (filters.studentGroup === 'top') {
    const topIds = new Set(grades.filter(g => gradeScore(g) >= 80).map(g => g.studentId));
    students = students.filter(s => topIds.has(s.id));
  } else if (filters.studentGroup === 'under') {
    const ids = new Set(grades.filter(g => { const sc = gradeScore(g); return sc >= 40 && sc < 60; }).map(g => g.studentId));
    students = students.filter(s => ids.has(s.id));
  } else if (filters.studentGroup === 'at_risk') {
    const ids = new Set(grades.filter(g => gradeScore(g) < PASS_MARK).map(g => g.studentId));
    students = students.filter(s => ids.has(s.id));
  }

  let attendance = raw.attendance;
  if (filters.classId !== 'all') attendance = attendance.filter(a => a.classId === filters.classId);
  if (dr || yearDr) attendance = attendance.filter(a => inDate(a.date));

  // Attendance range filter (per-student attendance rate)
  if (filters.attendanceRange !== 'all') {
    const attMap = {};
    raw.attendance.forEach(a => {
      if (filters.classId !== 'all' && a.classId !== filters.classId) return;
      if (!attMap[a.studentId]) attMap[a.studentId] = { total: 0, present: 0 };
      attMap[a.studentId].total++;
      if (a.status === 'present') attMap[a.studentId].present++;
    });
    const attPct = (sid) => { const a = attMap[sid]; return a && a.total > 0 ? (a.present / a.total) * 100 : -1; };
    const matchAtt = (p) => {
      if (p < 0) return false;
      if (filters.attendanceRange === 'above90') return p >= 90;
      if (filters.attendanceRange === 'above75') return p >= 75;
      if (filters.attendanceRange === 'below75') return p < 75;
      if (filters.attendanceRange === 'below50') return p < 50;
      return true;
    };
    students = students.filter(s => matchAtt(attPct(s.id)));
  }

  // Assignment submission status filter (per-student)
  if (filters.assignmentStatus !== 'all') {
    const classAssignCount = {};
    raw.assignments.forEach(a => {
      if (filters.classId !== 'all' && a.classId !== filters.classId) return;
      if (filters.teacherId !== 'all' && a.teacherId !== filters.teacherId) return;
      classAssignCount[a.classId] = (classAssignCount[a.classId] || 0) + 1;
    });
    const subMap = {};
    raw.submissions.forEach(sub => {
      const assign = raw.assignments.find(a => a.id === sub.assignmentId);
      if (!assign) return;
      if (filters.classId !== 'all' && assign.classId !== filters.classId) return;
      if (!subMap[sub.studentId]) subMap[sub.studentId] = { submitted: 0, late: 0 };
      subMap[sub.studentId].submitted++;
      if (sub.isLate) subMap[sub.studentId].late++;
    });
    students = students.filter(s => {
      const stSub = subMap[s.id] || { submitted: 0, late: 0 };
      const total = classAssignCount[s.classId] || 0;
      if (filters.assignmentStatus === 'submitted') return stSub.submitted > 0;
      if (filters.assignmentStatus === 'not_submitted') return stSub.submitted < total;
      if (filters.assignmentStatus === 'late') return stSub.late > 0;
      return true;
    });
  }

  let assignments = raw.assignments;
  if (filters.classId !== 'all') assignments = assignments.filter(a => a.classId === filters.classId);
  if (filters.teacherId !== 'all') assignments = assignments.filter(a => a.teacherId === filters.teacherId);
  if (filters.term !== 'all') {
    const termMap = { first: 'first', second: 'second', third: 'third' };
    if (termMap[filters.term]) assignments = assignments.filter(a => a.term?.toLowerCase().includes(filters.term));
  }

  return { ...raw, grades, students, attendance, assignments };
}

function useLocalPref(key, def) {
  const [val, setVal] = useState(() => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } });
  const persist = (v) => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [val, persist];
}

export default function AdminDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [view, setView] = useLocalPref('dashboard_view', 'student');
  const [columns, setColumns] = useLocalPref('dashboard_columns', 2);
  const [studentVisible, setStudentVisible] = useLocalPref('dashboard_student_widgets', getDefaultVisible(STUDENT_WIDGETS));
  const [teacherVisible, setTeacherVisible] = useLocalPref('dashboard_teacher_widgets', getDefaultVisible(TEACHER_WIDGETS));
  const [showCustomize, setShowCustomize] = useState(false);

  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  // Raw data
  const [raw, setRaw] = useState({ students: [], grades: [], classes: [], subjects: [], teachers: [], attendance: [], assignments: [], submissions: [], staffAttendance: [], academicTerms: [], gradeCategories: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      const [students, grades, classes, subjects, teachers, attendance, assignments, submissions, staffAtt, terms, gradeCategories] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }),
        base44.entities.Grade.filter({ schoolId }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
        base44.entities.Attendance.filter({ schoolId }),
        base44.entities.Assignment.filter({ schoolId }),
        base44.entities.Submission.filter({ schoolId }),
        base44.entities.StaffAttendance.filter({ schoolId }).catch(() => []),
        base44.entities.AcademicTerm.filter({ schoolId }).catch(() => []),
        base44.entities.GradeCategory.filter({ schoolId }).catch(() => []),
      ]);
      setRaw({ students: students || [], grades: grades || [], classes: classes || [], subjects: subjects || [], teachers: teachers || [], attendance: attendance || [], assignments: assignments || [], submissions: submissions || [], staffAttendance: staffAtt || [], academicTerms: terms || [], gradeCategories: gradeCategories || [] });
      setLastUpdated(new Date());
      setLoading(false);
    }
    load();

    const u1 = base44.entities.Grade.subscribe(() => base44.entities.Grade.filter({ schoolId }).then(g => setRaw(r => ({ ...r, grades: g || [] }))));
    const u2 = base44.entities.Attendance.subscribe(() => base44.entities.Attendance.filter({ schoolId }).then(a => setRaw(r => ({ ...r, attendance: a || [] }))));
    const u3 = base44.entities.Submission.subscribe(() => base44.entities.Submission.filter({ schoolId }).then(s => setRaw(r => ({ ...r, submissions: s || [] }))));
    return () => { u1(); u2(); u3(); };
  }, [schoolId]);

  const filtered = React.useMemo(() => applyFiltersToData(raw, appliedFilters), [raw, appliedFilters]);

  function handleApply(overrideFilters) {
    setAppliedFilters(overrideFilters ? { ...overrideFilters } : { ...pendingFilters });
  }
  function handleReset() { setPendingFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); }

  if (loading) return (
    <div className="min-h-full bg-background text-foreground p-6 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-background text-foreground p-4 md:p-6 rounded-xl space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Academic Performance Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.schoolName || 'Your School'} · {lastUpdated ? `Updated ${format(lastUpdated, 'h:mm:ss a')}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground bg-card border border-border hover:bg-accent rounded-full"
            onClick={() => setShowCustomize(v => !v)}>
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Customize
          </Button>
        </div>
      </div>

      {/* Student / Teacher Toggle */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button onClick={() => setView('student')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'student' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          <GraduationCap className="w-4 h-4" /> Student Overview
        </button>
        <button onClick={() => setView('teacher')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'teacher' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          <Users className="w-4 h-4" /> Teacher Overview
        </button>
      </div>

      {/* Customize Panel */}
      {showCustomize && (
        <DashboardCustomize
          view={view}
          studentVisible={studentVisible} setStudentVisible={(v) => { const nv = typeof v === 'function' ? v(studentVisible) : v; setStudentVisible(nv); }}
          teacherVisible={teacherVisible} setTeacherVisible={(v) => { const nv = typeof v === 'function' ? v(teacherVisible) : v; setTeacherVisible(nv); }}
          columns={columns} setColumns={setColumns}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {/* Filters */}
      <DashboardFilters
        filters={pendingFilters}
        setFilters={setPendingFilters}
        classes={raw.classes}
        subjects={raw.subjects}
        teachers={raw.teachers}
        academicTerms={raw.academicTerms}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* Main content */}
      {view === 'student' ? (
        <StudentOverview
          students={filtered.students}
          grades={filtered.grades}
          allGrades={raw.grades}
          classes={filtered.classes}
          subjects={filtered.subjects}
          attendance={filtered.attendance}
          assignments={filtered.assignments}
          submissions={filtered.submissions}
          gradeCategories={raw.gradeCategories}
          visibleWidgets={studentVisible}
          selectedSubjectId={appliedFilters.subjectId}
        />
      ) : (
        <TeacherOverview
          teachers={filtered.teachers}
          students={filtered.students}
          grades={filtered.grades}
          classes={filtered.classes}
          assignments={filtered.assignments}
          submissions={filtered.submissions}
          attendance={filtered.attendance}
          staffAttendance={raw.staffAttendance}
          gradeCategories={raw.gradeCategories}
          visibleWidgets={teacherVisible}
        />
      )}

      {/* Activity Trends */}
      <ActivityTrends filters={appliedFilters} />

      <StudentProgressAgentChat subtitle="Ask about any student, class trends, or at-risk learners across your school" />

      {/* Quick Links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
        {[
          { label: 'Students', to: '/school-admin/students' },
          { label: 'Teachers', to: '/school-admin/teachers' },
          { label: 'Classes', to: '/school-admin/classes' },
          { label: 'Grades', to: '/school-admin/grade-weighting' },
          { label: 'Timetable', to: '/school-admin/timetable' },
          { label: 'Reports', to: '/school-admin/report-cards' },
        ].map(l => (
          <Link key={l.to} to={l.to}>
            <div className="bg-card border border-border hover:bg-accent transition-colors rounded-xl px-3 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer">{l.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}