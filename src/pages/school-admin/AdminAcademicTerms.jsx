import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getTerms, checkTermOverlap } from '@/lib/academicTermUtils';

export default function AdminAcademicTerms() {
  const user = getCurrentUser();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    academicYear: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    const data = await getTerms(user?.schoolId);
    setTerms(data);
    setLoading(false);
  }

  function openCreateDialog() {
    setEditing(null);
    setForm({ name: '', academicYear: '', startDate: '', endDate: '' });
    setShowDialog(true);
  }

  function openEditDialog(term) {
    setEditing(term);
    setForm({
      name: term.name,
      academicYear: term.academicYear,
      startDate: term.startDate,
      endDate: term.endDate,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name || !form.academicYear || !form.startDate || !form.endDate) {
      return toast.error('All fields are required');
    }

    if (form.startDate >= form.endDate) {
      return toast.error('Start date must be before end date');
    }

    // Check for overlaps
    const hasOverlap = await checkTermOverlap(
      user?.schoolId,
      form.startDate,
      form.endDate,
      editing?.id
    );
    if (hasOverlap) {
      return toast.error('This date range overlaps with an existing term');
    }

    setSaving(true);
    const payload = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      ...form,
    };

    try {
      if (editing) {
        await base44.entities.AcademicTerm.update(editing.id, payload);
        toast.success('Term updated');
      } else {
        await base44.entities.AcademicTerm.create(payload);
        toast.success('Term created');
      }
      setShowDialog(false);
      loadTerms();
    } catch (err) {
      toast.error('Failed to save term');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this term?')) return;
    await base44.entities.AcademicTerm.delete(id);
    toast.success('Term deleted');
    loadTerms();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Group by academic year
  const grouped = {};
  terms.forEach(t => {
    if (!grouped[t.academicYear]) grouped[t.academicYear] = [];
    grouped[t.academicYear].push(t);
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Academic Terms</h1>
        <Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" /> New Term</Button>
      </div>

      {terms.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium">No terms defined yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first academic term to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort().reverse().map(([year, yearTerms]) => (
            <div key={year}>
              <h2 className="text-lg font-semibold mb-3">{year}</h2>
              <div className="space-y-3">
                {yearTerms.map(term => {
                  const isActive = term.startDate <= today && term.endDate >= today;
                  const isFuture = term.startDate > today;
                  const isPast = term.endDate < today;

                  return (
                    <Card key={term.id} className={`border-0 shadow-sm ${isActive ? 'border-2 border-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{term.name}</h3>
                              {isActive && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                              {isFuture && <Badge variant="outline">Upcoming</Badge>}
                              {isPast && <Badge variant="secondary">Past</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {format(new Date(term.startDate), 'MMM d, yyyy')} → {format(new Date(term.endDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(term)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(term.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Term' : 'Create New Term'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm">Term Name *</Label>
              <Input
                placeholder="e.g., Term 1, Semester 2"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">Academic Year *</Label>
              <Input
                placeholder="e.g., 2025-2026"
                value={form.academicYear}
                onChange={e => setForm({ ...form, academicYear: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">End Date *</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}