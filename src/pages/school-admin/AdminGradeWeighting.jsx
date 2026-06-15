import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, BarChart3, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateWeightTotal, clearWeightCache } from '@/lib/gradeWeightCalculator';

const ASSESSMENT_TYPES = [
  { value: 'exam', label: 'Exam' },
  { value: 'test', label: 'Test' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'classwork', label: 'Classwork' },
];

const TYPE_COLORS = {
  exam: 'bg-red-100 text-red-700',
  test: 'bg-orange-100 text-orange-700',
  quiz: 'bg-blue-100 text-blue-700',
  assignment: 'bg-purple-100 text-purple-700',
  classwork: 'bg-emerald-100 text-emerald-700',
};

export default function AdminGradeWeighting() {
  const { schoolUser: user } = useSchoolAuth();
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  // Form state
  const [form, setForm] = useState({
    classId: '', subjectId: '', categoryName: '', assessmentType: 'exam', weight: '', description: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [cls, subj, cats] = await Promise.all([
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.GradeCategory.filter({ schoolId: user?.schoolId }),
    ]);
    setClasses(cls || []);
    setSubjects(subj || []);
    setCategories(cats || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingCat(null);
    setForm({ classId: filterClass || '', subjectId: filterSubject || '', categoryName: '', assessmentType: 'exam', weight: '', description: '' });
    setShowDialog(true);
  }

  function openEdit(cat) {
    setEditingCat(cat);
    setForm({
      classId: cat.classId,
      subjectId: cat.subjectId,
      categoryName: cat.categoryName,
      assessmentType: cat.assessmentType || 'exam',
      weight: String(cat.weight),
      description: cat.description || '',
    });
    setShowDialog(true);
  }

  // Preview total weight while filling the form
  const previewTotal = useMemo(() => {
    if (!form.classId || !form.subjectId) return null;
    const existing = categories.filter(c =>
      c.classId === form.classId &&
      c.subjectId === form.subjectId &&
      c.id !== editingCat?.id
    );
    const existingTotal = existing.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    const newWeight = Number(form.weight || 0);
    return Math.round((existingTotal + newWeight) * 100) / 100;
  }, [form.classId, form.subjectId, form.weight, categories, editingCat]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.classId || !form.subjectId || !form.categoryName || !form.assessmentType || form.weight === '') {
      return toast.error('All fields are required');
    }
    const weight = parseFloat(form.weight);
    if (weight <= 0 || weight > 100) return toast.error('Weight must be between 1 and 100');
    if (previewTotal > 100) return toast.error(`Total weight would be ${previewTotal}%. Must not exceed 100%.`);

    // Check duplicate assessmentType for same class/subject (excluding self when editing)
    const dupType = categories.find(c =>
      c.classId === form.classId &&
      c.subjectId === form.subjectId &&
      c.assessmentType === form.assessmentType &&
      c.id !== editingCat?.id
    );
    if (dupType) return toast.error(`A category for "${form.assessmentType}" already exists in this class/subject.`);

    setSaving(true);
    const cls = classes.find(c => c.id === form.classId);
    const subj = subjects.find(s => s.id === form.subjectId);
    const payload = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      classId: form.classId,
      className: cls?.className || '',
      subjectId: form.subjectId,
      subjectName: subj?.name || '',
      categoryName: form.categoryName,
      assessmentType: form.assessmentType,
      weight,
      description: form.description,
    };

    try {
      if (editingCat) {
        await base44.entities.GradeCategory.update(editingCat.id, payload);
        toast.success('Category updated');
      } else {
        await base44.entities.GradeCategory.create(payload);
        toast.success('Category created');
      }
      clearWeightCache();
      setShowDialog(false);
      loadData();
    } catch {
      toast.error('Failed to save category');
    }
    setSaving(false);
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.categoryName}"?`)) return;
    await base44.entities.GradeCategory.delete(cat.id);
    clearWeightCache();
    toast.success('Category deleted');
    loadData();
  }

  const filtered = categories.filter(c =>
    (!filterClass || c.classId === filterClass) &&
    (!filterSubject || c.subjectId === filterSubject)
  );

  // Group by class+subject
  const grouped = {};
  filtered.forEach(cat => {
    const key = `${cat.classId}||${cat.subjectId}`;
    if (!grouped[key]) grouped[key] = { label: `${cat.className} — ${cat.subjectName}`, cats: [] };
    grouped[key].cats.push(cat);
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grade Weighting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure assessment weights per class & subject. Weights must total 100%.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Category</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No weightings configured yet.</p>
            <p className="text-sm mt-1">Create categories to define how grades are weighted per subject.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, { label, cats }]) => {
            const { valid, total } = validateWeightTotal(cats);
            return (
              <Card key={key} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">{label}</CardTitle>
                    <div className="flex items-center gap-2">
                      {valid ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% configured
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> {total}% of 100%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Weight bar */}
                  <div className="flex rounded-full overflow-hidden h-2 mt-2 gap-px">
                    {cats.map((cat, i) => (
                      <div
                        key={cat.id}
                        className={`h-full ${TYPE_COLORS[cat.assessmentType]?.split(' ')[0] || 'bg-slate-300'}`}
                        style={{ width: `${cat.weight}%` }}
                        title={`${cat.categoryName}: ${cat.weight}%`}
                      />
                    ))}
                    {total < 100 && (
                      <div className="h-full bg-muted flex-1" title="Unallocated" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cats.sort((a, b) => b.weight - a.weight).map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={`${TYPE_COLORS[cat.assessmentType] || 'bg-slate-100 text-slate-700'} border-0 text-xs capitalize`}>
                            {cat.assessmentType}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{cat.categoryName}</p>
                            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-bold">{cat.weight}%</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'New Grade Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-1">
            <div>
              <Label className="text-sm">Class *</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Assessment Type *</Label>
              <Select value={form.assessmentType} onValueChange={v => setForm({ ...form, assessmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Category Label *</Label>
              <Input
                value={form.categoryName}
                onChange={e => setForm({ ...form, categoryName: e.target.value })}
                placeholder="e.g. Final Exam, Weekly Quizzes"
              />
            </div>
            <div>
              <Label className="text-sm">Weight (%) *</Label>
              <Input
                type="number" min="1" max="100" step="0.01"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                placeholder="e.g. 60"
              />
              {previewTotal !== null && (
                <div className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${previewTotal > 100 ? 'text-red-600' : previewTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {previewTotal > 100 ? <AlertCircle className="w-3 h-3" /> : previewTotal === 100 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Running total: {previewTotal}% {previewTotal === 100 ? '✓ Perfect' : previewTotal > 100 ? '— over limit!' : `— ${(100 - previewTotal).toFixed(0)}% remaining`}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm">Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Average of all quizzes this term"
              />
            </div>
            <DialogFooter className="pt-1 gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || previewTotal > 100}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingCat ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}