import React, { useState, useRef, useEffect } from 'react';
import { X, Filter, ChevronDown, SlidersHorizontal } from 'lucide-react';
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

// Human-readable labels for active chips
const FILTER_LABELS = {
  timePeriod: {
    today: 'Today', yesterday: 'Yesterday', this_week: 'This Week', last_week: 'Last Week',
    this_month: 'This Month', last_month: 'Last Month', this_term: 'This Term',
    last_term: 'Last Term', this_session: 'This Year', last_session: 'Last Year', custom: 'Custom Range',
  },
  term: { first: 'First Term', second: 'Second Term', third: 'Third Term' },
  gender: { Male: 'Male', Female: 'Female' },
  studentGroup: { top: 'Top Performers', under: 'Underperformers', at_risk: 'At-Risk' },
  gradeRange: { A: 'Grade A', B: 'Grade B', C: 'Grade C', D: 'Grade D', F: 'Grade F' },
  passFailStatus: { passed: 'Passed', failed: 'Failed' },
  attendanceRange: { above90: 'Att >90%', above75: 'Att >75%', below75: 'Att <75%', below50: 'Att <50%' },
  assignmentStatus: { submitted: 'Submitted', not_submitted: 'Not Submitted', late: 'Late' },
};

function getActiveChips(filters, classes, subjects, teachers, academicTerms) {
  const chips = [];
  const add = (key, label) => chips.push({ key, label });

  if (filters.timePeriod !== 'all') add('timePeriod', FILTER_LABELS.timePeriod[filters.timePeriod] || filters.timePeriod);
  if (filters.term !== 'all') {
    const termLabel = FILTER_LABELS.term[filters.term] || (academicTerms || []).find(t => t.id === filters.term)?.name || filters.term;
    add('term', termLabel);
  }
  if (filters.academicYear !== 'all') add('academicYear', filters.academicYear);
  if (filters.classId !== 'all') {
    const cls = (classes || []).find(c => c.id === filters.classId);
    add('classId', cls?.className || filters.classId);
  }
  if (filters.subjectId !== 'all') {
    const sub = (subjects || []).find(s => s.id === filters.subjectId);
    add('subjectId', sub?.name || filters.subjectId);
  }
  if (filters.teacherId !== 'all') {
    const tch = (teachers || []).find(t => t.id === filters.teacherId);
    add('teacherId', tch?.fullName || filters.teacherId);
  }
  if (filters.studentGroup !== 'all') add('studentGroup', FILTER_LABELS.studentGroup[filters.studentGroup]);
  if (filters.gender !== 'all') add('gender', FILTER_LABELS.gender[filters.gender]);
  if (filters.gradeRange !== 'all') add('gradeRange', FILTER_LABELS.gradeRange[filters.gradeRange]);
  if (filters.passFailStatus !== 'all') add('passFailStatus', FILTER_LABELS.passFailStatus[filters.passFailStatus]);
  if (filters.attendanceRange !== 'all') add('attendanceRange', FILTER_LABELS.attendanceRange[filters.attendanceRange]);
  if (filters.assignmentStatus !== 'all') add('assignmentStatus', FILTER_LABELS.assignmentStatus[filters.assignmentStatus]);

  return chips;
}

export default function DashboardFilters({ filters, setFilters, classes, subjects, teachers, academicTerms, onApply, onReset }) {
  const [panelOpen, setPanelOpen] = useState(false);
  // Local draft state inside the panel — only committed on Apply
  const [draft, setDraft] = useState(filters);
  const panelRef = useRef(null);

  // Sync draft when panel opens
  useEffect(() => { if (panelOpen) setDraft(filters); }, [panelOpen]);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  const activeChips = getActiveChips(filters, classes, subjects, teachers, academicTerms);
  const activeCount = activeChips.length;

  function removeChip(key) {
    const next = { ...filters, [key]: DEFAULT_FILTERS[key] };
    setFilters(next);
    onApply && onApply(next);
  }

  function updateDraft(key, val) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function handleApply() {
    setFilters(draft);
    onApply && onApply(draft);
    setPanelOpen(false);
  }

  function handleReset() {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    onReset && onReset();
    setPanelOpen(false);
  }

  const selCls = "bg-[#12152a] border-slate-700 text-white text-sm h-8";
  const cntCls = "bg-[#1e2340] border-slate-700 text-white z-[200] max-h-52";

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Compact filter bar ── */}
      <div className="bg-[#1e2340] rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 min-h-[48px]">

        {/* Left: icon + label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {activeChips.map(chip => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs rounded-full px-2.5 py-0.5"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="text-indigo-400 hover:text-white transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {activeChips.length === 0 && (
          <span className="text-xs text-slate-600 italic flex-1">No filters active</span>
        )}

        {/* Right: buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPanelOpen(v => !v)}
            className={`h-7 px-3 text-xs gap-1.5 border ${panelOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-300 hover:text-white bg-transparent hover:bg-[#252b48]'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            All Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* ── Dropdown panel ── */}
      {panelOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[150] bg-[#1a1f3a] border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* ROW 1 — TIME & DATE */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Time & Date</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Time Period</p>
                  <Select value={draft.timePeriod} onValueChange={v => updateDraft('timePeriod', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Time Period" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_term">This Term</SelectItem>
                      <SelectItem value="last_term">Last Term</SelectItem>
                      <SelectItem value="this_session">This Academic Year</SelectItem>
                      <SelectItem value="last_session">Last Academic Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Term</p>
                  <Select value={draft.term} onValueChange={v => updateDraft('term', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Term" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Terms</SelectItem>
                      <SelectItem value="first">First Term</SelectItem>
                      <SelectItem value="second">Second Term</SelectItem>
                      <SelectItem value="third">Third Term</SelectItem>
                      {(academicTerms || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Academic Year</p>
                  <Select value={draft.academicYear} onValueChange={v => updateDraft('academicYear', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Academic Year" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2025-2026">2025-2026</SelectItem>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                      <SelectItem value="2023-2024">2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {draft.timePeriod === 'custom' && (
                  <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">From</p>
                      <input type="date" value={draft.customFrom} onChange={e => updateDraft('customFrom', e.target.value)}
                        className="w-full bg-[#12152a] border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">To</p>
                      <input type="date" value={draft.customTo} onChange={e => updateDraft('customTo', e.target.value)}
                        className="w-full bg-[#12152a] border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 h-8" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* ROW 2 — ACADEMIC */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Academic</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Class / Grade</p>
                  <Select value={draft.classId} onValueChange={v => updateDraft('classId', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="All Classes" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Classes</SelectItem>
                      {(classes || []).map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Subject</p>
                  <Select value={draft.subjectId} onValueChange={v => updateDraft('subjectId', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="All Subjects" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {(subjects || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Teacher</p>
                  <Select value={draft.teacherId} onValueChange={v => updateDraft('teacherId', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="All Teachers" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Teachers</SelectItem>
                      {(teachers || []).map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Student Group</p>
                  <Select value={draft.studentGroup} onValueChange={v => updateDraft('studentGroup', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="All Students" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="top">Top Performers (≥80%)</SelectItem>
                      <SelectItem value="under">Underperformers (40–59%)</SelectItem>
                      <SelectItem value="at_risk">At-Risk (&lt;40%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Gender</p>
                  <Select value={draft.gender} onValueChange={v => updateDraft('gender', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* ROW 3 — PERFORMANCE */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Performance</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Grade Range</p>
                  <Select value={draft.gradeRange} onValueChange={v => updateDraft('gradeRange', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Grade Range" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="A">A (80–100%)</SelectItem>
                      <SelectItem value="B">B (65–79%)</SelectItem>
                      <SelectItem value="C">C (50–64%)</SelectItem>
                      <SelectItem value="D">D (40–49%)</SelectItem>
                      <SelectItem value="F">F (&lt;40%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Pass / Fail</p>
                  <Select value={draft.passFailStatus} onValueChange={v => updateDraft('passFailStatus', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Pass/Fail" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Attendance Range</p>
                  <Select value={draft.attendanceRange} onValueChange={v => updateDraft('attendanceRange', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Attendance" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Attendance</SelectItem>
                      <SelectItem value="above90">Above 90%</SelectItem>
                      <SelectItem value="above75">Above 75%</SelectItem>
                      <SelectItem value="below75">Below 75%</SelectItem>
                      <SelectItem value="below50">Below 50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Submission Status</p>
                  <Select value={draft.assignmentStatus} onValueChange={v => updateDraft('assignmentStatus', v)}>
                    <SelectTrigger className={selCls}><SelectValue placeholder="Submissions" /></SelectTrigger>
                    <SelectContent className={cntCls}>
                      <SelectItem value="all">All Submissions</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          {/* Panel footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#12152a] border-t border-slate-800">
            <Button size="sm" variant="ghost" onClick={() => setPanelOpen(false)}
              className="h-7 px-3 text-xs text-slate-400 hover:text-white border border-slate-700 bg-transparent hover:bg-[#1e2340]">
              Close
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}
              className="h-7 px-3 text-xs border-slate-600 text-slate-300 hover:text-white bg-transparent hover:bg-[#1e2340]">
              Reset All
            </Button>
            <Button size="sm" onClick={handleApply}
              className="h-7 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}