import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { History, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ROLES = [
  { key: 'student', label: 'Students', description: 'Can view their own grades, attendance and assignments from earlier sessions' },
  { key: 'parent', label: 'Parents', description: 'Can view their children\'s records from earlier sessions' },
  { key: 'teacher', label: 'Teachers', description: 'Can view grades, attendance and assignments from earlier sessions' },
];

export default function PastSessionAccessSettings({ school, onSaved }) {
  const [access, setAccess] = useState({ student: false, parent: false, teacher: false, ...school?.pastSessionAccess });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await base44.entities.School.update(school.id, { pastSessionAccess: access });
    toast.success('Past session access saved');
    setSaving(false);
    onSaved?.();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><History className="w-4 h-4" /> Past Session Access</CardTitle>
        <p className="text-sm text-muted-foreground">
          Students, parents and teachers only see the current academic session. Authorize a group below to let them view earlier sessions too.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg px-4">
          {ROLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch checked={access[key]} onCheckedChange={(v) => setAccess(a => ({ ...a, [key]: v }))} />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Access Settings
        </Button>
      </CardContent>
    </Card>
  );
}