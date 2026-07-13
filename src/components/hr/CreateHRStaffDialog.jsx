import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { hashPassword } from '@/lib/auth';
import { toast } from 'sonner';

export default function CreateHRStaffDialog({ open, onOpenChange, schoolUser, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) return toast.error('Name, email and password are required');
    setSaving(true);

    // Use the same base64 hash as the login flow (auth.js hashPassword)
    const passwordHash = hashPassword(form.password);

    await base44.entities.SchoolUser.create({
      fullName: form.fullName,
      email: form.email,
      username: form.username || form.email,
      passwordHash,
      role: 'hr_staff',
      schoolId: schoolUser.schoolId,
      schoolName: schoolUser.schoolName,
      mustChangePassword: false,
      isArchived: false,
      permittedFeatures: {},
    });

    toast.success(`HR staff ${form.fullName} created`);
    setForm({ fullName: '', email: '', username: '', password: '' });
    setSaving(false);
    onCreated?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add HR Staff Member</DialogTitle>
          <p className="text-sm text-muted-foreground">Create a staff account with delegated HR access.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Jane Doe" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@school.com" />
          </div>
          <div>
            <Label>Username (optional)</Label>
            <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Defaults to email" />
          </div>
          <div>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Initial password" />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create HR Staff
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}