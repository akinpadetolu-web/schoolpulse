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

const severityColor = {
  minor: 'bg-blue-100 text-blue-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
  critical: 'bg-destructive text-destructive-foreground',
};

export default function IncidentPanel({ incidents, students, classes, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '12:00',
    incidentType: 'injury',
    severity: 'moderate',
    description: '',
    location: '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName) {
      toast.error('Student is required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.MedicalIncident.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        incidentDate: form.incidentDate,
        incidentTime: form.incidentTime,
        incidentType: form.incidentType,
        severity: form.severity,
        description: form.description,
        location: form.location,
      });
      toast.success('Incident reported');
      onRefresh?.();
      setShowDialog(false);
      setForm({
        studentId: '',
        studentName: '',
        incidentDate: new Date().toISOString().split('T')[0],
        incidentTime: '12:00',
        incidentType: 'injury',
        severity: 'moderate',
        description: '',
        location: '',
      });
    } catch (error) {
      toast.error('Failed to report incident');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Report Incident</Button>
        </div>
        {incidents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No incidents reported</div>
        ) : (
          incidents.map(incident => (
            <Card key={incident.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{incident.studentName}</p>
                    <p className="text-sm text-muted-foreground">{incident.incidentDate} - {incident.incidentType}</p>
                  </div>
                  <Badge className={severityColor[incident.severity]}>{incident.severity}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Medical Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <StudentPicker students={students} classes={classes} value={form.studentId} onChange={(id, name) => setForm({ ...form, studentId: id, studentName: name })} disabled={saving} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.incidentDate} onChange={e => setForm({ ...form, incidentDate: e.target.value })} disabled={saving} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.incidentTime} onChange={e => setForm({ ...form, incidentTime: e.target.value })} disabled={saving} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Incident Type *</Label>
                <Select value={form.incidentType} onValueChange={v => setForm({ ...form, incidentType: v })}>
                  <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injury">Injury</SelectItem>
                    <SelectItem value="poisoning">Poisoning</SelectItem>
                    <SelectItem value="allergic_reaction">Allergic Reaction</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger disabled={saving}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Where did it happen?" disabled={saving} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details of the incident..." className="resize-none h-20" disabled={saving} />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">Report Incident</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}