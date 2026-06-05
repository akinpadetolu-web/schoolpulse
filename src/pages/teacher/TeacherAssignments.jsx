import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { createAssignmentNotification } from '@/lib/notificationService';
import { toast } from 'sonner';

const EMPTY_FORM = { title: "", description: "", classIds: [], subjectId: "", dueDate: "", maxScore: 100 };

export default function TeacherAssignments() {
  const { schoolUser: user } = useSchoolAuth();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function toggleClass(classId) {
    setForm(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId],
      subjectId: "",
    }));
  }

  const availableSubjects = subjects.filter(s =>
    form.classIds.length === 0 ||
    form.classIds.some(cid => (user?.teachingAssignments || []).some(ta => ta.subjectId === s.id && ta.classId === cid))
  );

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [a, c, s] = await Promise.all([
        base44.entities.Assignment.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setAssignments(a || []);
      const teachingAssignments = user?.teachingAssignments || [];
      const assignedClassIds = [...new Set(teachingAssignments.map(ta => ta.classId))];
      const assignedSubjectIds = [...new Set(teachingAssignments.map(ta => ta.subjectId))];
      setClasses(assignedClassIds.length > 0 ? (c || []).filter(cl => assignedClassIds.includes(cl.id)) : (c || []));
      setSubjects(assignedSubjectIds.length > 0 ? (s || []).filter(sub => assignedSubjectIds.includes(sub.id)) : (s || []));
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (form.classIds.length === 0) { toast.error("Please select at least one class"); return; }
    setSaving(true);
    try {
      const subj = subjects.find(s => s.id === form.subjectId);
      await Promise.all(form.classIds.map(async (classId) => {
        const cls = classes.find(c => c.id === classId);
        const assignment = {
          schoolId: user.schoolId,
          classId,
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
        };
        await base44.entities.Assignment.create(assignment);
        await createAssignmentNotification(assignment, user);
      }));
      toast.success(`Assignment created for ${form.classIds.length} class${form.classIds.length > 1 ? 'es' : ''}`);
      setForm(EMPTY_FORM);
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); toast.error("Failed to create assignment"); }
    setSaving(false);
  }

  function openEdit(assignment) {
    setEditingAssignment(assignment);
    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      classIds: [assignment.classId],
      subjectId: assignment.subjectId || "",
      dueDate: assignment.dueDate || "",
      maxScore: assignment.maxScore ?? 100,
    });
  }

  function closeEdit() {
    setEditingAssignment(null);
    setForm(EMPTY_FORM);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const subj = subjects.find(s => s.id === form.subjectId);
      await base44.entities.Assignment.update(editingAssignment.id, {
        title: form.title,
        description: form.description,
        subjectId: form.subjectId,
        subjectName: subj?.name || editingAssignment.subjectName,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore) || 100,
      });
      toast.success("Assignment updated");
      closeEdit();
      loadData();
    } catch (err) { console.error(err); toast.error("Failed to update assignment"); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deletingAssignment) return;
    setDeleting(true);
    try {
      await base44.entities.Assignment.delete(deletingAssignment.id);
      toast.success("Assignment deleted");
      setDeletingAssignment(null);
      loadData();
    } catch (err) { console.error(err); toast.error("Failed to delete assignment"); }
    setDeleting(false);
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
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.subjectName} • {a.className}</p>
                  {a.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{a.isPublished ? "Published" : "Draft"}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingAssignment(a)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
          <AssignmentForm
            form={form}
            setForm={setForm}
            classes={classes}
            availableSubjects={availableSubjects}
            toggleClass={toggleClass}
            onSubmit={handleCreate}
            saving={saving}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={v => { if (!v) closeEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Assignment</DialogTitle></DialogHeader>
          <AssignmentForm
            form={form}
            setForm={setForm}
            classes={classes}
            availableSubjects={availableSubjects}
            toggleClass={toggleClass}
            onSubmit={handleEdit}
            saving={saving}
            mode="edit"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAssignment} onOpenChange={v => { if (!v) setDeletingAssignment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingAssignment?.title}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AssignmentForm({ form, setForm, classes, availableSubjects, toggleClass, onSubmit, saving, mode }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>

      {mode === 'create' && (
        <div className="space-y-2">
          <Label>Classes * <span className="text-xs text-muted-foreground font-normal">(select one or more)</span></Label>
          <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
            {classes.map(c => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                <Checkbox checked={form.classIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                <span className="text-sm">{c.className}</span>
              </label>
            ))}
            {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes assigned</p>}
          </div>
          {form.classIds.length > 0 && (
            <p className="text-xs text-primary">{form.classIds.length} class{form.classIds.length > 1 ? 'es' : ''} selected</p>
          )}
        </div>
      )}

      <div className="space-y-2"><Label>Subject</Label>
        <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
        <div className="space-y-2"><Label>Max Score</Label><Input type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })} /></div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {mode === 'create' ? 'Create' : 'Save Changes'}
      </Button>
    </form>
  );
}