import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherAssignments() {
  const user = getCurrentUser();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", classId: "", subjectId: "", dueDate: "", maxScore: 100 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [a, c, s] = await Promise.all([
        base44.entities.Assignment.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setAssignments(a || []);
      setClasses(c || []);
      setSubjects(s || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === form.classId);
      const subj = subjects.find(s => s.id === form.subjectId);
      await base44.entities.Assignment.create({
        schoolId: user.schoolId,
        classId: form.classId,
        className: cls?.className || "",
        subjectId: form.subjectId,
        subjectName: subj?.name || "",
        teacherId: user.id,
        teacherName: user.fullName,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore) || 100,
        isPublished: true,
        isArchived: false,
      });
      setForm({ title: "", description: "", classId: "", subjectId: "", dueDate: "", maxScore: 100 });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create Assignment</Button>
      </div>
      {assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assignments yet.</p>
      ) : (
        <div className="grid gap-3">
          {assignments.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.subjectName} • {a.className}</p>
                  {a.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</p>}
                </div>
                <Badge>{a.isPublished ? "Published" : "Draft"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Class</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Max Score</Label><Input type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}