import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, Pencil, Archive, RotateCcw, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCategories() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", educationLevel: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [c, s] = await Promise.all([
        base44.entities.SubjectCategory.filter({ schoolId }),
        base44.entities.Subject.filter({ schoolId, isArchived: false }),
      ]);
      setCategories(c || []);
      setSubjects(s || []);
    } catch { setCategories([]); setSubjects([]); }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", educationLevel: "" });
    setShowDialog(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name || "", description: c.description || "", educationLevel: c.educationLevel || "" });
    setShowDialog(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Category name is required");
    setSaving(true);
    try {
      const payload = { schoolId, schoolName: user.schoolName, name: form.name.trim(), description: form.description, educationLevel: form.educationLevel, isArchived: editing?.isArchived || false };
      if (editing) {
        await base44.entities.SubjectCategory.update(editing.id, payload);
        toast.success("Category updated");
      } else {
        await base44.entities.SubjectCategory.create(payload);
        toast.success("Category created");
      }
      setShowDialog(false);
      loadData();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  async function toggleArchive(c) {
    await base44.entities.SubjectCategory.update(c.id, { isArchived: !c.isArchived });
    toast.success(c.isArchived ? "Category restored" : "Category archived");
    loadData();
  }

  const active = categories.filter(c => !c.isArchived);
  const archived = categories.filter(c => c.isArchived);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Subject Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Group subjects into categories for easier management</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
      </div>

      {/* Suggested starter categories if none exist */}
      {categories.length === 0 && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium mb-2">Quick start — suggested categories:</p>
          <div className="flex flex-wrap gap-2">
            {["Core", "Science", "Arts", "Commercial", "Vocational", "Languages", "Junior Core"].map(name => (
              <button key={name} onClick={async () => {
                await base44.entities.SubjectCategory.create({ schoolId, schoolName: user.schoolName, name, isArchived: false });
                loadData();
              }} className="text-xs px-3 py-1.5 bg-white border rounded-full hover:bg-primary hover:text-white transition-colors">
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {active.map(c => {
          const subjectCount = subjects.filter(s => s.categoryId === c.id).length;
          return (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{subjectCount} subject{subjectCount !== 1 ? "s" : ""} {c.educationLevel ? `• ${c.educationLevel}` : ""}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleArchive(c)}><Archive className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {archived.map(c => (
          <Card key={c.id} className="border-0 shadow-sm opacity-60">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Tag className="w-5 h-5 text-muted-foreground" /></div>
                <div><p className="font-medium text-muted-foreground">{c.name}</p><Badge variant="secondary" className="text-xs">Archived</Badge></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleArchive(c)}><RotateCcw className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No categories yet. Add one or use the quick start above.</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Category Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Science, Arts, Junior Core" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} /></div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select value={form.educationLevel} onValueChange={v => setForm({ ...form, educationLevel: v })}>
                <SelectTrigger><SelectValue placeholder="All levels (default)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="junior">Junior Secondary only</SelectItem>
                  <SelectItem value="senior">Senior Secondary only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}