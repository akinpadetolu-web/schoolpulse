import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const fineTypeColor = {
  overdue: 'bg-amber-100 text-amber-700',
  damage: 'bg-red-100 text-red-700',
  loss: 'bg-destructive/10 text-destructive',
};

export default function FineManagementPanel({ fines, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showWaiveDialog, setShowWaiveDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');

  const totalPending = fines
    .filter(f => f.status === 'pending')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const handleWaiveFine = async () => {
    if (!waiverReason.trim()) {
      toast.error('Waiver reason is required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.BookFine.update(showWaiveDialog.id, {
        status: 'waived',
        waivedReason: waiverReason,
        waivedBy: user?.fullName,
        waivedAt: new Date().toISOString(),
      });

      toast.success('Fine waived');
      setShowWaiveDialog(null);
      setWaiverReason('');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to waive fine');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (fineId) => {
    try {
      await base44.entities.BookFine.update(fineId, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
      });

      toast.success('Fine marked as paid');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update fine');
    }
  };

  if (fines.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No outstanding fines</div>;
  }

  return (
    <>
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-900"><span className="font-bold">Total Pending Fines:</span> NGN {totalPending.toLocaleString()}</p>
      </div>

      <div className="grid gap-4">
        {fines.map(fine => (
          <Card key={fine.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{fine.bookTitle}</h3>
                  <p className="text-sm text-muted-foreground">{fine.studentName}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={fineTypeColor[fine.fineType]}>{fine.fineType}</Badge>
                  <Badge variant={fine.status === 'pending' ? 'default' : 'outline'}>{fine.status}</Badge>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-3 space-y-1">
                <p><span className="font-medium">Fine Amount:</span> NGN {(fine.amount || 0).toLocaleString()}</p>
                {fine.daysLate && <p><span className="font-medium">Days Late:</span> {fine.daysLate}</p>}
                {fine.reason && <p><span className="font-medium">Reason:</span> {fine.reason}</p>}
              </div>

              {fine.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkPaid(fine.id)}
                  >
                    Mark Paid
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowWaiveDialog(fine)}
                  >
                    Waive Fine
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waive Fine Dialog */}
      {showWaiveDialog && (
        <Dialog open={!!showWaiveDialog} onOpenChange={() => !saving && setShowWaiveDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Waive Fine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm"><span className="font-medium">Student:</span> {showWaiveDialog.studentName}</p>
                <p className="text-sm"><span className="font-medium">Amount:</span> NGN {(showWaiveDialog.amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label>Reason for Waiver *</Label>
                <Textarea
                  value={waiverReason}
                  onChange={e => setWaiverReason(e.target.value)}
                  placeholder="Explain why this fine is being waived..."
                  className="resize-none h-20"
                  disabled={saving}
                />
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setShowWaiveDialog(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleWaiveFine} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Waive Fine
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}