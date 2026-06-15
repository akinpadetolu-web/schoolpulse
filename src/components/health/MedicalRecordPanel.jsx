import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function MedicalRecordPanel({ records, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    bloodGroup: 'unknown',
    genotype: 'unknown',
    allergies: '',
    medicalConditions: '',
    dietaryRestrictions: '',
    notes: '',
  });

  const handleOpenDialog = (record = null) => {
    if (record) {
      setSelectedRecord(record);
      setForm({
        studentId: record.studentId,
        studentName: record.studentName,
        bloodGroup: record.bloodGroup || 'unknown',
        genotype: record.genotype || 'unknown',
        allergies: (record.allergies || []).join(', '),
        medicalConditions: (record.medicalConditions || []).map(m => m.condition).join(', '),
        dietaryRestrictions: (record.dietaryRestrictions || []).join(', '),
        notes: record.notes || '',
      });
    }
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName) {
      toast.error('Student is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        studentId: form.studentId,
        studentName: form.studentName,
        bloodGroup: form.bloodGroup,
        genotype: form.genotype,
        allergies: form.allergies.split(',').map(a => a.trim()).filter(Boolean),
        dietaryRestrictions: form.dietaryRestrictions.split(',').map(d => d.trim()).filter(Boolean),
        notes: form.notes,
      };

      if (selectedRecord?.id) {
        await base44.entities.StudentMedicalRecord.update(selectedRecord.id, payload);
        toast.success('Record updated');
      } else {
        await base44.entities.StudentMedicalRecord.create(payload);
        toast.success('Record added');
      }

      onRefresh?.();
      setShowDialog(false);
      setSelectedRecord(null);
      setForm({
        studentId: '',
        studentName: '',
        bloodGroup: 'unknown',
        genotype: 'unknown',
        allergies: '',
        medicalConditions: '',
        dietaryRestrictions: '',
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> Add Medical Record</Button>
        </div>
        {records.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No medical records</div>
        ) : (
          records.map(record => (
            <Card key={record.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenDialog(record)}>
              <CardContent className="p-4">
                <p className="font-semibold">{record.studentName}</p>
                {record.bloodGroup && <p className="text-sm">Blood: {record.bloodGroup}</p>}
                {record.allergies?.length > 0 && <p className="text-sm">Allergies: {record.allergies.join(', ')}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.id ? 'Edit Medical Record' : 'Add Medical Record'}</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={v => setForm({ ...form, bloodGroup: v })}>
                  <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Genotype</Label>
                <Select value={form.genotype} onValueChange={v => setForm({ ...form, genotype: v })}>
                  <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AA">AA</SelectItem>
                    <SelectItem value="AS">AS</SelectItem>
                    <SelectItem value="SS">SS</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Allergies (comma-separated)</Label>
              <Input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Peanuts, Dairy, Penicillin" disabled={saving} />
            </div>

            <div>
              <Label>Dietary Restrictions (comma-separated)</Label>
              <Input value={form.dietaryRestrictions} onChange={e => setForm({ ...form, dietaryRestrictions: e.target.value })} placeholder="e.g. Vegetarian, Gluten-free" disabled={saving} />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional medical notes..." className="resize-none h-20" disabled={saving} />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{selectedRecord?.id ? 'Update Record' : 'Add Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}