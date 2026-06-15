import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const DEFAULTS = {
  currency: 'NGN', currencySymbol: '₦', currencySymbolPosition: 'before',
  acceptCash: true, acceptBankTransfer: true, acceptCheque: false,
  confirmationMode: 'auto_online', confirmationDeadlineDays: 3,
  invoicePrefix: 'INV', invoiceNumberFormat: 'year', invoiceDueDays: 30,
  invoiceGenerationMode: 'auto', latePaymentEnabled: false,
  latePenaltyType: 'percentage', latePenaltyAmount: 5, latePenaltyGraceDays: 7,
  notifyAdminOnPayment: true, primaryGateway: 'none',
};

export default function AdminPaymentSettings() {
  const { schoolUser: user } = useSchoolAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSettings(); }, [user?.schoolId]);

  async function loadSettings() {
    if (!user?.schoolId) return;
    try {
      const list = await base44.entities.PaymentSettings.filter({ schoolId: user.schoolId });
      if (list.length > 0) {
        setSettingsId(list[0].id);
        setSettings({ ...DEFAULTS, ...list[0] });
      }
    } catch (e) {}
    setLoading(false);
  }

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      const data = { ...settings, schoolId: user.schoolId };
      if (settingsId) {
        await base44.entities.PaymentSettings.update(settingsId, data);
      } else {
        const created = await base44.entities.PaymentSettings.create(data);
        setSettingsId(created.id);
      }
      toast.success('Payment settings saved');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Payment Settings</h1><p className="text-sm text-muted-foreground mt-1">Configure payment options for your school</p></div>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Currency & Display</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label className="text-sm mb-1 block">Currency Code</Label><Input value={settings.currency} onChange={e => set('currency', e.target.value)} placeholder="NGN" /></div>
            <div><Label className="text-sm mb-1 block">Currency Symbol</Label><Input value={settings.currencySymbol} onChange={e => set('currencySymbol', e.target.value)} placeholder="₦" /></div>
            <div><Label className="text-sm mb-1 block">Symbol Position</Label>
              <Select value={settings.currencySymbolPosition} onValueChange={v => set('currencySymbolPosition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="before">Before (₦100)</SelectItem><SelectItem value="after">After (100₦)</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Accepted Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[['acceptCash', 'Cash'], ['acceptBankTransfer', 'Bank Transfer'], ['acceptCheque', 'Cheque']].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <input type="checkbox" id={key} checked={!!settings[key]} onChange={e => set(key, e.target.checked)} />
                <Label htmlFor={key}>{label}</Label>
              </div>
            ))}
            <div><Label className="text-sm mb-1 block mt-3">Online Gateway</Label>
              <Select value={settings.primaryGateway} onValueChange={v => set('primaryGateway', v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="interswitch">Interswitch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.primaryGateway === 'paystack' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div><Label className="text-sm mb-1 block">Paystack Public Key</Label><Input value={settings.paystackPublicKey || ''} onChange={e => set('paystackPublicKey', e.target.value)} /></div>
                <div><Label className="text-sm mb-1 block">Paystack Secret Key</Label><Input type="password" value={settings.paystackSecretKey || ''} onChange={e => set('paystackSecretKey', e.target.value)} /></div>
              </div>
            )}
            {settings.primaryGateway === 'stripe' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div><Label className="text-sm mb-1 block">Stripe Publishable Key</Label><Input value={settings.stripePublishableKey || ''} onChange={e => set('stripePublishableKey', e.target.value)} /></div>
                <div><Label className="text-sm mb-1 block">Stripe Secret Key</Label><Input type="password" value={settings.stripeSecretKey || ''} onChange={e => set('stripeSecretKey', e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label className="text-sm mb-1 block">Invoice Prefix</Label><Input value={settings.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value)} /></div>
            <div><Label className="text-sm mb-1 block">Due Days</Label><Input type="number" value={settings.invoiceDueDays} onChange={e => set('invoiceDueDays', +e.target.value)} /></div>
            <div><Label className="text-sm mb-1 block">Confirmation Mode</Label>
              <Select value={settings.confirmationMode} onValueChange={v => set('confirmationMode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto_online">Auto (Online)</SelectItem>
                  <SelectItem value="auto_all">Auto (All)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Late Payment Penalties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="lateEnabled" checked={!!settings.latePaymentEnabled} onChange={e => set('latePaymentEnabled', e.target.checked)} />
              <Label htmlFor="lateEnabled">Enable late payment penalties</Label>
            </div>
            {settings.latePaymentEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div><Label className="text-sm mb-1 block">Penalty Type</Label>
                  <Select value={settings.latePenaltyType} onValueChange={v => set('latePenaltyType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-sm mb-1 block">Amount ({settings.latePenaltyType === 'percentage' ? '%' : settings.currencySymbol})</Label><Input type="number" value={settings.latePenaltyAmount} onChange={e => set('latePenaltyAmount', +e.target.value)} /></div>
                <div><Label className="text-sm mb-1 block">Grace Period (days)</Label><Input type="number" value={settings.latePenaltyGraceDays} onChange={e => set('latePenaltyGraceDays', +e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}