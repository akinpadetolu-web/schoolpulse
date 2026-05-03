import React from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import AccountSettings from '@/components/common/AccountSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, School, Hash, BookOpen } from 'lucide-react';

export default function StudentSettings() {
  const { schoolUser: user } = useSchoolAuth();

  if (!user) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security</p>
      </div>

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Full Name</p>
            <p className="text-sm font-medium mt-0.5">{user.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</p>
            <p className="text-sm font-medium mt-0.5">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><Hash className="w-3 h-3" /> Student ID</p>
            <p className="text-sm font-medium mt-0.5">{user.studentId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><BookOpen className="w-3 h-3" /> Class</p>
            <p className="text-sm font-medium mt-0.5">{user.className || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><School className="w-3 h-3" /> School</p>
            <p className="text-sm font-medium mt-0.5">{user.schoolName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Role</p>
            <p className="text-sm font-medium mt-0.5 capitalize">{user.role}</p>
          </div>
        </CardContent>
      </Card>

      {/* Security & Account actions */}
      <AccountSettings />
    </div>
  );
}