import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export default function SpecialNeedsPanel({ specialNeeds, onRefresh }) {
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Student ID *</Label>
                <Input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="Student ID" disabled={saving} />
              </div>
              <div>
                <Label>Student Name *</Label>
                <Input value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} placeholder="Student name" disabled={saving} />
              </div>
            </div>

            <div>
              <Label>Need Type *</Label>
              <Select value={form.needType} onValueChange={v => setForm({ ...form, needType: v })}>
                <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_disability">Physical Disability</SelectItem>
                  <SelectItem value="visual_impairment">Visual Impairment</SelectItem>
                  <SelectItem value="hearing_impairment">Hearing Impairment</SelectItem>
                  <SelectItem value="learning_disability">Learning Disability</SelectItem>
                  <SelectItem value="autism">Autism</SelectItem>
                  <SelectItem value="intellectual_disability">Intellectual Disability</SelectItem>
                  <SelectItem value="speech_impairment">Speech Impairment</SelectItem>
                  <SelectItem value="emotional_behavioral">Emotional/Behavioral</SelectItem>
                  <SelectItem value="chronic_illness">Chronic Illness</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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