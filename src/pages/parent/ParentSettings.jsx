import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import AccountSettings from '@/components/common/AccountSettings';
import ParentNotificationPreferences from '@/components/parent/ParentNotificationPreferences';

export default function ParentSettings() {
  const { schoolUser: user } = useSchoolAuth();
  const [userData, setUserData] = useState(user);

  if (!userData) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile Picture */}
      <Card>
        <CardHeader><CardTitle>Profile Picture</CardTitle></CardHeader>
        <CardContent>
          <ProfilePictureUpload user={userData} onSuccess={setUserData} />
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Full Name</p>
            <p className="text-base font-medium">{userData.fullName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-base">{userData.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">School</p>
            <p className="text-base">{userData.schoolName}</p>
          </div>
          {userData.linkedStudentIds?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked Children</p>
              <p className="text-base">{userData.linkedStudentIds.length} child(ren)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <ParentNotificationPreferences />

      {/* Password & Account */}
      <AccountSettings />
    </div>
  );
}