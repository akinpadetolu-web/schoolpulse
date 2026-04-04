import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, Trash2, Search, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { autoLinkTeachersToTimetable } from '@/lib/schoolData';

export default function AdminTeacherAssignments() {
  const user = getCurrentUser();
  const schoolId = user?.schoolId;
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignForm, setAssignForm] = useState({ classId: "", subjectId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [t, c, s] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
      ]);
      setTeachers(t || []);
      setClasses(c || []);
      setSubjects(s || []);
    } catch { }
    setLoading(false);
  }

  function openAssign(teacher) {
    setSelectedTeacher(teacher);
    setAssignForm({ classId: "", subjectId: "" });
    setShowDialog(true);
  }

  // Subjects filtered by selected class
  const subjectsForClass = assignForm.classId
    ? subjects.filter(s => (s.applicableClasses || []).includes(assignForm.classId))
    : subjects;

  async function handleAddAssignment(e) {
    e.preventDefault();
    if (!assignForm.classId || !assignForm.subjectId) return toast.error("Class and subject are required");
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === assignForm.classId);
      const subj = subjects.find(s => s.id === assignForm.subjectId);
      const existing = selectedTeacher.teachingAssignments || [];
      const dupe = existing.find(a => a.classId === assignForm.classId && a.subjectId === assignForm.subjectId);
      if (dupe) { toast.error("This assignment already exists"); setSaving(false); return; }
      const updated = [...existing, {
        classId: assignForm.classId,
        className: cls?.className || "",
        subjectId: assignForm.subjectId,
        subjectName: subj?.name || "",
        categoryId: subj?.categoryId || "",
        categoryName: subj?.categoryName || "",
      }];
      await base44.entities.SchoolUser.update(selectedTeacher.id, { teachingAssignments: updated });
      toast.success("Assignment added");
      setAssignForm({ classId: "", subjectId: "" });
      // Auto-link this assignment to timetable
      await autoLinkTeachersToTimetable(schoolId);
      loadData();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  async function removeAssignment(teacher, index) {
    const updated = [...(teacher.teachingAssignments || [])];
    updated.splice(index, 1);
    await base44.entities.SchoolUser.update(teacher.id, { teachingAssignments: updated });
    toast.success("Assignment removed");
    loadData();
  }

  const filtered = teachers.filter(t => (t.fullName || "").toLowerCase().includes(search.toLowerCase()));

  // Warnings
  const teachersWithNoAssignments = teachers.filter(t => !(t.teachingAssignments || []).length);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Assignments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign subjects and classes to teachers</p>
        </div>
      </div>

      {teachersWithNoAssignments.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            {teachersWithNoAssignments.map(t => t.fullName).join(", ")} {teachersWithNoAssignments.length === 1 ? "has" : "have"} no teaching assignments yet.
          </p>
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No teachers found. Add teachers first.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(teacher => {
            const assignments = teacher.teachingAssignments || [];
            return (
              <Card key={teacher.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{teacher.fullName}</p>
                      <p className="text-sm text-muted-foreground">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openAssign(teacher)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Assign
                    </Button>
                  </div>
                  {assignments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((a, i) => (
                        <div key={i} className="flex items-center gap-1 bg-secondary/60 rounded-lg px-2.5 py-1.5 text-xs">
                          <span className="font-medium">{a.subjectName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{a.className}</span>
                          <button onClick={() => removeAssignment(teacher, i)} className="ml-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign to {selectedTeacher?.fullName}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={assignForm.classId} onValueChange={v => setAssignForm({ ...assignForm, classId: v, subjectId: "" })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={assignForm.subjectId} onValueChange={v => setAssignForm({ ...assignForm, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsForClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  {subjectsForClass.length === 0 && <SelectItem value="none" disabled>No subjects for this class</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Add Assignment
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}