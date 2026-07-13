import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEPARTMENTS = ['HR', 'Accounts', 'Security', 'Maintenance', 'IT', 'Administration', 'Transport', 'Catering', 'Library', 'Other'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'casual'];
const STATUSES = ['active', 'inactive', 'on_leave', 'terminated'];

const EMPTY_FORM = {
  fullName: '', email: '', phone: '', department: 'HR', jobTitle: '', employeeId: '',
  gender: '', dateOfBirth: '', address: '', emergencyContactName: '', emergencyContactPhone: '',
  startDate: '', employmentType: 'full_time', status: 'active', notes: '',
};

export default function StaffProfileDialog({ open, onOpenChange, member, schoolUser, onSaved, departments }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({ ...EMPTY_FORM, ...member });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [member, open]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName || !form.department) return toast.error('Name and department are required');
    setSaving(true);
    const payload = { ...form, schoolId: schoolUser.schoolId, schoolName: schoolUser.schoolName };
    if (member?.id) {
      await base44.entities.NonTeachingStaff.update(member.id, payload);
      toast.success('Staff profile updated');
    } else {
      await base44.entities.NonTeachingStaff.create(payload);
      toast.success('Staff member added');
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Staff Profile' : 'Add Staff Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@school.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={v => set('department', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(departments?.length ? departments : DEPARTMENTS).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job Title</Label>
              <Input value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. HR Officer" />
            </div>
            <div>
              <Label>Employee ID</Label>
              <Input value={form.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="EMP-001" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={v => set('employmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Home address" />
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} placeholder="Contact name" />
            </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} placeholder="Phone number" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {member ? 'Save Changes' : 'Add Staff Member'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}