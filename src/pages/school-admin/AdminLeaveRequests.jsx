import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AdminLeaveRequests() {
  const { schoolUser: user } = useSchoolAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeaves();
    const unsubscribe = base44.entities.StaffLeave.subscribe(() => {
      loadLeaves();
    });
    return unsubscribe;
  }, []);

  async function loadLeaves() {
    try {
      const data = await base44.entities.StaffLeave.filter({
        schoolId: user?.schoolId,
      });
      setLeaves((data || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
    setLoading(false);
  }

  async function handleApprove(leave) {
    setSubmitting(true);
    try {
      await base44.entities.StaffLeave.update(leave.id, {
        status: 'approved',
        reviewedBy: user?.id,
        reviewedAt: new Date().toISOString(),
        reviewNote: reviewNotes,
      });
      setReviewNotes('');
      setSelectedLeave(null);
      await loadLeaves();
    } catch (err) {
      console.error('Failed to approve leave:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(leave) {
    setSubmitting(true);
    try {
      await base44.entities.StaffLeave.update(leave.id, {
        status: 'rejected',
        reviewedBy: user?.id,
        reviewedAt: new Date().toISOString(),
        reviewNote: reviewNotes,
      });
      setReviewNotes('');
      setSelectedLeave(null);
      await loadLeaves();
    } catch (err) {
      console.error('Failed to reject leave:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const stats = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  const statusColor = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Leave Requests</h1>
        <p className="text-muted-foreground">Review and manage leave requests</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <p className="text-3xl font-bold mt-2 text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-3xl font-bold mt-2 text-emerald-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-3xl font-bold mt-2 text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests list */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            All Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leave requests</div>
            ) : (
              leaves.map(leave => (
                <div key={leave.id} className="border rounded-lg p-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold">{leave.staffName}</p>
                      <p className="text-sm text-muted-foreground">{leave.staffRole}</p>
                    </div>
                    <Badge className={statusColor[leave.status]}>
                      {leave.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground text-xs">Type</p>
                      <p className="font-medium capitalize">{leave.leaveType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">From</p>
                      <p className="font-medium">{format(new Date(leave.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">To</p>
                      <p className="font-medium">{format(new Date(leave.endDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Days</p>
                      <p className="font-medium">{leave.daysRequested}</p>
                    </div>
                  </div>

                  {leave.reason && (
                    <div className="bg-muted/30 rounded p-2 text-sm mb-3">
                      <p className="text-muted-foreground text-xs mb-1">Reason</p>
                      <p>{leave.reason}</p>
                    </div>
                  )}

                  {leave.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setSelectedLeave(leave); setReviewNotes(''); }}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedLeave(leave); setReviewNotes(''); }}
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  {leave.reviewNote && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                      <p className="font-medium">Admin Note:</p>
                      <p>{leave.reviewNote}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={(open) => !open && setSelectedLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedLeave.staffName}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(selectedLeave.startDate), 'MMM d')} - {format(new Date(selectedLeave.endDate), 'MMM d')}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes (optional)</label>
                <Textarea
                  placeholder="Add notes for the staff..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="h-20 mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  disabled={submitting}
                  onClick={() => handleApprove(selectedLeave)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  disabled={submitting}
                  variant="destructive"
                  onClick={() => handleReject(selectedLeave)}
                  className="flex-1"
                >
                  {submitting ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}