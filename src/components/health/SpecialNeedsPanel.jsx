import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MobileSelect from '@/components/mobile/MobileSelect';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import StudentPicker from '@/components/health/StudentPicker';

export default function SpecialNeedsPanel({ specialNeeds, students, classes, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    needType: 'physical_disability',
    description: '',
    accommodations: '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName) {
      toast.error('Student is required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.SpecialNeeds.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        needType: form.needType,
        description: form.description,
        accommodations: form.accommodations.split(',').map(a => a.trim()).filter(Boolean),
      });
      toast.success('Special needs record added');
      onRefresh?.();
      setShowDialog(false);
      setForm({
        studentId: '',
        studentName: '',
        needType: 'physical_disability',
        description: '',
        accommodations: '',
      });
    } catch (error) {
      toast.error('Failed to add record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Special Needs Record</Button>
        </div>
        {specialNeeds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No special needs records</div>
        ) : (
          specialNeeds.map(record => (
            <Card key={record.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold">{record.studentName}</p>
                <p className="text-sm text-muted-foreground capitalize">{record.needType.replace(/_/g, ' ')}</p>
                {record.description && <p className="text-xs mt-2">{record.description}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Special Needs Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <StudentPicker students={students} classes={classes} value={form.studentId} onChange={(id, name) => setForm({ ...form, studentId: id, studentName: name })} disabled={saving} />

            <div>
              <Label>Need Type *</Label>
              <MobileSelect
                value={form.needType}
                onValueChange={v => setForm({ ...form, needType: v })}
                disabled={saving}
                options={[
                  { value: 'physical_disability', label: 'Physical Disability' },
                  { value: 'visual_impairment', label: 'Visual Impairment' },
                  { value: 'hearing_impairment', label: 'Hearing Impairment' },
                  { value: 'learning_disability', label: 'Learning Disability' },
                  { value: 'autism', label: 'Autism' },
                  { value: 'intellectual_disability', label: 'Intellectual Disability' },
                  { value: 'speech_impairment', label: 'Speech Impairment' },
                  { value: 'emotional_behavioral', label: 'Emotional/Behavioral' },
                  { value: 'chronic_illness', label: 'Chronic Illness' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description..." className="resize-none h-20" disabled={saving} />
            </div>

            <div>
              <Label>Accommodations (comma-separated)</Label>
              <Input value={form.accommodations} onChange={e => setForm({ ...form, accommodations: e.target.value })} placeholder="e.g. Wheelchair ramp, Accessible toilet" disabled={saving} />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">Add Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}