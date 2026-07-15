import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import StudentFeesTab from '@/components/student/StudentFeesTab';
import { Home, Bed } from 'lucide-react';

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
          {userData.hostelId && <TabsTrigger value="hostel">My Hostel</TabsTrigger>}
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
              {userData.hostelName && (
                <div className="pt-3 border-t">
                  <label className="text-sm font-medium flex items-center gap-1"><Home className="w-4 h-4" /> Hostel</label>
                  <p className="text-lg text-foreground">{userData.hostelName}</p>
                  <div className="flex gap-4 mt-1">
                    {userData.hostelRoomNumber && <p className="text-sm text-muted-foreground flex items-center gap-1"><Bed className="w-3 h-3" /> Room: {userData.hostelRoomNumber}</p>}
                    {userData.hostelBedNumber && <p className="text-sm text-muted-foreground">Bed: {userData.hostelBedNumber}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {userData.hostelId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Home className="w-4 h-4" /> Hostel Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Hostel Name</label>
                    <p className="text-base text-foreground">{userData.hostelName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Room Number</label>
                    <p className="text-base text-foreground">{userData.hostelRoomNumber || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bed Number</label>
                    <p className="text-base text-foreground">{userData.hostelBedNumber || 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fees">
          <StudentFeesTab />
        </TabsContent>

        {userData.hostelId && (
          <TabsContent value="hostel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Home className="w-4 h-4" /> My Hostel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Hostel Name</label>
                    <p className="text-base text-foreground">{userData.hostelName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Room Number</label>
                    <p className="text-base text-foreground">{userData.hostelRoomNumber || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bed Number</label>
                    <p className="text-base text-foreground">{userData.hostelBedNumber || 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}