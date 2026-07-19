import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Lock, Trash2 } from 'lucide-react';
import PasswordInput from '@/components/ui/password-input';
import { toast } from 'sonner';

export default function AccountSettings() {
  const { schoolUser: user, logout } = useSchoolAuth();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setPasswordError('New password must contain at least one number');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError('New password must contain at least one letter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await base44.functions.invoke('changePassword', {
        currentPassword,
        newPassword,
        userId: user.id,
      });

      // Non-2xx responses are thrown by Axios, but check data.error just in case
      const result = response?.data;
      if (result?.error) {
        setPasswordError(result.error);
        return;
      }

      toast.success('Password changed successfully — please log in again');
      setIsPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => logout(), 1500);
    } catch (error) {
      // Axios throws on non-2xx — extract the server's error message
      const serverMsg = error?.response?.data?.error;
      const msg = serverMsg || error?.message || 'Failed to change password';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivateLoading(true);
    try {
      await base44.entities.SchoolUser.update(user.id, {
        isArchived: true,
      });

      toast.success('Account deactivated');
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      toast.error('Failed to deactivate account');
      console.error(error);
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Update your password to keep your account secure.
          </p>
          <Button variant="outline" onClick={() => setIsPasswordOpen(true)}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Deactivate Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently deactivate your account. This action cannot be undone.
          </p>
          <Button 
            variant="destructive" 
            onClick={() => setIsDeactivateOpen(true)}
          >
            Deactivate Account
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 chars, 1 number, 1 letter"
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPasswordOpen(false)}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Deactivate Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to deactivate your account?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
            <p className="text-sm text-destructive">
              Once deactivated, your account will be archived and you will be logged out immediately.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeactivateOpen(false)}
              disabled={deactivateLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateAccount}
              disabled={deactivateLoading}
            >
              {deactivateLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}