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
import { Plus, Loader2, BookOpen } from 'lucide-react';

export default function TeacherMaterials() {
  const user = getCurrentUser();
  const [materials, setMaterials] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", content: "", classId: "", subjectId: "", topic: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [m, c, s] = await Promise.all([
        base44.entities.LessonMaterial.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setMaterials(m || []);
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
      await base44.entities.LessonMaterial.create({
        schoolId: user.schoolId,
        classId: form.classId,
        className: cls?.className || "",
        subjectId: form.subjectId,
        subjectName: subj?.name || "",
        teacherId: user.id,
        teacherName: user.fullName,
        title: form.title,
        description: form.description,
        content: form.content,
        topic: form.topic,
        isPublished: true,
      });
      setForm({ title: "", description: "", content: "", classId: "", subjectId: "", topic: "" });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Lesson Materials</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Material</Button>
      </div>
      {materials.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No materials yet.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {materials.map(m => (
            <Card key={m.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold">{m.title}</p>
                <p className="text-sm text-muted-foreground">{m.subjectName} • {m.className} {m.topic ? `• ${m.topic}` : ""}</p>
                {m.description && <p className="text-sm mt-2">{m.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Topic</Label><Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></div>
            <div className="space-y-2"><Label>Class</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Content</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} /></div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save Material</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}