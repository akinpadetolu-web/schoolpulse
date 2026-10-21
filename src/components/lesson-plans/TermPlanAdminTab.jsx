import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, CalendarRange } from 'lucide-react';
import { filledWeeks } from '@/lib/termPlanUtils';
import TermPlanWeeks from './TermPlanWeeks';

/** Whole-term lesson plan approvals. One decision covers every week in the plan. */
export default function TermPlanAdminTab() {
  const { schoolUser: user } = useSchoolAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!user?.schoolId) return;
    const data = await base44.entities.TermLessonPlan.filter({ schoolId: user.schoolId });
    // Drafts are the teacher's unfinished work — they are never sent for approval.
    setPlans((data || []).filter(p => p.status !== 'draft').sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
    setLoading(false);
  }, [user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  async function decide(status) {
    if (!actionItem) return;
    await base44.entities.TermLessonPlan.update(actionItem.id, {
      status,
      approvedBy: user?.id,
      approvedByName: user?.fullName || '',
      approvalDate: new Date().toISOString(),
      approvalNotes: status === 'rejected' ? (notes || 'Rejected by admin') : '',
    });
    setActionItem(null);
    setActionType(null);
    setNotes('');
    load();
  }

  const filtered = filter === 'all' ? plans : plans.filter(p => p.status === filter);
  const pendingCount = plans.filter(p => p.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const statusBadge = (status) => {
    if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 text-xs border-0"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 text-xs border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} term plan{filtered.length !== 1 ? 's' : ''}
          {pendingCount > 0 && <span className="ml-1 text-amber-700">· {pendingCount} awaiting approval</span>}
        </p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No {filter !== 'all' ? filter : ''} term plans found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(plan => {
            const isExpanded = expandedId === plan.id;
            return (
              <Card key={plan.id} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{plan.subjectName} — {plan.className}</p>
                        {statusBadge(plan.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan.teacherName} · {plan.termName}{plan.academicYear ? ` ${plan.academicYear}` : ''} · {filledWeeks(plan.weeks)} of {(plan.weeks || []).length} weeks planned
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {plan.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={e => { e.stopPropagation(); setActionItem(plan); setActionType('approve'); }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setActionItem(plan); setActionType('reject'); }}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      <TermPlanWeeks plan={plan} />
                      {plan.approvalNotes && (
                        <div className={`p-2.5 rounded-md border text-sm ${plan.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                          <p className="text-xs font-semibold mb-0.5">{plan.status === 'rejected' ? 'Rejection Reason' : 'Approval Notes'}</p>
                          {plan.approvalNotes}
                        </div>
                      )}
                      {plan.status !== 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => { setActionItem(plan); setActionType('approve'); }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {plan.status === 'approved' ? 'Re-approve' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setActionItem(plan); setActionType('reject'); }}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> {plan.status === 'rejected' ? 'Update Rejection' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={actionType === 'approve'} onOpenChange={open => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this term plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The whole {actionItem?.subjectName} plan for {actionItem?.className} — all {(actionItem?.weeks || []).length} weeks and their topic PDFs — becomes visible to students and parents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => decide('approved')} className="bg-primary">Approve</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === 'reject'} onOpenChange={open => { if (!open) { setActionType(null); setNotes(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this term plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The plan stays hidden from students and parents. Add feedback so the teacher knows what to fix.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="mt-2"
          />
          <div className="flex gap-2 mt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => decide('rejected')} className="bg-destructive">Reject</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}