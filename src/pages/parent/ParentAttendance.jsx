import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, LayoutGrid, Calendar, Grid3X3, BarChart3, Filter } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, parseISO } from 'date-fns';

import AttendanceKPICards from '@/components/parent/attendance/AttendanceKPICards';
import SubjectBreakdownCard from '@/components/parent/attendance/SubjectBreakdownCard';
import AttendanceCalendarView from '@/components/parent/attendance/AttendanceCalendarView';
import WeeklyAttendanceGrid from '@/components/parent/attendance/WeeklyAttendanceGrid';
import AttendanceCharts from '@/components/parent/attendance/AttendanceCharts';

function applyFilters(records, filters) {
  let r = [...records];
  // Time period
  const now = new Date();
  if (filters.period === 'this_week') {
    const s = startOfWeek(now, { weekStartsOn: 1 });
    const e = endOfWeek(now, { weekStartsOn: 1 });
    r = r.filter(a => { const d = new Date(a.date); return d >= s && d <= e; });
  } else if (filters.period === 'this_month') {
    const s = startOfMonth(now); const e = endOfMonth(now);
    r = r.filter(a => { const d = new Date(a.date); return d >= s && d <= e; });
  } else if (filters.period === 'last_month') {
    const s = startOfMonth(subMonths(now, 1)); const e = endOfMonth(subMonths(now, 1));
    r = r.filter(a => { const d = new Date(a.date); return d >= s && d <= e; });
  } else if (filters.period === 'this_term') {
    r = r.filter(a => { const d = new Date(a.date); return d >= subMonths(now, 3) && d <= now; });
  } else if (filters.period === 'this_session') {
    r = r.filter(a => { const d = new Date(a.date); return d >= startOfYear(now) && d <= now; });
  } else if (filters.period === 'custom' && filters.from && filters.to) {
    const s = new Date(filters.from); const e = new Date(filters.to);
    r = r.filter(a => { const d = new Date(a.date); return d >= s && d <= e; });
  }
  // Subject
  if (filters.subjectId && filters.subjectId !== 'all') {
    r = r.filter(a => a.subjectId === filters.subjectId || a.subjectName === filters.subjectId);
  }
  // Status
  if (filters.status && filters.status !== 'all') {
    r = r.filter(a => a.status === filters.status);
  }
  return r;
}

function ChildAttendance({ child, records, subjects }) {
  const [filters, setFilters] = useState({ period: 'all', subjectId: 'all', status: 'all', from: '', to: '' });

  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);

  // Group by subject for breakdown
  const bySubject = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.subjectName || r.subjectId || 'General';
      if (!map[key]) map[key] = { records: [], teacherName: r.teacherName };
      map[key].records.push(r);
    });
    return map;
  }, [records]);

  const subjectKeys = Object.keys(bySubject).sort();

  // Build subject options from this child's records
  const subjectOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    records.forEach(r => {
      const key = r.subjectName || r.subjectId || 'General';
      if (!seen.has(key)) { seen.add(key); opts.push({ value: r.subjectId || key, label: key }); }
    });
    return opts;
  }, [records]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <AttendanceKPICards records={records} />

      {/* Filters bar */}
      <div className="bg-muted/40 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filters.period} onValueChange={v => setFilters(f => ({ ...f, period: v }))}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Time Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_term">This Term</SelectItem>
            <SelectItem value="this_session">This Session</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {subjectOptions.length > 0 && (
          <Select value={filters.subjectId} onValueChange={v => setFilters(f => ({ ...f, subjectId: v }))}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="excused">Excused</SelectItem>
          </SelectContent>
        </Select>

        {filters.period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs" />
          </div>
        )}

        {(filters.period !== 'all' || filters.subjectId !== 'all' || filters.status !== 'all') && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => setFilters({ period: 'all', subjectId: 'all', status: 'all', from: '', to: '' })}
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="subjects">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="subjects" className="text-xs gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />By Subject</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1.5"><Calendar className="w-3.5 h-3.5" />Calendar</TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs gap-1.5"><Grid3X3 className="w-3.5 h-3.5" />Weekly Grid</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Analytics</TabsTrigger>
        </TabsList>

        {/* By Subject */}
        <TabsContent value="subjects" className="mt-4">
          {subjectKeys.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">No per-subject attendance records yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectKeys.map(subj => (
                <SubjectBreakdownCard
                  key={subj}
                  subjectName={subj}
                  teacherName={bySubject[subj].teacherName}
                  records={filters.subjectId === 'all' || filters.subjectId === subj || bySubject[subj].records[0]?.subjectId === filters.subjectId
                    ? bySubject[subj].records
                    : []}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <AttendanceCalendarView records={filteredRecords} />
        </TabsContent>

        {/* Weekly Grid */}
        <TabsContent value="weekly" className="mt-4">
          <WeeklyAttendanceGrid records={records} />
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="mt-4">
          <AttendanceCharts records={filteredRecords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ParentAttendance() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChild, setActiveChild] = useState(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    load();
    const unsub = base44.entities.Attendance.subscribe((event) => {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.includes(event.data?.studentId)) load();
    });
    return () => unsub();
  }, [user?.id, user?.linkedStudentIds, user?.schoolId]);

  async function load() {
    try {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.length === 0) { setLoading(false); return; }
      const [allStudents, subjectList, ...recordArrays] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' }).catch(() => []),
        base44.entities.Subject.filter({ schoolId: user.schoolId, isArchived: false }).catch(() => []),
        ...linkedIds.map(id => base44.entities.Attendance.filter({ schoolId: user.schoolId, studentId: id }).catch(() => [])),
      ]);
      const linked = (allStudents || []).filter(s => linkedIds.includes(s.id));
      setChildren(linked);
      // Only set initial active child once — don't override user's selection on reload
      if (linked.length > 0 && !initializedRef.current) {
        setActiveChild(linked[0].id);
        initializedRef.current = true;
      }
      setSubjects(subjectList || []);
      setAttendance(recordArrays.flat().filter(Boolean));
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (children.length === 0) return <div className="text-center text-muted-foreground py-12">No linked children found. Please contact the school to link your child's account.</div>;

  const currentChild = children.find(c => c.id === activeChild) || children[0];
  const childRecords = attendance.filter(a => a.studentId === currentChild?.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detailed per-subject attendance tracking</p>
        </div>

        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveChild(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeChild === c.id ? 'bg-primary text-primary-foreground border-primary shadow' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
              >
                {c.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {children.length === 1 && (
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {currentChild.fullName?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{currentChild.fullName}</p>
            <p className="text-xs text-muted-foreground">{currentChild.className || 'No class assigned'} · {childRecords.length} records</p>
          </div>
          {childRecords.length > 0 && (() => {
            const attended = childRecords.filter(r => r.status !== 'absent').length;
            const pct = Math.round((attended / childRecords.length) * 100);
            return (
              <Badge className={`ml-auto ${pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {pct}% overall
              </Badge>
            );
          })()}
        </div>
      )}

      {currentChild && (
        <ChildAttendance
          key={currentChild.id}
          child={currentChild}
          records={childRecords}
          subjects={subjects}
        />
      )}
    </div>
  );
}