import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import StudentFeesTab from '@/components/student/StudentFeesTab';

export default function StudentProfile() {
  const { schoolUser: user } = useSchoolAuth();
  const [userData, setUserData] = useState(user);

  const handleProfileUpdate = (updatedUser) => {
    setUserData(updatedUser);
  };

  if (!userData) {
    return <div className="p-6 text-center text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fees">My Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePictureUpload 
                user={userData}
                onSuccess={handleProfileUpdate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
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
                <label className="text-sm font-medium">Student ID</label>
                <p className="text-lg text-foreground">{userData.studentId || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Class</label>
                <p className="text-lg text-foreground">{userData.className || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">School</label>
                <p className="text-lg text-foreground">{userData.schoolName}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <StudentFeesTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}