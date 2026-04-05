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
import { Plus, Loader2, BookOpen, FileText, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherMaterials() {
  const user = getCurrentUser();
  const [materials, setMaterials] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", content: "", classId: "", subjectId: "", topic: "" });
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  function handlePdfChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("File must be under 100MB"); return; }
    setPdfFile(file);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setUploading(false);
    try {
      let fileUrl = "";
      if (pdfFile) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file: pdfFile });
        fileUrl = result.file_url || "";
        setUploading(false);
      }
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
        fileUrl,
        isPublished: true,
      });
      setForm({ title: "", description: "", content: "", classId: "", subjectId: "", topic: "" });
      setPdfFile(null);
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
    setUploading(false);
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.subjectName} • {m.className} {m.topic ? `• ${m.topic}` : ""}</p>
                    {m.description && <p className="text-sm mt-2">{m.description}</p>}
                  </div>
                  {m.fileUrl && (
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/5 transition-colors">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                  )}
                </div>
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
            <div className="space-y-2">
              <Label>PDF File (optional, max 100MB)</Label>
              <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors bg-muted/20">
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  {pdfFile ? pdfFile.name : "Click to select a PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
              </label>
              {pdfFile && (
                <p className="text-xs text-muted-foreground">{(pdfFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {uploading ? "Uploading PDF..." : "Save Material"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}