import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteAccountDialog() {
  const { schoolUser: user, logout } = useSchoolAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      // Soft-delete (archive): the account is deactivated and the user is signed out,
      // but NO data is erased. Per SchoolEduPulse data-retention policy, all records
      // (profile, grades, attendance, etc.) are retained and remain accessible to
      // school administrators and the SchoolEduPulse platform.
      await base44.entities.SchoolUser.update(user.id, { isArchived: true });
      logout();
      navigate('/');
    } catch (e) {
      setError('Failed to deactivate account. Please contact your administrator.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-destructive/20">
      <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Deactivates your account and signs you out. Your records are retained securely per
        SchoolEduPulse data-retention policy and remain accessible to your school's administrators — they are not erased.
      </p>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2 select-none">
            <Trash2 className="w-4 h-4" /> Delete My Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates your SchoolPulse account and signs you out. Your profile and academic
              records are retained securely and remain accessible to your school's administrators and the
              SchoolEduPulse platform — no data is erased.
              <strong className="block mt-2 text-foreground">You will not be able to log back in.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="select-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 select-none"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Yes, Deactivate My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}