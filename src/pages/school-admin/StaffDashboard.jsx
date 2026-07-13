import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AccountSettings from '@/components/common/AccountSettings';
import {
  Heart, DollarSign, BookOpen, Home, Package, Briefcase,
  BarChart3, Truck, Settings, CheckCircle2, Mail, Phone,
  Building2, User, CreditCard
} from 'lucide-react';

const MODULE_CONFIG = {
  medical:   { name: 'Medical / Clinic',     icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800' },
  finance:   { name: 'Finance',              icon: DollarSign, color: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-800' },
  library:   { name: 'Library',               icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800' },
  hostel:    { name: 'Hostel Management',     icon: Home,       color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  inventory: { name: 'Inventory',             icon: Package,    color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  transport: { name: 'Transport',             icon: Truck,      color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  hr:        { name: 'Human Resources',       icon: Briefcase,  color: 'text-slate-600',   bg: 'bg-slate-50 dark:bg-slate-900/20',  border: 'border-slate-200 dark:border-slate-800' },
  reports:   { name: 'Reports & Analytics',    icon: BarChart3,  color: 'text-cyan-600',    bg: 'bg-cyan-50 dark:bg-cyan-900/20',   border: 'border-cyan-200 dark:border-cyan-800' },
  general:   { name: 'General',               icon: Settings,   color: 'text-slate-600',   bg: 'bg-slate-50 dark:bg-slate-900/20',  border: 'border-slate-200 dark:border-slate-800' },
};

const PERMISSION_LABELS = {
  view: 'View',
  create: 'Create & Edit',
  approve: 'Approve',
  reports: 'Generate Reports',
  export: 'Export Data',
};

function normalizePerms(perms) {
  if (perms === 'full') return ['view', 'create', 'approve'];
  if (perms === 'view') return ['view'];
  if (Array.isArray(perms)) return perms;
  return [];
}

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || !user?.schoolId) { setLoading(false); return; }
    async function load() {
      try {
        const records = await base44.entities.NonTeachingStaff.filter({
          email: user.email, schoolId: user.schoolId, isArchived: false
        });
        setStaffProfile((records || [])[0]);
      } catch (e) {
        console.error('Failed to load staff profile:', e);
      }
      setLoading(false);
    }
    load();
  }, [user?.email, user?.schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const staffPermissions = user?.staffPermissions || {};
  const hasPermissions = Object.keys(staffPermissions).length > 0;

  const profile = {
    fullName:      user?.fullName || staffProfile?.fullName || '—',
    email:         user?.email || '—',
    phone:         staffProfile?.phone || '—',
    jobTitle:      user?.jobTitle || staffProfile?.jobTitle || '—',
    department:    user?.department || staffProfile?.department || '—',
    schoolName:    user?.schoolName || '—',
    employeeId:    staffProfile?.employeeId || '—',
    employmentType: staffProfile?.employmentType || '',
    status:        staffProfile?.status || 'active',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile.fullName}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {profile.schoolName} — {profile.jobTitle}
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField icon={User} label="Full Name" value={profile.fullName} />
            <ProfileField icon={Mail} label="Email" value={profile.email} />
            <ProfileField icon={Phone} label="Phone" value={profile.phone} />
            <ProfileField icon={Briefcase} label="Job Title" value={profile.jobTitle} />
            <ProfileField icon={Building2} label="Department" value={profile.department} />
            <ProfileField icon={CreditCard} label="Employee ID" value={profile.employeeId} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge className={profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
              {profile.status?.charAt(0).toUpperCase() + profile.status?.slice(1)}
            </Badge>
            {profile.employmentType && (
              <Badge variant="outline" className="capitalize">
                {profile.employmentType.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Roles & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5" /> Assigned Roles &amp; Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPermissions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(staffPermissions).map(([moduleKey, perms]) => {
                const config = MODULE_CONFIG[moduleKey] || MODULE_CONFIG.general;
                const Icon = config.icon;
                const permList = normalizePerms(perms);
                const isFull = perms === 'full';
                return (
                  <div key={moduleKey} className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <h4 className="font-medium text-sm">{config.name}</h4>
                      {isFull && (
                        <Badge className="ml-auto bg-primary/10 text-primary text-xs">Full Access</Badge>
                      )}
                    </div>
                    {permList.length > 0 ? (
                      <div className="space-y-1.5">
                        {permList.map(perm => (
                          <div key={perm} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{PERMISSION_LABELS[perm] || perm}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Access granted</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No module permissions assigned yet.</p>
              <p className="text-xs mt-1">Contact your school administrator if you need access to specific modules.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Settings */}
      <AccountSettings />
    </div>
  );
}