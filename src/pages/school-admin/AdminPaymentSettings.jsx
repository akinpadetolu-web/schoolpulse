import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, CreditCard, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';

const DEFAULTS = {
  currency: 'NGN', currencySymbol: '₦', currencySymbolPosition: 'before',
  acceptCash: true, acceptBankTransfer: true, acceptCheque: false,
  confirmationMode: 'auto_online', confirmationDeadlineDays: 3,
  invoicePrefix: 'INV', invoiceNumberFormat: 'year', invoiceDueDays: 30,
  invoiceGenerationMode: 'auto', latePaymentEnabled: false,
  latePenaltyType: 'percentage', latePenaltyAmount: 5, latePenaltyGraceDays: 7,
  notifyAdminOnPayment: true, primaryGateway: 'none', paystackEnabled: false,
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
      const data = { ...settings, schoolId: user.schoolId, schoolName: user.schoolName };
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

  const paystackOn = settings.paystackEnabled || settings.primaryGateway === 'paystack';

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure how parents pay school fees and fines</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Paystack Gateway */}
      <Card className="mb-6 border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Online Payment Gateway — Paystack</CardTitle>
              <CardDescription>Enable secure online card payments for parents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Switch
                checked={paystackOn}
                onCheckedChange={(checked) => set('paystackEnabled', checked)}
              />
              <div>
                <p className="font-medium text-sm">Enable Paystack</p>
                <p className="text-xs text-muted-foreground">Parents will see a "Pay with Paystack" button</p>
              </div>
            </div>
            {paystackOn ? (
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>

          {paystackOn && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Parents can now pay fees and library fines online via Paystack.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Currency & Display</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm mb-1 block">Currency Code</Label>
            <Input value={settings.currency} onChange={e => set('currency', e.target.value)} placeholder="NGN" />
          </div>
          <div>
            <Label className="text-sm mb-1 block">Currency Symbol</Label>
            <Input value={settings.currencySymbol} onChange={e => set('currencySymbol', e.target.value)} placeholder="₦" />
          </div>
          <div>
            <Label className="text-sm mb-1 block">Symbol Position</Label>
            <Select value={settings.currencySymbolPosition} onValueChange={v => set('currencySymbolPosition', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before (₦100)</SelectItem>
                <SelectItem value="after">After (100₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Invoice Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm mb-1 block">Invoice Prefix</Label>
            <Input value={settings.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value)} />
          </div>
          <div>
            <Label className="text-sm mb-1 block">Due Days</Label>
            <Input type="number" value={settings.invoiceDueDays} onChange={e => set('invoiceDueDays', +e.target.value)} />
          </div>
          <div>
            <Label className="text-sm mb-1 block">Confirmation Mode</Label>
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

      {/* Late Payment */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Late Payment Penalties</CardTitle>
          <CardDescription>Automatically charge parents for overdue fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label htmlFor="lateEnabled" className="text-sm font-normal cursor-pointer">Enable late payment penalties</Label>
            <Switch id="lateEnabled" checked={!!settings.latePaymentEnabled} onCheckedChange={v => set('latePaymentEnabled', v)} />
          </div>
          {settings.latePaymentEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <Label className="text-sm mb-1 block">Penalty Type</Label>
                <Select value={settings.latePenaltyType} onValueChange={v => set('latePenaltyType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">Amount ({settings.latePenaltyType === 'percentage' ? '%' : settings.currencySymbol})</Label>
                <Input type="number" value={settings.latePenaltyAmount} onChange={e => set('latePenaltyAmount', +e.target.value)} />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Grace Period (days)</Label>
                <Input type="number" value={settings.latePenaltyGraceDays} onChange={e => set('latePenaltyGraceDays', +e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}