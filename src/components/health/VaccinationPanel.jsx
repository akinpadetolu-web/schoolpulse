import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import StudentPicker from '@/components/health/StudentPicker';

const statusColor = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  exempted: 'bg-slate-100 text-slate-700',
};

export default function VaccinationPanel({ vaccinations, students, classes, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    vaccineName: '',
    vaccinationType: 'polio',
    doseNumber: 1,
    administrationDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    notes: '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName || !form.vaccineName) {
      toast.error('Student and vaccine name are required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.VaccinationRecord.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        vaccineName: form.vaccineName,
        vaccinationType: form.vaccinationType,
        doseNumber: Number(form.doseNumber),
        administrationDate: form.administrationDate,
        status: form.status,
        notes: form.notes,
      });
      toast.success('Vaccination recorded');
      onRefresh?.();
      setShowDialog(false);
      setForm({
        studentId: '',
        studentName: '',
        vaccineName: '',
        vaccinationType: 'polio',
        doseNumber: 1,
        administrationDate: new Date().toISOString().split('T')[0],
        status: 'completed',
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to record vaccination');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Record Vaccination</Button>
        </div>
        {vaccinations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No vaccination records</div>
        ) : (
          vaccinations.map(vac => (
            <Card key={vac.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{vac.studentName}</p>
                    <p className="text-sm text-muted-foreground">{vac.vaccineName} - Dose {vac.doseNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">{vac.administrationDate}</p>
                  </div>
                  <Badge className={statusColor[vac.status]}>{vac.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Vaccination</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <StudentPicker students={students} classes={classes} value={form.studentId} onChange={(id, name) => setForm({ ...form, studentId: id, studentName: name })} disabled={saving} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vaccine Name *</Label>
                <Input value={form.vaccineName} onChange={e => setForm({ ...form, vaccineName: e.target.value })} placeholder="e.g. Pfizer COVID-19" disabled={saving} />
              </div>
              <div>
                <Label>Vaccine Type</Label>
                <Select value={form.vaccinationType} onValueChange={v => setForm({ ...form, vaccinationType: v })}>
                  <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polio">Polio</SelectItem>
                    <SelectItem value="measles">Measles</SelectItem>
                    <SelectItem value="yellow_fever">Yellow Fever</SelectItem>
                    <SelectItem value="covid19">COVID-19</SelectItem>
                    <SelectItem value="hepatitis_b">Hepatitis B</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dose Number</Label>
                <Input type="number" value={form.doseNumber} onChange={e => setForm({ ...form, doseNumber: e.target.value })} min={1} disabled={saving} />
              </div>
              <div>
                <Label>Administration Date *</Label>
                <Input type="date" value={form.administrationDate} onChange={e => setForm({ ...form, administrationDate: e.target.value })} disabled={saving} />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="exempted">Exempted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className="resize-none h-20" disabled={saving} />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">Record Vaccination</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}