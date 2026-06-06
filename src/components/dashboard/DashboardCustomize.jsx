import React, { useState } from 'react';
import { Eye, EyeOff, GripVertical, X, SlidersHorizontal } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export const STUDENT_WIDGETS = {
  passRateTrend: 'Pass Rate Trend',
  attendanceTrend: 'Attendance Trend',
  subjectScores: 'Subject Scores',
  gradeDistribution: 'Grade Distribution',
  genderComparison: 'Gender Comparison',
  classEnrollment: 'Enrollment by Class',
  assignmentByClass: 'Assignment by Class',
  topStudents: 'Top 10 Students',
  underperforming: 'Bottom 10 Students',
  studentTable: 'Student Performance Table',
};

export const TEACHER_WIDGETS = {
  teacherRanking: 'Teacher Ranking',
  teacherWorkload: 'Teacher Workload',
  assignmentsSetVsGraded: 'Assignments Set vs Graded',
  teacherAttTrend: 'Staff Attendance Trend',
  teacherTable: 'Teacher Performance Table',
};

export function getDefaultVisible(widgets) {
  return Object.fromEntries(Object.keys(widgets).map(k => [k, true]));
}

export default function DashboardCustomize({ view, studentVisible, setStudentVisible, teacherVisible, setTeacherVisible, columns, setColumns, onClose }) {
  const widgets = view === 'student' ? STUDENT_WIDGETS : TEACHER_WIDGETS;
  const visible = view === 'student' ? studentVisible : teacherVisible;
  const setVisible = view === 'student' ? setStudentVisible : setTeacherVisible;

  function toggle(k) { setVisible(v => ({ ...v, [k]: !v[k] })); }

  return (
    <div className="bg-[#1e2340] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-indigo-400" /> Customize Dashboard</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {/* Layout columns */}
      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium">Chart Columns</p>
        <div className="flex gap-2">
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setColumns(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${columns === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}>
              {n} {n === 1 ? 'Column' : 'Columns'}
            </button>
          ))}
        </div>
      </div>

      {/* Widget toggles */}
      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium">Widgets — {view === 'student' ? 'Student View' : 'Teacher View'}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(widgets).map(([k, label]) => (
            <button key={k} onClick={() => toggle(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${visible[k] ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-slate-600 text-slate-400'}`}>
              {visible[k] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}