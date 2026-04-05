import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminGradeWeighting() {
  const user = getCurrentUser();
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [form, setForm] = useState({
    categoryName: '',
    weight: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

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

  async function handleCreate(e) {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !form.categoryName || !form.weight) {
      return toast.error('All fields are required');
    }

    const weight = parseFloat(form.weight);
    if (weight < 0 || weight > 100) {
      return toast.error('Weight must be between 0 and 100');
    }

    // Check if total weight for this subject exceeds 100%
    const classSubjCategories = categories.filter(
      c => c.classId === selectedClass && c.subjectId === selectedSubject
    );
    const totalWeight = classSubjCategories.reduce((sum, c) => sum + c.weight, 0) + weight;
    if (totalWeight > 100) {
      return toast.error(`Total weight would be ${totalWeight}%. Maximum is 100%.`);
    }

    setSaving(true);
    const cls = classes.find(c => c.id === selectedClass);
    const subj = subjects.find(s => s.id === selectedSubject);

    const newCategory = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      classId: selectedClass,
      className: cls.className,
      subjectId: selectedSubject,
      subjectName: subj.name,
      categoryName: form.categoryName,
      weight,
      description: form.description,
    };

    await base44.entities.GradeCategory.create(newCategory);
    toast.success('Category created');
    setForm({ categoryName: '', weight: '', description: '' });
    setShowCreate(false);
    loadData();
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this category?')) return;
    await base44.entities.GradeCategory.delete(id);
    toast.success('Category deleted');
    loadData();
  }

  const filtered = categories.filter(
    c => !selectedClass || !selectedSubject || (c.classId === selectedClass && c.subjectId === selectedSubject)
  );

  const grouped = {};
  filtered.forEach(cat => {
    const key = `${cat.className} - ${cat.subjectName}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cat);
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Grade Weighting</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Category</Button>
      </div>

      <div className="grid gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Filter by Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Filter by Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No weightings configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, cats]) => (
            <Card key={key} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{key}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total weight: {cats.reduce((sum, c) => sum + c.weight, 0)}%
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cats.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{cat.weight}%</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cat.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Grade Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-sm">Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Category Name *</Label>
              <Input
                value={form.categoryName}
                onChange={e => setForm({ ...form, categoryName: e.target.value })}
                placeholder="e.g. Assignments, Tests, Exams"
              />
            </div>
            <div>
              <Label className="text-sm">Weight (%) *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                placeholder="e.g. 40"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Category
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}