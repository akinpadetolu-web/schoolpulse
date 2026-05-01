import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';

export default function TeacherProfile() {
  const { schoolUser: user } = useSchoolAuth();
  const [userData, setUserData] = useState(user);

  if (!userData) {
    return <div className="p-6 text-center text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfilePictureUpload 
            user={userData}
            onSuccess={setUserData}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <p className="text-lg text-foreground">{userData.fullName}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-lg text-foreground">{userData.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">School</label>
            <p className="text-lg text-foreground">{userData.schoolName}</p>
          </div>
          {userData.assignedSubjects && userData.assignedSubjects.length > 0 && (
            <div>
              <label className="text-sm font-medium">Assigned Subjects</label>
              <p className="text-lg text-foreground">{userData.assignedSubjects.join(', ')}</p>
            </div>
          )}
          {userData.assignedClasses && userData.assignedClasses.length > 0 && (
            <div>
              <label className="text-sm font-medium">Assigned Classes</label>
              <p className="text-lg text-foreground">{userData.assignedClasses.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}