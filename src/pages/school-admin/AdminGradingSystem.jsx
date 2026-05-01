import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, Trash2, Award, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_GRADES = [
  { letter: 'A1', label: 'Excellent', minScore: 75, maxScore: 100, isPassing: true },
  { letter: 'B2', label: 'Very Good', minScore: 70, maxScore: 74, isPassing: true },
  { letter: 'B3', label: 'Good', minScore: 65, maxScore: 69, isPassing: true },
  { letter: 'C4', label: 'Credit', minScore: 60, maxScore: 64, isPassing: true },
  { letter: 'C5', label: 'Credit', minScore: 55, maxScore: 59, isPassing: true },
  { letter: 'C6', label: 'Credit', minScore: 50, maxScore: 54, isPassing: true },
  { letter: 'D7', label: 'Pass', minScore: 45, maxScore: 49, isPassing: true },
  { letter: 'E8', label: 'Pass', minScore: 40, maxScore: 44, isPassing: true },
  { letter: 'F9', label: 'Fail', minScore: 0, maxScore: 39, isPassing: false },
];

export default function AdminGradingSystem() {
  const user = getCurrentUser();
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    passMark: 40,
    promotionPassCount: 5,
    grades: DEFAULT_GRADES,
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.GradingSystem.filter({ schoolId: user?.schoolId });
    setSystems(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', passMark: 40, promotionPassCount: 5, grades: DEFAULT_GRADES });
    setShowCreate(true);
  }

  function openEdit(sys) {
    setEditing(sys);
    setForm({ name: sys.name, passMark: sys.passMark, promotionPassCount: sys.promotionPassCount, grades: sys.grades || DEFAULT_GRADES });
    setShowCreate(true);
  }

  function updateGrade(idx, field, value) {
    const updated = form.grades.map((g, i) =>
      i === idx ? { ...g, [field]: field === 'isPassing' ? value : (field === 'letter' || field === 'label' ? value : parseFloat(value) || 0) } : g
    );
    setForm({ ...form, grades: updated });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    const payload = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      name: form.name,
      passMark: parseFloat(form.passMark) || 40,
      promotionPassCount: parseInt(form.promotionPassCount) || 5,
      grades: form.grades,
    };
    if (editing) {
      await base44.entities.GradingSystem.update(editing.id, payload);
      toast.success('Grading system updated');
    } else {
      await base44.entities.GradingSystem.create(payload);
      toast.success('Grading system created');
    }
    setSaving(false);
    setShowCreate(false);
    loadData();
  }

  async function setDefault(sys) {
    // clear all defaults then set this one
    await Promise.all(systems.map(s => base44.entities.GradingSystem.update(s.id, { isDefault: s.id === sys.id })));
    toast.success(`"${sys.name}" set as default`);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this grading system?')) return;
    await base44.entities.GradingSystem.delete(id);
    toast.success('Deleted');
    loadData();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grading System</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define grade bands and pass marks for your school</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Grading System</Button>
      </div>

      {systems.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No grading system configured</p>
            <p className="text-sm mt-1">Create one to enable automatic grade collation and promotion decisions</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Grading System</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {systems.map(sys => (
            <Card key={sys.id} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{sys.name}</CardTitle>
                    {sys.isDefault && <Badge className="bg-emerald-100 text-emerald-700">Default</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {!sys.isDefault && (
                      <Button variant="outline" size="sm" onClick={() => setDefault(sys)}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Set Default
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEdit(sys)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(sys.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Pass mark: {sys.passMark}% • Min subjects to pass: {sys.promotionPassCount}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(sys.grades || []).map((g, i) => (
                    <div key={i} className={`text-center p-2 rounded-lg text-sm ${g.isPassing ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      <div className="font-bold text-lg">{g.letter}</div>
                      <div className="text-xs">{g.label}</div>
                      <div className="text-xs opacity-70">{g.minScore}–{g.maxScore}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} Grading System</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Label>System Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. WAEC Standard" />
              </div>
              <div>
                <Label>Pass Mark (%)</Label>
                <Input type="number" min="0" max="100" value={form.passMark} onChange={e => setForm({ ...form, passMark: e.target.value })} />
              </div>
              <div>
                <Label>Min Subjects to Pass</Label>
                <Input type="number" min="1" value={form.promotionPassCount} onChange={e => setForm({ ...form, promotionPassCount: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Grade Bands</Label>
              <div className="space-y-2">
                {form.grades.map((g, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-center text-sm">
                    <Input value={g.letter} onChange={e => updateGrade(i, 'letter', e.target.value)} placeholder="A1" className="h-8" />
                    <Input value={g.label} onChange={e => updateGrade(i, 'label', e.target.value)} placeholder="Excellent" className="h-8" />
                    <Input type="number" value={g.minScore} onChange={e => updateGrade(i, 'minScore', e.target.value)} placeholder="Min" className="h-8" />
                    <Input type="number" value={g.maxScore} onChange={e => updateGrade(i, 'maxScore', e.target.value)} placeholder="Max" className="h-8" />
                    <div className="flex items-center gap-1">
                      <input type="checkbox" checked={g.isPassing} onChange={e => updateGrade(i, 'isPassing', e.target.checked)} id={`pass-${i}`} />
                      <label htmlFor={`pass-${i}`} className="text-xs text-muted-foreground">Pass</label>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setForm({ ...form, grades: [...form.grades, { letter: '', label: '', minScore: 0, maxScore: 0, isPassing: true }] })}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Band
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Create Grading System'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}