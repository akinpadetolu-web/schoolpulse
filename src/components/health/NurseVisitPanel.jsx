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

export default function NurseVisitPanel({ visits, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '08:00',
    reason: 'illness',
    description: '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName) {
      toast.error('Student is required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.NurseVisitLog.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        visitDate: form.visitDate,
        visitTime: form.visitTime,
        reason: form.reason,
        description: form.description,
      });
      toast.success('Visit logged');
      onRefresh?.();
      setShowDialog(false);
      setForm({
        studentId: '',
        studentName: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: '08:00',
        reason: 'illness',
        description: '',
      });
    } catch (error) {
      toast.error('Failed to log visit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Log Visit</Button>
        </div>
        {visits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No nurse visits</div>
        ) : (
          visits.map(visit => (
            <Card key={visit.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold">{visit.studentName}</p>
                <p className="text-sm text-muted-foreground">{visit.visitDate} - {visit.reason}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Nurse Visit</DialogTitle>
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
                <Label>Visit Date *</Label>
                <Input type="date" value={form.visitDate} onChange={e => setForm({ ...form, visitDate: e.target.value })} disabled={saving} />
              </div>
              <div>
                <Label>Visit Time</Label>
                <Input type="time" value={form.visitTime} onChange={e => setForm({ ...form, visitTime: e.target.value })} disabled={saving} />
              </div>
            </div>

            <div>
              <Label>Reason *</Label>
              <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="illness">Illness</SelectItem>
                  <SelectItem value="injury">Injury</SelectItem>
                  <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                  <SelectItem value="allergy_reaction">Allergy Reaction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details of the visit..." className="resize-none h-20" disabled={saving} />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">Log Visit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}