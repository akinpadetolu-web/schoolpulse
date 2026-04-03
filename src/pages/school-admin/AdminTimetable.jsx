import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function AdminTimetable() {
  const user = getCurrentUser();
  const schoolId = user?.schoolId;
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [e, c, s, t] = await Promise.all([
        base44.entities.TimetableEntry.filter({ schoolId }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
      ]);
      setEntries(e || []);
      setClasses(c || []);
      setSubjects(s || []);
      setTeachers(t || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === form.classId);
      const subj = subjects.find(s => s.id === form.subjectId);
      const teacher = teachers.find(t => t.id === form.teacherId);
      await base44.entities.TimetableEntry.create({
        schoolId,
        classId: form.classId,
        className: cls?.className || "",
        subjectId: form.subjectId,
        subjectName: subj?.name || "",
        teacherId: form.teacherId,
        teacherName: teacher?.fullName || "",
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setForm({ classId: "", subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: "" });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  const filteredEntries = selectedClass && selectedClass !== "all"
    ? entries.filter(e => e.classId === selectedClass)
    : entries;

  const groupedByDay = DAYS.map(day => ({
    day,
    items: filteredEntries.filter(e => e.dayOfWeek === day).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
  }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
      </div>

      <div className="mb-6 max-w-xs">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {groupedByDay.map(({ day, items }) => (
          <Card key={day} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">{day}</h3>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No entries</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 bg-secondary/50 rounded-lg p-3">
                      <div className="text-sm font-medium w-24">{item.startTime} - {item.endTime}</div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{item.className} • {item.teacherName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day *</Label>
              <Select value={form.dayOfWeek} onValueChange={v => setForm({ ...form, dayOfWeek: v })}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Add Entry</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}