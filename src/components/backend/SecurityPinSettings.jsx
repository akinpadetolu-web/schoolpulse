import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getCurrentSuperAdmin } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, 4);

// The 4-digit PIN that school admins must enter before a student's temporary
// password can be reset or revealed. Set here by the system administrator.
export default function SecurityPinSettings() {
  const admin = getCurrentSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const response = await base44.functions.invoke('manageSecurityPin', {
        action: 'status',
        superAdminId: admin?.id,
      });
      setConfigured(Boolean(response?.data?.configured));
    } catch {
      setConfigured(false);
    }
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (pin.length !== 4) return setError('Choose a 4-digit PIN.');
    if (pin !== confirmPin) return setError('The two PIN entries do not match.');
    if (configured && currentPin.length !== 4) return setError('Enter the current PIN to replace it.');

    setSaving(true);
    try {
      const response = await base44.functions.invoke('manageSecurityPin', {
        action: 'set',
        superAdminId: admin?.id,
        pin,
        currentPin: configured ? currentPin : '',
      });
      const data = response?.data || {};

      if (data.error) {
        setError(data.error);
        setSaving(false);
        return;
      }

      setConfigured(true);
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      toast.success(configured ? 'Security PIN updated' : 'Security PIN set');
    } catch {
      setError('Could not save the PIN. Please try again.');
    }
    setSaving(false);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="w-4 h-4" /> Password Reveal Security PIN
          {!loading && (
            <Badge variant={configured ? 'default' : 'secondary'} className="ml-auto text-xs">
              {configured ? 'Configured' : 'Not set'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              School administrators must enter this 4-digit PIN before resetting a student password or revealing a
              temporary password. Only you set and know it.
            </p>

            {configured && (
              <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={currentPin}
                  onChange={e => setCurrentPin(digitsOnly(e.target.value))}
                  placeholder="4 digits"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-pin">New PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(digitsOnly(e.target.value))}
                  placeholder="4 digits"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-pin">Confirm PIN</Label>
                <Input
                  id="confirm-new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(digitsOnly(e.target.value))}
                  placeholder="4 digits"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="sm" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              {configured ? 'Update PIN' : 'Set PIN'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}