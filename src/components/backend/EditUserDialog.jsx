import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditUserDialog({ open, onOpenChange, user, onSaved }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [user?.id]);

  async function handleSave() {
    if (!fullName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    await base44.entities.SchoolUser.update(user.id, {
      fullName: fullName.trim(),
      email: email.trim(),
    });
    toast.success('User updated');
    setSaving(false);
    if (onSaved) onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <p className="text-sm text-muted-foreground">{user?.username}</p>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}