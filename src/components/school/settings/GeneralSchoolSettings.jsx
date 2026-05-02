import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Accra', 'Africa/Cairo',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Winnipeg', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland',
];

export default function GeneralSchoolSettings({ school, onSaved }) {
  const [form, setForm] = useState({
    schoolName: school?.schoolName || '',
    address: school?.address || '',
    contactEmail: school?.contactEmail || '',
    contactPhone: school?.contactPhone || '',
    description: school?.description || '',
    timezone: school?.timezone || '',
    schoolLogoUrl: school?.schoolLogoUrl || '',
    primaryColor: school?.primaryColor || '#1e3a5f',
    secondaryColor: school?.secondaryColor || '#f0f4ff',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, schoolLogoUrl: file_url }));
    setUploadingLogo(false);
    toast.success('Logo uploaded');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.School.update(school.id, form);
    toast.success('General settings saved');
    setSaving(false);
    onSaved?.();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4" /> General Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Logo */}
          <div>
            <Label>School Logo</Label>
            <div className="flex items-center gap-4 mt-1">
              {form.schoolLogoUrl && (
                <img src={form.schoolLogoUrl} alt="School Logo" className="w-16 h-16 object-contain rounded-lg border" />
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>{uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>School Name *</Label>
              <Input value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} required className="mt-1" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select timezone" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the school..."
            />
          </div>

          {/* Branding */}
          <div>
            <Label className="text-sm font-semibold">Brand Colors</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondaryColor} onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">Secondary</span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save General Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}