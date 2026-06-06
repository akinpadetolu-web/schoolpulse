import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, XCircle, Clock, FileCheck, BookOpen, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'absent',  label: 'Absent',  color: 'bg-red-100 text-red-700',         icon: XCircle },
  { value: 'late',    label: 'Late',    color: 'bg-amber-100 text-amber-700',     icon: Clock },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700',       icon: FileCheck },
];

export default function TeacherAttendance() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendance, setAttendance] = useState({}); // studentId -> { status, note, minutesLate }
  const [existingRecords, setExistingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(null); // studentId with open note field

  useEffect(() => { loadClasses(); }, []);

  useEffect(() => {
    if (selectedClassId) loadStudentsAndAttendance();
  }, [selectedClassId, selectedSubjectId, selectedDate]);

  async function loadClasses() {
    const assignments = user?.teachingAssignments || [];
    const classIds = [...new Set(assignments.map(a => a.classId))];
    const subjectIds = [...new Set(assignments.map(a => a.subjectId))];
    const [allClasses, allSubjects] = await Promise.all([
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
    ]);
    const cls = classIds.length > 0 ? (allClasses || []).filter(c => classIds.includes(c.id)) : (allClasses || []);
    const subs = subjectIds.length > 0 ? (allSubjects || []).filter(s => subjectIds.includes(s.id)) : (allSubjects || []);
    setClasses(cls);
    setSubjects(subs);
    setLoading(false);
  }

  async function loadStudentsAndAttendance() {
    setLoadingStudents(true);
    const query = { schoolId: user?.schoolId, classId: selectedClassId, date: selectedDate };
    if (selectedSubjectId) query.subjectId = selectedSubjectId;
    const [studentList, records] = await Promise.all([
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', classId: selectedClassId, isArchived: false }),
      base44.entities.Attendance.filter(query),
    ]);
    setStudents(studentList || []);
    setExistingRecords(records || []);
    const map = {};
    (records || []).forEach(r => { map[r.studentId] = { status: r.status, note: r.note || '', minutesLate: r.minutesLate || '' }; });
    (studentList || []).forEach(s => { if (!map[s.id]) map[s.id] = { status: 'present', note: '', minutesLate: '' }; });
    setAttendance(map);
    setLoadingStudents(false);
  }

  function setStatus(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }
  function setNote(studentId, note) {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  }
  function setMinutesLate(studentId, minutesLate) {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], minutesLate } }));
  }

  async function handleSave() {
    if (!selectedClassId || students.length === 0) return;
    setSaving(true);
    const existingMap = {};
    existingRecords.forEach(r => { existingMap[r.studentId] = r; });
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const creates = [];
    const updates = [];

    students.forEach(s => {
      const a = attendance[s.id] || { status: 'present', note: '', minutesLate: '' };
      const payload = {
        schoolId: user.schoolId,
        classId: selectedClassId,
        className: selectedClass?.className || '',
        studentId: s.id,
        studentName: s.fullName,
        teacherId: user.id,
        teacherName: user.fullName,
        date: selectedDate,
        status: a.status,
        note: a.note || '',
        ...(selectedSubjectId && { subjectId: selectedSubjectId, subjectName: selectedSubject?.name || '' }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(a.status === 'late' && a.minutesLate ? { minutesLate: Number(a.minutesLate) } : {}),
      };
      if (existingMap[s.id]) {
        const existing = existingMap[s.id];
        const changed = existing.status !== a.status || existing.note !== (a.note || '') || existing.minutesLate !== (a.minutesLate || '');
        if (changed) updates.push(base44.entities.Attendance.update(existing.id, payload));
      } else {
        creates.push(payload);
      }
    });

    try {
      if (creates.length > 0) await Promise.all(creates.map(r => base44.entities.Attendance.create(r)));
      await Promise.all(updates);
      toast.success(`Attendance saved for ${students.length} students${selectedSubject ? ` · ${selectedSubject.name}` : ''}`);
      await loadStudentsAndAttendance();
    } catch (err) {
      toast.error('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const alreadySaved = existingRecords.length > 0;
  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount = Object.values(attendance).filter(a => a.status === 'absent').length;
  const lateCount = Object.values(attendance).filter(a => a.status === 'late').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Attendance</h1>
      <p className="text-muted-foreground mb-6">Mark per-subject attendance for your classes</p>

      {/* Controls */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Class</p>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Subject <span className="text-muted-foreground/50">(optional)</span></p>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All subjects / General" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>General / No Subject</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Date</p>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Start Time</p>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-32" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">End Time</p>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-32" />
            </div>

            {alreadySaved && (
              <Badge variant="secondary" className="self-end mb-0.5">Already saved — editing</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <>
          {loadingStudents ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No students found in {selectedClass?.className}.</p>
          ) : (
            <>
              {/* Summary */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Present: {presentCount}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                  <XCircle className="w-4 h-4" /> Absent: {absentCount}
                </div>
                {lateCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4" /> Late: {lateCount}
                  </div>
                )}
                <div className="text-sm text-muted-foreground flex items-center px-2">Total: {students.length}</div>
              </div>

              {/* Student list */}
              <div className="space-y-2 mb-6">
                {students.map((s, i) => {
                  const a = attendance[s.id] || { status: 'present', note: '', minutesLate: '' };
                  const isNoteOpen = noteOpen === s.id;
                  return (
                    <Card key={s.id} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{s.fullName}</p>
                              {s.studentId && <p className="text-xs text-muted-foreground">{s.studentId}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setStatus(s.id, opt.value)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${a.status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setNoteOpen(isNoteOpen ? null : s.id)}
                              className={`p-1.5 rounded-md transition-colors ${a.note ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-secondary'}`}
                              title="Add note/remark"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded note / late minutes */}
                        {(isNoteOpen || a.status === 'late') && (
                          <div className="mt-2.5 flex flex-wrap gap-2 pl-11">
                            {a.status === 'late' && (
                              <Input
                                type="number"
                                placeholder="Minutes late"
                                value={a.minutesLate}
                                onChange={e => setMinutesLate(s.id, e.target.value)}
                                className="w-36 h-7 text-xs"
                                min={0}
                              />
                            )}
                            {isNoteOpen && (
                              <Input
                                placeholder="Remarks / notes for parent…"
                                value={a.note}
                                onChange={e => setNote(s.id, e.target.value)}
                                className="flex-1 min-w-[180px] h-7 text-xs"
                              />
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {alreadySaved ? 'Update Attendance' : 'Save Attendance'}
              </Button>
            </>
          )}
        </>
      )}

      {!selectedClassId && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a class and date to mark attendance</p>
          <p className="text-xs mt-1 opacity-70">Optionally select a subject to record per-lesson attendance</p>
        </div>
      )}
    </div>
  );
}