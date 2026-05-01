import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Pencil, Archive, RotateCcw, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const LEVEL_PRESETS = [
  { base: "JS1", level: "junior" }, { base: "JS2", level: "junior" }, { base: "JS3", level: "junior" },
  { base: "SS1", level: "senior" }, { base: "SS2", level: "senior" }, { base: "SS3", level: "senior" },
];

export default function AdminClasses() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const school = { id: schoolId, schoolName: user?.schoolName };
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ className: "", baseLevel: "", subsetName: "", educationLevel: "", academicTrack: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [c, s, st] = await Promise.all([
        base44.entities.SchoolClass.filter({ schoolId }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId, role: 'student', isArchived: false }),
      ]);
      setClasses(c || []);
      setSubjects(s || []);
      setStudents(st || []);
    } catch { setClasses([]); setSubjects([]); setStudents([]); }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ className: "", baseLevel: "", subsetName: "", educationLevel: "", academicTrack: "" });
    setShowDialog(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ className: c.className || "", baseLevel: c.baseLevel || "", subsetName: c.subsetName || "", educationLevel: c.educationLevel || "", academicTrack: c.academicTrack || "" });
    setShowDialog(true);
  }

  function applyPreset(preset, subset) {
    const className = subset ? `${preset.base}${subset}` : preset.base;
    setForm({ className, baseLevel: preset.base, subsetName: subset || "", educationLevel: preset.level, academicTrack: "" });
    setShowDialog(true);
    setEditing(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.className.trim()) return toast.error("Class name is required");
    const dupe = classes.find(c => c.className.toLowerCase() === form.className.trim().toLowerCase() && (!editing || c.id !== editing.id));
    if (dupe && !editing) return toast.error("A class with this name already exists");
    setSaving(true);
    try {
      const payload = {
        schoolId, schoolName: user.schoolName,
        className: form.className.trim(),
        baseLevel: form.baseLevel.trim(),
        subsetName: form.subsetName.trim(),
        educationLevel: form.educationLevel,
        academicTrack: form.academicTrack.trim(),
        isArchived: editing?.isArchived || false,
      };
      if (editing) {
        await base44.entities.SchoolClass.update(editing.id, payload);
        toast.success("Class updated");
      } else {
        await base44.entities.SchoolClass.create(payload);
        toast.success("Class created");
      }
      setShowDialog(false);
      loadData();
    } catch { toast.error("Failed to save class"); }
    setSaving(false);
  }

  async function toggleArchive(c) {
    await base44.entities.SchoolClass.update(c.id, { isArchived: !c.isArchived });
    toast.success(c.isArchived ? "Class restored" : "Class archived");
    loadData();
  }

  const active = classes.filter(c => !c.isArchived);
  const archived = classes.filter(c => c.isArchived);

  // Warnings
  const classesWithNoSubjects = active.filter(c => {
    const mapped = subjects.filter(s => (s.applicableClasses || []).includes(c.id));
    return mapped.length === 0;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.length} active classes</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Class</Button>
      </div>

      {/* Smart warnings */}
      {classesWithNoSubjects.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{classesWithNoSubjects.length} class{classesWithNoSubjects.length > 1 ? "es" : ""}</strong> have no subjects mapped:{" "}
            {classesWithNoSubjects.map(c => c.className).join(", ")}. Go to Subjects to assign them.
          </p>
        </div>
      )}

      {/* Quick-create presets */}
      {classes.length === 0 && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium mb-3">Quick add common class levels:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LEVEL_PRESETS.map(p => (
              <div key={p.base} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{p.base}</p>
                <div className="flex gap-1">
                  {["A", "B", "C"].map(arm => (
                    <button key={arm} onClick={() => applyPreset(p, arm)}
                      className="text-xs px-2 py-1 bg-white border rounded hover:bg-primary hover:text-white transition-colors">
                      {p.base}{arm}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>

        {["active", "archived"].map(tab => {
          const list = tab === "active" ? active : archived;
          // Group by baseLevel
          const grouped = list.reduce((acc, c) => {
            const key = c.baseLevel || "Other";
            if (!acc[key]) acc[key] = [];
            acc[key].push(c);
            return acc;
          }, {});

          return (
            <TabsContent key={tab} value={tab}>
              {list.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>{tab === "active" ? "No classes yet. Use the quick-add presets above or create manually." : "No archived classes."}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([baseLevel, items]) => (
                    <div key={baseLevel}>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">{baseLevel}</p>
                      <div className="grid gap-2">
                        {items.map(c => {
                           const subjectCount = subjects.filter(s => (s.applicableClasses || []).includes(c.id)).length;
                           const studentCount = students.filter(st => st.classId === c.id).length;
                           const hasWarning = tab === "active" && subjectCount === 0;
                          return (
                            <Card key={c.id} className={`border-0 shadow-sm ${hasWarning ? 'border-l-4 border-l-amber-400' : ''}`}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${c.educationLevel === "junior" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                    {c.className.slice(0, 3)}
                                  </div>
                                  <div>
                                   <p className="font-medium">{c.className}</p>
                                   <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                     {c.educationLevel && <span className="text-xs text-muted-foreground capitalize">{c.educationLevel}</span>}
                                     {c.academicTrack && <Badge variant="outline" className="text-xs">{c.academicTrack}</Badge>}
                                     <span className="text-xs text-muted-foreground">{studentCount} student{studentCount !== 1 ? "s" : ""}</span>
                                     <span className="text-xs text-muted-foreground">{subjectCount} subject{subjectCount !== 1 ? "s" : ""}</span>
                                     {hasWarning && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No subjects</span>}
                                   </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => toggleArchive(c)}>
                                    {c.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Class Name * <span className="text-xs text-muted-foreground">(e.g. JS1A, SS2 Science B)</span></Label>
              <Input value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} required placeholder="e.g. JS1A" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Level</Label>
                <Input value={form.baseLevel} onChange={e => setForm({ ...form, baseLevel: e.target.value })} placeholder="e.g. JS1" />
              </div>
              <div className="space-y-2">
                <Label>Subset / Arm</Label>
                <Input value={form.subsetName} onChange={e => setForm({ ...form, subsetName: e.target.value })} placeholder="e.g. A, B, Science" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select value={form.educationLevel} onValueChange={v => setForm({ ...form, educationLevel: v })}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior Secondary</SelectItem>
                  <SelectItem value="senior">Senior Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Track <span className="text-xs text-muted-foreground">(optional, e.g. Science, Arts)</span></Label>
              <Input value={form.academicTrack} onChange={e => setForm({ ...form, academicTrack: e.target.value })} placeholder="e.g. Science, Arts, Commercial" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Class"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}