import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CommunicationSettings({ school, onSaved }) {
  const [form, setForm] = useState({
    defaultSenderEmail: school?.defaultSenderEmail || '',
    notifyGradeUpdates: school?.notifyGradeUpdates ?? true,
    notifyAssignmentPosted: school?.notifyAssignmentPosted ?? true,
    notifyAttendance: school?.notifyAttendance ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.School.update(school.id, form);
    toast.success('Communication settings saved');
    setSaving(false);
    onSaved?.();
  }

  const Toggle = ({ label, description, field }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[field] ? 'bg-primary' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form[field] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Mail className="w-4 h-4" /> Communication Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Default Sender Email</Label>
            <Input
              type="email"
              value={form.defaultSenderEmail}
              onChange={e => setForm(f => ({ ...f, defaultSenderEmail: e.target.value }))}
              placeholder="noreply@yourschool.edu"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Used as the sender for all automated school emails.</p>
          </div>

          <div>
            <Label className="text-sm font-semibold">Notification Preferences</Label>
            <div className="mt-2 border rounded-lg px-4">
              <Toggle
                label="Grade Updates"
                description="Notify parents/students when grades are submitted or updated"
                field="notifyGradeUpdates"
              />
              <Toggle
                label="Assignment Posted"
                description="Notify students when new assignments are published"
                field="notifyAssignmentPosted"
              />
              <Toggle
                label="Attendance Alerts"
                description="Notify parents when students are marked absent"
                field="notifyAttendance"
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Communication Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}