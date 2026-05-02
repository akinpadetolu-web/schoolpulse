import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import AccountSettings from '@/components/common/AccountSettings';

export default function StudentProfile() {
  const { schoolUser: user, logout, login } = useSchoolAuth();
  const [userData, setUserData] = useState(user);

  const handleProfileUpdate = async (updatedUser) => {
    setUserData(updatedUser);
    // Refresh auth context with updated user data
    if (updatedUser?.id) {
      try {
        const freshUser = await base44.entities.SchoolUser.filter({ id: updatedUser.id });
        if (freshUser?.length > 0) {
          // Store updated user in auth context
          const authData = JSON.parse(sessionStorage.getItem('schoolUserAuth') || '{}');
          authData.user = freshUser[0];
          sessionStorage.setItem('schoolUserAuth', JSON.stringify(authData));
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
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
          <TabsTrigger value="settings">Settings</TabsTrigger>
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

        <TabsContent value="settings">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}