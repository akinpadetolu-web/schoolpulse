import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/auditLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, 4);
const MASK = '••••••••';

// Issues a fresh temporary password for a student and lets the admin copy it.
// The password stays masked until the admin re-enters the security PIN, which
// is verified on the server.
export default function StudentPasswordResetDialog({ open, onOpenChange, student, admin, schoolId }) {
  const [step, setStep] = useState('pin');
  const [pin, setPin] = useState('');
  const [revealPin, setRevealPin] = useState('');
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [error, setError] = useState('');
  const [revealError, setRevealError] = useState('');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pin');
    setPin('');
    setRevealPin('');
    setShowRevealPrompt(false);
    setRevealed(false);
    setTemporaryPassword('');
    setError('');
    setRevealError('');
    setWorking(false);
    setCopied(false);
  }, [open, student?.id]);

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) { setError('Enter the 4-digit security PIN.'); return; }

    setWorking(true);
    try {
      const response = await base44.functions.invoke('studentPasswordReset', {
        action: 'reset',
        adminId: admin?.id,
        schoolId,
        studentId: student?.id,
        pin,
      });
      const data = response?.data || {};

      if (!data.temporaryPassword) {
        setError(data.error || 'Could not reset the password.');
        setWorking(false);
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
      setStep('result');
      setPin('');

      logAudit({
        schoolId,
        schoolName: admin?.schoolName,
        action: 'password_reset',
        entityType: 'SchoolUser',
        entityId: student?.id,
        performedBy: admin?.id,
        performedByName: admin?.fullName,
        details: `Temporary password issued for "${student?.fullName}"`,
      }).catch(() => {});
    } catch {
      setError('Could not reset the password. Please try again.');
    }
    setWorking(false);
  }

  async function handleReveal(e) {
    e.preventDefault();
    setRevealError('');
    if (!/^\d{4}$/.test(revealPin)) { setRevealError('Enter the 4-digit security PIN.'); return; }

    setWorking(true);
    try {
      const response = await base44.functions.invoke('studentPasswordReset', {
        action: 'verifyPin',
        adminId: admin?.id,
        schoolId,
        pin: revealPin,
      });
      const data = response?.data || {};

      if (!data.valid) {
        setRevealError(data.error || 'Incorrect security PIN.');
        setWorking(false);
        return;
      }

      setRevealed(true);
      setShowRevealPrompt(false);
      setRevealPin('');
    } catch {
      setRevealError('Could not verify the PIN. Please try again.');
    }
    setWorking(false);
  }

  async function handleCopy() {
    if (!temporaryPassword) return;
    const text = `Username: ${student?.username || ''}\nTemporary password: ${temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed. Reveal the password and copy it manually.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Reset Student Password
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">{student?.fullName}</p>
          <p className="text-xs text-muted-foreground">Username: {student?.username || '—'}</p>
        </div>

        {step === 'pin' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-pin">Security PIN</Label>
              <Input
                id="reset-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={e => setPin(digitsOnly(e.target.value))}
                placeholder="4 digits"
                className="text-center text-lg tracking-[0.5em]"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Enter the 4-digit PIN set by the SchoolEduPulse administrator. This issues a new temporary password for the student.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={working}>
                {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </form>
        )}

        {step === 'result' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Password reset. Share these credentials with the student.</span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono font-semibold">{student?.username || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Temporary password</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-background font-mono tracking-widest text-sm font-semibold">
                    {revealed ? temporaryPassword : MASK}
                  </div>
                  {revealed ? (
                    <Button type="button" variant="outline" size="icon" title="Hide" onClick={() => setRevealed(false)}>
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Reveal"
                      onClick={() => { setShowRevealPrompt(true); setRevealError(''); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="icon" title="Copy" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {showRevealPrompt && !revealed && (
              <form onSubmit={handleReveal} className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="reveal-pin" className="text-xs">Enter the security PIN to reveal</Label>
                <Input
                  id="reveal-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={revealPin}
                  onChange={e => setRevealPin(digitsOnly(e.target.value))}
                  placeholder="4 digits"
                  className="text-center text-lg tracking-[0.5em]"
                />
                {revealError && <p className="text-xs text-destructive">{revealError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setShowRevealPrompt(false); setRevealPin(''); setRevealError(''); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1" disabled={working}>
                    {working && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Reveal
                  </Button>
                </div>
              </form>
            )}

            <p className="text-xs text-muted-foreground">The student must change this password at their next sign in.</p>

            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}