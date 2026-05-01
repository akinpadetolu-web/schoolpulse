import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import AccountSettings from '@/components/common/AccountSettings';

export default function TeacherProfile() {
  const { schoolUser: user } = useSchoolAuth();
  const [userData, setUserData] = useState(user);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (!user) return;
    async function loadData() {
      try {
        const [allSubjects, allClasses] = await Promise.all([
          base44.entities.Subject.list(),
          base44.entities.SchoolClass.list(),
        ]);
        setSubjects(allSubjects || []);
        setClasses(allClasses || []);
      } catch (error) {
        console.error('Failed to load subjects/classes:', error);
      }
    }
    loadData();
  }, [user]);

  if (!userData) {
    return <div className="p-6 text-center text-muted-foreground">Loading profile...</div>;
  }

  const getSubjectNames = (ids) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => subjects.find(s => s.id === id)?.name || id).filter(Boolean);
  };

  const getClassNames = (ids) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => classes.find(c => c.id === id)?.className || id).filter(Boolean);
  };

  const subjectNames = getSubjectNames(userData.assignedSubjects);
  const classNames = getClassNames(userData.assignedClasses);

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
              {subjectNames.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Assigned Subjects</label>
                  <p className="text-lg text-foreground">{subjectNames.join(', ')}</p>
                </div>
              )}
              {classNames.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Assigned Classes</label>
                  <p className="text-lg text-foreground">{classNames.join(', ')}</p>
                </div>
              )}
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