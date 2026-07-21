import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_TIER = { tierName: '', description: '', pricePerStudent: 0, billingCycle: 'annual', installmentOptions: 1, isActive: true };

export default function SubscriptionPricingPanel({ school }) {
  const [tiers, setTiers] = useState([]);
  const [allTiers, setAllTiers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState(EMPTY_TIER);
  const [assignForm, setAssignForm] = useState({ pricingTierId: '', registeredStudents: 0, installmentCount: 1 });

  useEffect(() => { loadAll(); }, [school?.id]);

  async function loadAll() {
    if (!school?.id) return;
    try {
      const [tierRes, subRes] = await Promise.all([
        base44.entities.SubscriptionPricing.list('-displayOrder'),
        base44.entities.SchoolSubscription.filter({ schoolId: school.id }),
      ]);
      setAllTiers(tierRes || []);
      setTiers((tierRes || []).filter(t => t.isActive !== false));
      const sub = (subRes || [])[0] || null;
      setSubscription(sub);
      if (sub) {
        setAssignForm({ pricingTierId: sub.pricingTierId, registeredStudents: sub.registeredStudents, installmentCount: sub.installmentCount || 1 });
      } else if (tierRes?.length > 0) {
        setAssignForm({ pricingTierId: tierRes[0].id, registeredStudents: 0, installmentCount: 1 });
      }
    } catch {}
    setLoading(false);
  }

  async function saveTier() {
    if (!tierForm.tierName || !tierForm.pricePerStudent) { toast.error('Tier name and price per student are required'); return; }
    setSaving(true);
    try {
      if (editingTier) {
        await base44.entities.SubscriptionPricing.update(editingTier.id, tierForm);
        toast.success('Tier updated');
      } else {
        await base44.entities.SubscriptionPricing.create(tierForm);
        toast.success('Tier created');
      }
      setShowTierDialog(false);
      loadAll();
    } catch { toast.error('Failed to save tier'); }
    setSaving(false);
  }

  async function deleteTier(id) {
    if (!confirm('Delete this pricing tier?')) return;
    await base44.entities.SubscriptionPricing.delete(id);
    toast.success('Deleted');
    loadAll();
  }

  async function saveSubscription() {
    if (!assignForm.pricingTierId || !assignForm.registeredStudents) { toast.error('Please select a tier and enter student count'); return; }
    setSaving(true);
    try {
      const tier = allTiers.find(t => t.id === assignForm.pricingTierId);
      if (!tier) { toast.error('Invalid tier'); setSaving(false); return; }
      const total = tier.pricePerStudent * assignForm.registeredStudents;
      const installmentAmount = assignForm.installmentCount > 1 ? Math.ceil(total / assignForm.installmentCount) : total;
      const data = {
        schoolId: school.id,
        schoolName: school.schoolName,
        pricingTierId: tier.id,
        tierName: tier.tierName,
        pricePerStudent: tier.pricePerStudent,
        registeredStudents: assignForm.registeredStudents,
        totalAmount: total,
        currency: tier.currency || 'NGN',
        billingCycle: tier.billingCycle || 'annual',
        installmentCount: assignForm.installmentCount,
        installmentAmount,
        status: subscription?.status || 'pending',
      };
      if (subscription) {
        await base44.entities.SchoolSubscription.update(subscription.id, data);
        toast.success('Subscription updated');
      } else {
        await base44.entities.SchoolSubscription.create(data);
        toast.success('Subscription configured');
      }
      loadAll();
    } catch { toast.error('Failed to save subscription'); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const selectedTier = allTiers.find(t => t.id === assignForm.pricingTierId);
  const calculatedTotal = selectedTier ? selectedTier.pricePerStudent * (assignForm.registeredStudents || 0) : 0;
  const calculatedInstallment = assignForm.installmentCount > 1 ? Math.ceil(calculatedTotal / assignForm.installmentCount) : calculatedTotal;

  return (
    <div className="space-y-6">
      {/* Subscription Configuration */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-3">Subscription Configuration</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1 block">Pricing Tier</Label>
              <Select value={assignForm.pricingTierId} onValueChange={v => setAssignForm(f => ({ ...f, pricingTierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  {allTiers.map(t => <SelectItem key={t.id} value={t.id}>{t.tierName} — ₦{t.pricePerStudent.toLocaleString()}/student</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1 block">Registered Students</Label>
                <Input type="number" min="0" value={assignForm.registeredStudents} onChange={e => setAssignForm(f => ({ ...f, registeredStudents: +e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Installments</Label>
                <Select value={String(assignForm.installmentCount)} onValueChange={v => setAssignForm(f => ({ ...f, installmentCount: +v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Full payment)</SelectItem>
                    <SelectItem value="2">2 (Semi-annual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedTier && assignForm.registeredStudents > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per student:</span>
                  <span className="font-medium">₦{(selectedTier.pricePerStudent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registered students:</span>
                  <span className="font-medium">{assignForm.registeredStudents}</span>
                </div>
                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-primary/20">
                  <span>Total:</span>
                  <span>₦{calculatedTotal.toLocaleString()}</span>
                </div>
                {assignForm.installmentCount > 1 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Per installment ({assignForm.installmentCount}×):</span>
                    <span>₦{calculatedInstallment.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            <Button onClick={saveSubscription} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {subscription ? 'Update Subscription' : 'Configure Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Pricing Tiers</h3>
          <Button size="sm" variant="outline" onClick={() => { setEditingTier(null); setTierForm(EMPTY_TIER); setShowTierDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Tier
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allTiers.map(t => (
            <Card key={t.id} className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.tierName}</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingTier(t); setTierForm({ tierName: t.tierName, description: t.description || '', pricePerStudent: t.pricePerStudent || 0, billingCycle: t.billingCycle || 'annual', installmentOptions: t.installmentOptions || 1, isActive: t.isActive !== false }); setShowTierDialog(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteTier(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{(t.billingCycle || 'annual').replace('_', ' ')}</Badge>
                  <span className="text-sm font-bold">₦{(t.pricePerStudent || 0).toLocaleString()}/student</span>
                </div>
                {t.installmentOptions > 1 && <p className="text-xs text-muted-foreground mt-1">{t.installmentOptions} installments allowed</p>}
              </CardContent>
            </Card>
          ))}
          {allTiers.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-4">No pricing tiers yet.</p>}
        </div>
      </div>

      {/* Tier Dialog */}
      {showTierDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTierDialog(false)}>
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{editingTier ? 'Edit Tier' : 'New Pricing Tier'}</h3>
            <div className="space-y-3">
              <div><Label className="text-sm mb-1 block">Tier Name *</Label><Input value={tierForm.tierName} onChange={e => setTierForm(f => ({ ...f, tierName: e.target.value }))} placeholder="e.g. Premium" /></div>
              <div><Label className="text-sm mb-1 block">Description</Label><Input value={tierForm.description} onChange={e => setTierForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Full feature access" /></div>
              <div><Label className="text-sm mb-1 block">Price Per Student (₦) *</Label><Input type="number" min="0" value={tierForm.pricePerStudent} onChange={e => setTierForm(f => ({ ...f, pricePerStudent: +e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm mb-1 block">Billing Cycle</Label>
                  <Select value={tierForm.billingCycle} onValueChange={v => setTierForm(f => ({ ...f, billingCycle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-sm mb-1 block">Installments</Label>
                  <Select value={String(tierForm.installmentOptions)} onValueChange={v => setTierForm(f => ({ ...f, installmentOptions: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1 (Full)</SelectItem><SelectItem value="2">2 (Half)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowTierDialog(false)}>Cancel</Button>
                <Button onClick={saveTier} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}