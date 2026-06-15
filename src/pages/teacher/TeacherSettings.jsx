import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function TeacherSettings() {
  const { schoolUser: user } = useSchoolAuth();
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('All fields are required');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke('changePassword', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });
      toast.success('Password changed successfully');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Full Name</Label>
                <Input value={user?.fullName || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input value={user?.email || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">School</Label>
                <Input value={user?.schoolName || ''} disabled className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="current" className="text-sm font-medium">Current Password</Label>
                  <Input
                    id="current"
                    type="password"
                    value={passwordData.current}
                    onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                    placeholder="Enter current password"
                    disabled={saving}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="new"
                    type="password"
                    value={passwordData.new}
                    onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                    placeholder="Enter new password"
                    disabled={saving}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={passwordData.confirm}
                    onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    placeholder="Confirm new password"
                    disabled={saving}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Notification and display preferences coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}