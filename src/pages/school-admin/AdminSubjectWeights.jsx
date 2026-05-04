import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, Weight } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminSubjectWeights() {
  const { schoolUser: user } = useSchoolAuth();
  const [gradingSystem, setGradingSystem] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [grading, subj] = await Promise.all([
      base44.entities.GradingSystem.filter({ schoolId: user?.schoolId }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
    ]);
    setGradingSystem(grading?.[0]);
    setSubjects(subj || []);
    setLoading(false);
  }

  async function handleAddWeight(e) {
    e.preventDefault();
    if (!selectedSubject || !weight) {
      return toast.error('All fields are required');
    }

    const weightNum = parseFloat(weight);
    if (weightNum < 0 || weightNum > 100) {
      return toast.error('Weight must be between 0 and 100');
    }

    const existingWeights = gradingSystem?.subjectWeights || [];
    if (existingWeights.find(sw => sw.subjectId === selectedSubject)) {
      return toast.error('Subject already has a weight configured');
    }

    setSaving(true);
    const subject = subjects.find(s => s.id === selectedSubject);
    const updatedWeights = [...existingWeights, {
      subjectId: selectedSubject,
      subjectName: subject.name,
      weight: weightNum,
    }];

    await base44.entities.GradingSystem.update(gradingSystem.id, {
      subjectWeights: updatedWeights,
    });

    toast.success('Weight added');
    setSelectedSubject('');
    setWeight('');
    setShowAdd(false);
    loadData();
    setSaving(false);
  }

  async function handleRemoveWeight(subjectId) {
    if (!confirm('Remove this weight?')) return;
    const updated = gradingSystem.subjectWeights.filter(sw => sw.subjectId !== subjectId);
    await base44.entities.GradingSystem.update(gradingSystem.id, { subjectWeights: updated });
    toast.success('Weight removed');
    loadData();
  }

  async function handleUpdateWeight(subjectId, newWeight) {
    const weightNum = parseFloat(newWeight);
    if (weightNum < 0 || weightNum > 100) {
      return toast.error('Weight must be between 0 and 100');
    }
    const updated = gradingSystem.subjectWeights.map(sw =>
      sw.subjectId === subjectId ? { ...sw, weight: weightNum } : sw
    );
    await base44.entities.GradingSystem.update(gradingSystem.id, { subjectWeights: updated });
    toast.success('Weight updated');
    loadData();
  }

  const currentWeights = gradingSystem?.subjectWeights || [];
  const totalWeight = currentWeights.reduce((sum, sw) => sum + sw.weight, 0);
  const availableSubjects = subjects.filter(s => !currentWeights.find(sw => sw.subjectId === s.id));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Subject Weights for Report Card</h1>
        <Button onClick={() => setShowAdd(true)} disabled={availableSubjects.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> Add Subject Weight
        </Button>
      </div>

      {currentWeights.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Weight className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No subject weights configured. All subjects will have equal weight in report cards.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configured Weights</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total weight: <Badge variant={totalWeight === 100 ? 'default' : 'outline'}>{totalWeight}%</Badge>
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentWeights.map(sw => (
                  <div key={sw.subjectId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{sw.subjectName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={sw.weight}
                          onChange={(e) => handleUpdateWeight(sw.subjectId, e.target.value)}
                          className="w-16 h-8 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveWeight(sw.subjectId)}
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
          
          {totalWeight !== 100 && (
            <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-amber-400">
              <CardContent className="py-3 text-sm text-amber-800">
                ⚠️ Total weight is {totalWeight}%. Consider setting it to 100% for accurate calculations.
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Subject Weight</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWeight} className="space-y-4">
            <div>
              <Label className="text-sm">Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Weight (%) *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Weight
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}