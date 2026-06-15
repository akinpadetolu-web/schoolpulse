import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { clearFeatureCache } from '@/lib/featureToggleManager';

const HR_FEATURES = [
  { key: 'adminHR', label: 'HR Module', description: 'View and manage HR staff directory' },
  { key: 'staffAttendance', label: 'Staff Clock In/Out', description: 'Mark and view staff attendance' },
  { key: 'leaveRequests', label: 'Leave Requests', description: 'Submit and review leave requests' },
  { key: 'teacherWorkload', label: 'Teacher Workload', description: 'View teacher workload reports' },
  { key: 'adminTeachers', label: 'Teachers Directory', description: 'View teacher profiles' },
  { key: 'adminStudents', label: 'Students Directory', description: 'View student profiles' },
  { key: 'attendance', label: 'Student Attendance', description: 'View student attendance records' },
  { key: 'announcements', label: 'Announcements', description: 'View and post announcements' },
];

export default function HRStaffPermissionsDialog({ open, onOpenChange, member, onSaved }) {
  const [permissions, setPermissions] = useState(() => {
    const p = member?.permittedFeatures || {};
    const result = {};
    HR_FEATURES.forEach(f => { result[f.key] = p[f.key] === true; });
    return result;
  });
  const [saving, setSaving] = useState(false);

  // Reset when member changes
  React.useEffect(() => {
    if (member) {
      const p = member?.permittedFeatures || {};
      const result = {};
      HR_FEATURES.forEach(f => { result[f.key] = p[f.key] === true; });
      setPermissions(result);
    }
  }, [member?.id]);

  async function handleSave() {
    setSaving(true);
    await base44.entities.SchoolUser.update(member.id, { permittedFeatures: permissions });
    clearFeatureCache();
    toast.success(`Permissions updated for ${member.fullName}`);
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  }

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Manage Permissions — {member?.fullName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which HR features this staff member can access. School admin always retains full oversight.
          </p>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {HR_FEATURES.map(feature => (
            <div key={feature.key} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
              <Checkbox
                id={feature.key}
                checked={permissions[feature.key] || false}
                onCheckedChange={checked => setPermissions(prev => ({ ...prev, [feature.key]: !!checked }))}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor={feature.key} className="text-sm font-medium cursor-pointer">{feature.label}</label>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">{enabledCount} feature{enabledCount !== 1 ? 's' : ''} enabled</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Permissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}