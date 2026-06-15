import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const statusColor = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ordered: 'bg-amber-100 text-amber-700',
  received: 'bg-emerald-100 text-emerald-700',
};

export default function PurchaseRequestsPanel({ requests, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    itemName: '',
    category: 'classroom_equipment',
    description: '',
    quantity: 1,
    unit: 'units',
    estimatedUnitPrice: '',
    justification: '',
  });

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.itemName || !form.quantity || !form.estimatedUnitPrice) {
      toast.error('Item name, quantity, and price are required');
      return;
    }

    setSaving(true);
    try {
      const unitPrice = Number(form.estimatedUnitPrice);
      const totalPrice = unitPrice * Number(form.quantity);
      
      await base44.entities.PurchaseRequest.create({
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        requestNumber: `PR-${Date.now()}`,
        itemName: form.itemName,
        category: form.category,
        description: form.description,
        quantity: Number(form.quantity),
        unit: form.unit,
        estimatedUnitPrice: unitPrice,
        estimatedTotalPrice: totalPrice,
        justification: form.justification,
        requestedBy: user?.id,
        requestedByName: user?.fullName,
        requestedAt: new Date().toISOString(),
        status: 'draft',
      });
      toast.success('Purchase request created');
      setForm({ itemName: '', category: 'classroom_equipment', description: '', quantity: 1, unit: 'units', estimatedUnitPrice: '', justification: '' });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await base44.entities.PurchaseRequest.update(requestId, { status: newStatus });
      toast.success('Status updated');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground mb-4">No pending purchase requests</p>
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> New Request</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> New Request</Button>
      </div>

      <div className="grid gap-4">
        {requests.map(req => (
          <Card key={req.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{req.itemName}</h3>
                  {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                </div>
                <Badge className={statusColor[req.status]}>{req.status}</Badge>
              </div>

              <div className="text-sm text-muted-foreground mb-3 space-y-1">
                <p><span className="font-medium">Qty:</span> {req.quantity} {req.unit} • <span className="font-medium">Est. Price:</span> {req.estimatedTotalPrice.toLocaleString()}</p>
                <p><span className="font-medium">Requested by:</span> {req.requestedByName} on {new Date(req.requestedAt).toLocaleDateString()}</p>
                {req.justification && <p className="italic text-xs">{req.justification}</p>}
              </div>

              {['draft', 'submitted'].includes(req.status) && (
                <Select value={req.status} onValueChange={v => handleStatusUpdate(req.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Request Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                value={form.itemName}
                onChange={e => setForm({ ...form, itemName: e.target.value })}
                placeholder="What to purchase?"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger disabled={saving}>
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
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Item details..."
                className="resize-none h-16"
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  min={1}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="units"
                  disabled={saving}
                />
              </div>
            </div>
            <div>
              <Label>Est. Unit Price *</Label>
              <Input
                type="number"
                value={form.estimatedUnitPrice}
                onChange={e => setForm({ ...form, estimatedUnitPrice: e.target.value })}
                placeholder="0.00"
                step="0.01"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Justification</Label>
              <Textarea
                value={form.justification}
                onChange={e => setForm({ ...form, justification: e.target.value })}
                placeholder="Why is this needed?"
                className="resize-none h-16"
                disabled={saving}
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}