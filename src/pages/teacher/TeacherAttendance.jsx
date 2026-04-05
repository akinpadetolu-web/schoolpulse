import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700', icon: XCircle },
  { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700', icon: FileCheck },
];

export default function TeacherAttendance() {
  const user = getCurrentUser();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState({}); // studentId -> status
  const [existingRecords, setExistingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) loadStudentsAndAttendance();
  }, [selectedClassId, selectedDate]);

  async function loadClasses() {
    const teachingAssignments = user?.teachingAssignments || [];
    const classIds = [...new Set(teachingAssignments.map(ta => ta.classId))];
    if (classIds.length === 0) {
      // fallback: load all classes for this teacher's school
      const all = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false });
      setClasses(all || []);
    } else {
      const all = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false });
      setClasses((all || []).filter(c => classIds.includes(c.id)));
    }
    setLoading(false);
  }

  async function loadStudentsAndAttendance() {
    setLoadingStudents(true);
    const [studentList, records] = await Promise.all([
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', classId: selectedClassId, isArchived: false }),
      base44.entities.Attendance.filter({ schoolId: user?.schoolId, classId: selectedClassId, date: selectedDate }),
    ]);
    setStudents(studentList || []);
    setExistingRecords(records || []);
    // Pre-fill attendance from existing records
    const map = {};
    (records || []).forEach(r => { map[r.studentId] = r.status; });
    // Default all students to 'present' if no record yet
    (studentList || []).forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
    setAttendance(map);
    setLoadingStudents(false);
  }

  function setStatus(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!selectedClassId || students.length === 0) return;
    setSaving(true);
    const existingMap = {};
    existingRecords.forEach(r => { existingMap[r.studentId] = r; });

    const creates = [];
    const updates = [];

    students.forEach(s => {
      const status = attendance[s.id] || 'present';
      if (existingMap[s.id]) {
        if (existingMap[s.id].status !== status) {
          updates.push(base44.entities.Attendance.update(existingMap[s.id].id, { status }));
        }
      } else {
        creates.push({
          schoolId: user.schoolId,
          classId: selectedClassId,
          className: classes.find(c => c.id === selectedClassId)?.className || '',
          studentId: s.id,
          studentName: s.fullName,
          teacherId: user.id,
          teacherName: user.fullName,
          date: selectedDate,
          status,
        });
      }
    });

    if (creates.length > 0) await base44.entities.Attendance.bulkCreate(creates);
    await Promise.all(updates);

    toast.success(`Attendance saved for ${students.length} students`);
    await loadStudentsAndAttendance();
    setSaving(false);
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const alreadySaved = existingRecords.length > 0;
  const counts = Object.values(attendance);
  const presentCount = counts.filter(s => s === 'present').length;
  const absentCount = counts.filter(s => s === 'absent').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Attendance</h1>
      <p className="text-muted-foreground mb-6">Mark daily attendance for your classes</p>

      {/* Controls */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {selectedClassId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {alreadySaved && <Badge variant="secondary">Already saved — editing</Badge>}
            </div>
          )}
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
                <div className="text-sm text-muted-foreground flex items-center px-2">Total: {students.length}</div>
              </div>

              {/* Student list */}
              <div className="space-y-2 mb-6">
                {students.map((s, i) => {
                  const currentStatus = attendance[s.id] || 'present';
                  return (
                    <Card key={s.id} className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{s.fullName}</p>
                            {s.studentId && <p className="text-xs text-muted-foreground">{s.studentId}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(s.id, opt.value)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${currentStatus === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
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
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a class and date to mark attendance</p>
        </div>
      )}
    </div>
  );
}