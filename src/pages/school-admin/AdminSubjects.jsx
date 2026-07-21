import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Pencil, Archive, RotateCcw, Search, BookOpen, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECT_STREAM_OPTIONS, STREAM_LABELS, STREAM_COLORS } from '@/lib/streamUtils';

export default function AdminSubjects() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", categoryId: "", educationLevel: "", streamType: "core", isCompulsory: false, applicableClasses: [] });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, c, cl] = await Promise.all([
        base44.entities.Subject.filter({ schoolId }),
        base44.entities.SubjectCategory.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      ]);
      setSubjects(s || []);
      setCategories(c || []);
      setClasses(cl || []);
    } catch { setSubjects([]); setCategories([]); setClasses([]); }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", categoryId: "", educationLevel: "", streamType: "core", isCompulsory: false, applicableClasses: [] });
    setShowDialog(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({ name: s.name || "", code: s.code || "", categoryId: s.categoryId || "", educationLevel: s.educationLevel || "", streamType: s.streamType || "core", isCompulsory: !!s.isCompulsory, applicableClasses: s.applicableClasses || [] });
    setShowDialog(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Subject name is required");
    const dupe = subjects.find(s => s.name.toLowerCase() === form.name.trim().toLowerCase() && (!editing || s.id !== editing.id));
    if (dupe) return toast.error("A subject with this name already exists");
    setSaving(true);
    try {
      const cat = categories.find(c => c.id === form.categoryId);
      const payload = {
        schoolId, schoolName: user.schoolName,
        name: form.name.trim(),
        code: form.code.trim(),
        categoryId: form.categoryId || "",
        categoryName: cat?.name || "",
        streamType: form.streamType || "core",
        educationLevel: form.educationLevel || "",
        isCompulsory: form.isCompulsory,
        applicableClasses: form.applicableClasses,
        isArchived: editing?.isArchived || false,
      };
      if (editing) {
        await base44.entities.Subject.update(editing.id, payload);
        toast.success("Subject updated");
      } else {
        await base44.entities.Subject.create(payload);
        toast.success("Subject created");
      }
      setShowDialog(false);
      loadData();
    } catch (err) { toast.error("Failed to save subject"); }
    setSaving(false);
  }

  async function toggleArchive(s) {
    await base44.entities.Subject.update(s.id, { isArchived: !s.isArchived });
    toast.success(s.isArchived ? "Subject restored" : "Subject archived");
    loadData();
  }

  function toggleClass(classId) {
    setForm(f => ({
      ...f,
      applicableClasses: f.applicableClasses.includes(classId)
        ? f.applicableClasses.filter(id => id !== classId)
        : [...f.applicableClasses, classId]
    }));
  }

  const active = subjects.filter(s => !s.isArchived && (s.name || "").toLowerCase().includes(search.toLowerCase()));
  const archived = subjects.filter(s => s.isArchived && (s.name || "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.length} active subjects</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>

        {["active", "archived"].map(tab => (
          <TabsContent key={tab} value={tab}>
            {(tab === "active" ? active : archived).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{tab === "active" ? "No subjects yet. Add your first subject." : "No archived subjects."}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {(tab === "active" ? active : archived).map(s => {
                  const cat = categories.find(c => c.id === s.categoryId);
                  const classCount = (s.applicableClasses || []).length;
                  return (
                    <Card key={s.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{s.name}</p>
                            {s.code && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{s.code}</span>}
                            {s.isCompulsory && <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Compulsory</Badge>}
                            {s.streamType && s.streamType !== 'core' && <Badge className={`text-xs ${STREAM_COLORS[s.streamType]}`}>{STREAM_LABELS[s.streamType]}</Badge>}
                            {(!s.streamType || s.streamType === 'core') && <Badge className={`text-xs ${STREAM_COLORS.core}`}>Core</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {cat && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{cat.name}</span>}
                            {classCount > 0 && <span>{classCount} class{classCount !== 1 ? "es" : ""}</span>}
                            {s.educationLevel && <span className="capitalize">{s.educationLevel}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleArchive(s)}>
                            {s.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Subject Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
              </div>
              <div className="space-y-2">
                <Label>Education Level</Label>
                <Select value={form.educationLevel} onValueChange={v => setForm({ ...form, educationLevel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior Secondary</SelectItem>
                    <SelectItem value="senior">Senior Secondary</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Stream Type <span className="text-xs text-muted-foreground">(controls which students see this subject)</span></Label>
                <Select value={form.streamType} onValueChange={v => setForm({ ...form, streamType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select stream type" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_STREAM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="compulsory" checked={form.isCompulsory} onChange={e => setForm({ ...form, isCompulsory: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="compulsory" className="cursor-pointer">Mark as Compulsory Subject</Label>
            </div>

            {classes.length > 0 && (
              <div className="space-y-2">
                <Label>Applicable Classes ({form.applicableClasses.length} selected)</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded p-1.5">
                      <input type="checkbox" checked={form.applicableClasses.includes(c.id)} onChange={() => toggleClass(c.id)} className="w-3.5 h-3.5" />
                      <span className="text-sm">{c.className}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Subject"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}