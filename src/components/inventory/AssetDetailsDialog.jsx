import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export default function AssetDetailsDialog({ open, onOpenChange, asset, onSave }) {
  const { schoolUser: user } = useSchoolAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    assetId: '',
    name: '',
    description: '',
    category: 'classroom_equipment',
    location: '',
    quantity: 1,
    unit: 'units',
    status: 'active',
    purchaseDate: '',
    purchasePrice: '',
    purchaseCurrency: 'NGN',
    supplier: '',
    warranty: '',
    warrantyExpiryDate: '',
    usefulLifeYears: 5,
    depreciationMethod: 'straight_line',
    notes: '',
  });

  useEffect(() => {
    if (asset) {
      setForm({
        assetId: asset.assetId || '',
        name: asset.name || '',
        description: asset.description || '',
        category: asset.category || 'classroom_equipment',
        location: asset.location || '',
        quantity: asset.quantity || 1,
        unit: asset.unit || 'units',
        status: asset.status || 'active',
        purchaseDate: asset.purchaseDate || '',
        purchasePrice: asset.purchasePrice || '',
        purchaseCurrency: asset.purchaseCurrency || 'NGN',
        supplier: asset.supplier || '',
        warranty: asset.warranty || '',
        warrantyExpiryDate: asset.warrantyExpiryDate || '',
        usefulLifeYears: asset.usefulLifeYears || 5,
        depreciationMethod: asset.depreciationMethod || 'straight_line',
        notes: asset.notes || '',
      });
    }
  }, [asset, open]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location) {
      toast.error('Name and location are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        ...form,
        quantity: Number(form.quantity),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : 0,
        usefulLifeYears: Number(form.usefulLifeYears),
      };

      if (asset?.id) {
        await base44.entities.Inventory.update(asset.id, payload);
        toast.success('Asset updated');
      } else {
        await base44.entities.Inventory.create(payload);
        toast.success('Asset created');
      }

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset?.id ? 'Edit Asset' : 'New Asset'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Asset ID</Label>
              <Input
                value={form.assetId}
                onChange={e => setForm({ ...form, assetId: e.target.value })}
                placeholder="e.g. ASSET-001"
                disabled={loading}
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Asset name"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Asset details..."
              className="resize-none h-20"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom_equipment">Classroom Equipment</SelectItem>
                  <SelectItem value="laboratory_equipment">Laboratory Equipment</SelectItem>
                  <SelectItem value="sports_equipment">Sports Equipment</SelectItem>
                  <SelectItem value="office_equipment">Office Equipment</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="ict_equipment">ICT Equipment</SelectItem>
                  <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger disabled={loading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location *</Label>
              <Input
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Room A1, Lab 2"
                disabled={loading}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  min={1}
                  disabled={loading}
                  className="flex-1"
                />
                <Input
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="units"
                  disabled={loading}
                  className="w-24"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Purchase Price</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.purchasePrice}
                  onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="0.00"
                  disabled={loading}
                  className="flex-1"
                />
                <Input
                  value={form.purchaseCurrency}
                  onChange={e => setForm({ ...form, purchaseCurrency: e.target.value })}
                  placeholder="NGN"
                  disabled={loading}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier}
                onChange={e => setForm({ ...form, supplier: e.target.value })}
                placeholder="Supplier name"
                disabled={loading}
              />
            </div>
            <div>
              <Label>Warranty</Label>
              <Input
                value={form.warranty}
                onChange={e => setForm({ ...form, warranty: e.target.value })}
                placeholder="e.g. 12 months"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warranty Expiry Date</Label>
              <Input
                type="date"
                value={form.warrantyExpiryDate}
                onChange={e => setForm({ ...form, warrantyExpiryDate: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label>Useful Life (Years)</Label>
              <Input
                type="number"
                value={form.usefulLifeYears}
                onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })}
                min={1}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              className="resize-none h-16"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Saving...' : asset?.id ? 'Update Asset' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}