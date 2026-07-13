import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { clearFeatureCache } from '@/lib/featureToggleManager';

const FEATURE_OPTIONS = [
  { key: 'adminHealth',      label: 'Health & Medical' },
  { key: 'adminLibrary',     label: 'Library' },
  { key: 'adminHostel',      label: 'Hostel Management' },
  { key: 'adminInventory',   label: 'Inventory' },
  { key: 'adminFinance',     label: 'Finance & Fees' },
  { key: 'adminHR',          label: 'HR Module' },
  { key: 'adminStudents',    label: 'Students' },
  { key: 'adminTeachers',    label: 'Teachers' },
  { key: 'staffAttendance',  label: 'Clock In/Out' },
  { key: 'leaveRequests',    label: 'Leave Requests' },
  { key: 'teacherWorkload',  label: 'Teacher Workload' },
  { key: 'attendance',       label: 'Student Attendance' },
  { key: 'announcements',    label: 'Announcements' },
];

export default function StaffAccessControl() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStaff = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    try {
      const data = await base44.entities.SchoolUser.filter({
        schoolId, role: 'hr_staff', isArchived: false
      });
      setStaff(data || []);
    } catch (err) {
      toast.error('Failed to load staff');
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const toggleFeature = async (staffId, featureKey, checked) => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;

    // Optimistic update
    const newPerms = { ...(member.permittedFeatures || {}), [featureKey]: checked };
    setStaff(prev => prev.map(s =>
      s.id === staffId ? { ...s, permittedFeatures: newPerms } : s
    ));

    try {
      await base44.entities.SchoolUser.update(staffId, { permittedFeatures: newPerms });
      clearFeatureCache();
    } catch (err) {
      toast.error('Failed to update permission — reverting');
      setStaff(prev => prev.map(s =>
        s.id === staffId ? { ...s, permittedFeatures: { ...(member.permittedFeatures || {}), [featureKey]: !checked } } : s
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Staff Access Control
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Check off which pages and features each non-teaching staff member can see on their dashboard.
        </p>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-sm">No non-teaching staff accounts yet. Create staff first to manage their access.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {staff.map(member => {
            const pf = member.permittedFeatures || {};
            const enabledCount = FEATURE_OPTIONS.filter(f => pf[f.key] === true).length;
            return (
              <Card key={member.id}>
                <CardContent className="p-5">
                  {/* Staff header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{member.fullName}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                          <span>{member.jobTitle || 'Staff'}</span>
                          {member.department && <span>· {member.department}</span>}
                          <span>· {member.email}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs w-fit">
                      {enabledCount}/{FEATURE_OPTIONS.length} features
                    </Badge>
                  </div>

                  {/* Feature checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {FEATURE_OPTIONS.map(feature => (
                      <label
                        key={feature.key}
                        htmlFor={`${member.id}-${feature.key}`}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`${member.id}-${feature.key}`}
                          checked={pf[feature.key] === true}
                          onCheckedChange={checked => toggleFeature(member.id, feature.key, !!checked)}
                        />
                        <span className="text-sm">{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}