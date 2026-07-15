import React, { useState } from 'react';
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

const PRESET_ROLES = {
  'Bursar': { department: 'Accounts', permissions: { finance: 'full', reports: 'view' }, genderAccess: '' },
  'Head Hostel Manager': { department: 'Administration', permissions: { hostel: 'full' }, genderAccess: 'all' },
  'Male Hostel Master': { department: 'Administration', permissions: { hostel: 'full' }, genderAccess: 'male' },
  'Female Hostel Mistress': { department: 'Administration', permissions: { hostel: 'full' }, genderAccess: 'female' },
  'Accountant': { department: 'Accounts', permissions: { finance: 'view', reports: 'view' }, genderAccess: '' },
  'Secretary': { department: 'Administration', permissions: { general: 'view' }, genderAccess: '' },
  'Librarian': { department: 'Library', permissions: { library: 'full' }, genderAccess: '' },
  'School Nurse': { department: 'Administration', permissions: { medical: 'full' }, genderAccess: '' },
};

export default function CreateStaffDialog({ open, onOpenChange, onSave, departments }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: 'Administration',
    password: '',
    status: 'active',
  });
  const [permissions, setPermissions] = useState({});
  const [showPasswordGen, setShowPasswordGen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genderAccess, setGenderAccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-12).toUpperCase();
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPasswordGen(true);
  };

  const applyPreset = (presetKey) => {
    const preset = PRESET_ROLES[presetKey];
    setFormData(prev => ({
      ...prev,
      jobTitle: presetKey,
      department: preset.department,
    }));
    setPermissions(preset.permissions);
    setFormData(prev => ({ ...prev, genderAccess: preset.genderAccess || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        ...formData,
        permissions,
        genderAccess,
        employeeId: `EMP-${Date.now()}`,
      });
    } catch (err) {
      toast.error(err.message || 'Error creating staff');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Non-Teaching Staff</DialogTitle>
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
                <Label className="text-xs">Email (Login) *</Label>
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

          {/* Position & Role */}
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
            <div>
              <Label className="text-xs block mb-2">Quick Apply Role</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET_ROLES).map(role => (
                  <Button
                    key={role}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => applyPreset(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Hostel Gender Access */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Hostel Access (Optional)</h3>
            <div>
              <Label className="text-xs block mb-2">Gender Access for Hostel Management</Label>
              <select
                name="genderAccess"
                value={genderAccess}
                onChange={(e) => setGenderAccess(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">No hostel access</option>
                <option value="all">All Students (Head Hostel Manager)</option>
                <option value="male">Male Students Only</option>
                <option value="female">Female Students Only</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Controls which student genders this staff member can manage in the hostel module.</p>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Authentication</h3>
            <div>
              <Label className="text-xs">Password *</Label>
              <div className="flex gap-2">
                <Input
                  name="password"
                  type="text"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter or generate password"
                  readOnly={showPasswordGen}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePassword}
                >
                  Generate
                </Button>
              </div>
              {showPasswordGen && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Auto-generated. Share securely with staff member.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
              {loading ? 'Creating...' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}