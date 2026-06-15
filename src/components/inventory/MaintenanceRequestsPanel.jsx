import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const priorityColor = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  urgent: 'bg-destructive/10 text-destructive',
};

const statusColor = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-700',
};

export default function MaintenanceRequestsPanel({ requests, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    inventoryId: '',
    issue: '',
    priority: 'medium',
    assignedTo: '',
  });

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.inventoryId || !form.issue) {
      toast.error('Asset and issue description are required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.MaintenanceRequest.create({
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        inventoryId: form.inventoryId,
        issue: form.issue,
        priority: form.priority,
        assignedTo: form.assignedTo,
        requestedBy: user?.id,
        requestedByName: user?.fullName,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      });
      toast.success('Maintenance request created');
      setForm({ inventoryId: '', issue: '', priority: 'medium', assignedTo: '' });
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
      await base44.entities.MaintenanceRequest.update(requestId, { status: newStatus });
      toast.success('Status updated');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground mb-4">No maintenance requests</p>
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Create Request</Button>
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
                  <h3 className="font-semibold">{req.assetName}</h3>
                  <p className="text-sm text-muted-foreground">{req.issue}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
                  <Badge className={priorityColor[req.priority]}>{req.priority}</Badge>
                  <Badge className={statusColor[req.status]}>{req.status}</Badge>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-3 space-y-1">
                <p><span className="font-medium">Requested:</span> {req.requestedByName} on {new Date(req.requestedAt).toLocaleDateString()}</p>
                {req.assignedToName && <p><span className="font-medium">Assigned to:</span> {req.assignedToName}</p>}
                {req.estimatedCost && <p><span className="font-medium">Est. Cost:</span> {req.estimatedCost}</p>}
              </div>

              {req.status !== 'completed' && (
                <Select value={req.status} onValueChange={v => handleStatusUpdate(req.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Request Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Maintenance Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <Label>Asset *</Label>
              <Input
                value={form.inventoryId}
                onChange={e => setForm({ ...form, inventoryId: e.target.value })}
                placeholder="Asset name or ID"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Issue Description *</Label>
              <Textarea
                value={form.issue}
                onChange={e => setForm({ ...form, issue: e.target.value })}
                placeholder="Describe the problem..."
                className="resize-none h-20"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To (Optional)</Label>
              <Input
                value={form.assignedTo}
                onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                placeholder="Staff member name"
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