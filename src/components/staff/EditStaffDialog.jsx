import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StaffPermissionsPanel from './StaffPermissionsPanel';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'HR', 'Accounts', 'Security', 'Maintenance', 'IT',
  'Administration', 'Transport', 'Catering', 'Library', 'Other'
];

export default function EditStaffDialog({ open, onOpenChange, staff, onSave, departments }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: 'Administration',
    status: 'active',
  });
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staff) {
      setFormData({
        fullName: staff.fullName || '',
        email: staff.email || '',
        phone: staff.phone || '',
        jobTitle: staff.jobTitle || '',
        department: staff.department || 'Administration',
        status: staff.status || 'active',
      });
      setPermissions(staff.permissions || {});
    }
  }, [staff, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await onSave(staff.id, {
        ...formData,
        permissions,
      });
    } catch (err) {
      toast.error(err.message || 'Error updating staff');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="staff@school.com"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                >
                  {(departments?.length ? departments : DEPARTMENTS).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Position</h3>
            <div>
              <Label className="text-xs">Job Title *</Label>
              <Input
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="e.g., Bursar, Hostel Manager"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Status</h3>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          {/* Permissions */}
          <StaffPermissionsPanel permissions={permissions} setPermissions={setPermissions} />

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}