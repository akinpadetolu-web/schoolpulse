import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const genotypeColor = {
  AA: 'bg-blue-100 text-blue-700',
  AS: 'bg-amber-100 text-amber-700',
  SS: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-700',
};

export default function MedicalRecordPanel({ records, search, onRefresh }) {
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
  });

  const filteredRecords = records.filter(r =>
    r.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (record = null) => {
    if (record) {
      setSelectedRecord(record);
      setForm({
        studentId: record.studentId,
        studentName: record.studentName,
        bloodGroup: record.bloodGroup || 'unknown',
        genotype: record.genotype || 'unknown',
        allergies: (record.allergies || []).join(', '),
      });
    }
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId) {
      toast.error('Student ID is required');
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
      };

      if (selectedRecord?.id) {
        await base44.entities.StudentMedicalRecord.update(selectedRecord.id, payload);
        toast.success('Record updated');
      } else {
        await base44.entities.StudentMedicalRecord.create(payload);
        toast.success('Record created');
      }

      onRefresh?.();
      setShowDialog(false);
      setSelectedRecord(null);
    } catch (error) {
      toast.error('Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{records.length === 0 ? 'No medical records' : 'No matching records'}</p>
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> Create Record</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> New Record</Button>
      </div>

      <div className="grid gap-4">
        {filteredRecords.map(record => (
          <Card key={record.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-semibold">{record.studentName}</h3>
                  <p className="text-sm text-muted-foreground">{record.className}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(record)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                <Badge>{record.bloodGroup}</Badge>
                <Badge className={genotypeColor[record.genotype]}>{record.genotype}</Badge>
              </div>

              {record.allergies?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Allergies:</span> {record.allergies.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.id ? 'Edit Medical Record' : 'Create Medical Record'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Student ID *</Label>
              <Input
                value={form.studentId}
                onChange={e => setForm({ ...form, studentId: e.target.value })}
                placeholder="Student ID"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Student Name</Label>
              <Input
                value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })}
                placeholder="Full name"
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={v => setForm({ ...form, bloodGroup: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Genotype</Label>
                <Select value={form.genotype} onValueChange={v => setForm({ ...form, genotype: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['AA', 'AS', 'SS', 'unknown'].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Allergies (comma-separated)</Label>
              <Input
                value={form.allergies}
                onChange={e => setForm({ ...form, allergies: e.target.value })}
                placeholder="e.g. Peanuts, Penicillin"
                disabled={saving}
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {selectedRecord?.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}