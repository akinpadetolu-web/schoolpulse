import React from 'react';
import { X, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const DEFAULT_FILTERS = {
  timePeriod: 'all',
  customFrom: '',
  customTo: '',
  classId: 'all',
  subjectId: 'all',
  teacherId: 'all',
  studentGroup: 'all',
  gender: 'all',
  term: 'all',
  academicYear: 'all',
  gradeRange: 'all',
  passFailStatus: 'all',
  attendanceRange: 'all',
  assignmentStatus: 'all',
};

export default function DashboardFilters({ filters, setFilters, classes, subjects, teachers, academicTerms, onApply, onReset }) {
  const isDirty = Object.entries(filters).some(([k, v]) => DEFAULT_FILTERS[k] !== undefined && v !== DEFAULT_FILTERS[k]);

  function update(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  const selectCls = "bg-[#12152a] border-slate-700 text-white text-sm h-9";
  const contentCls = "bg-[#1e2340] border-slate-700 text-white z-50 max-h-60";

  return (
    <div className="bg-[#1e2340] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filters
        </p>
        <div className="flex gap-2">
          {isDirty && (
            <button onClick={onReset} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
          <Button size="sm" onClick={onApply} className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Time & Date */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5 font-medium">Time / Date</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <Select value={filters.timePeriod} onValueChange={v => update('timePeriod', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Time Period" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_term">This Term/Quarter</SelectItem>
              <SelectItem value="last_term">Last Term/Quarter</SelectItem>
              <SelectItem value="this_session">This Academic Year</SelectItem>
              <SelectItem value="last_session">Last Academic Year</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.term} onValueChange={v => update('term', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Term" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="first">First Term</SelectItem>
              <SelectItem value="second">Second Term</SelectItem>
              <SelectItem value="third">Third Term</SelectItem>
              {(academicTerms || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.academicYear} onValueChange={v => update('academicYear', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Academic Year" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2025-2026">2025-2026</SelectItem>
              <SelectItem value="2024-2025">2024-2025</SelectItem>
              <SelectItem value="2023-2024">2023-2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filters.timePeriod === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">From</p>
              <input type="date" value={filters.customFrom} onChange={e => update('customFrom', e.target.value)}
                className="w-full bg-[#12152a] border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">To</p>
              <input type="date" value={filters.customTo} onChange={e => update('customTo', e.target.value)}
                className="w-full bg-[#12152a] border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500" />
            </div>
          </div>
        )}
      </div>

      {/* Academic Filters */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5 font-medium">Academic</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <Select value={filters.classId} onValueChange={v => update('classId', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Classes</SelectItem>
              {(classes || []).map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.subjectId} onValueChange={v => update('subjectId', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.teacherId} onValueChange={v => update('teacherId', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="All Teachers" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Teachers</SelectItem>
              {(teachers || []).map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.studentGroup} onValueChange={v => update('studentGroup', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Student Group" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="top">Top Performers (≥80%)</SelectItem>
              <SelectItem value="under">Underperformers (40-59%)</SelectItem>
              <SelectItem value="at_risk">At-Risk (&lt;40%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.gender} onValueChange={v => update('gender', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performance Filters */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5 font-medium">Performance</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <Select value={filters.gradeRange} onValueChange={v => update('gradeRange', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Grade Range" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="A">A (80–100%)</SelectItem>
              <SelectItem value="B">B (65–79%)</SelectItem>
              <SelectItem value="C">C (50–64%)</SelectItem>
              <SelectItem value="D">D (40–49%)</SelectItem>
              <SelectItem value="F">F (&lt;40%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.passFailStatus} onValueChange={v => update('passFailStatus', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Pass/Fail" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.attendanceRange} onValueChange={v => update('attendanceRange', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Attendance Range" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Attendance</SelectItem>
              <SelectItem value="above90">Above 90%</SelectItem>
              <SelectItem value="above75">Above 75%</SelectItem>
              <SelectItem value="below75">Below 75%</SelectItem>
              <SelectItem value="below50">Below 50%</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.assignmentStatus} onValueChange={v => update('assignmentStatus', v)}>
            <SelectTrigger className={selectCls}><SelectValue placeholder="Assignment Status" /></SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="not_submitted">Not Submitted</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}