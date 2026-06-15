import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-blue-100 text-blue-700',
  unpaid: 'bg-orange-100 text-orange-700',
  overdue: 'bg-red-100 text-red-700',
  pending_confirmation: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function ParentFeesPayments() {
  const { schoolUser: user } = useSchoolAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, paymentDate: moment().format('YYYY-MM-DD'), paymentMethod: 'bank_transfer', referenceNumber: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, [user?.schoolId, user?.linkedStudentIds]);

  async function loadAll() {
    if (!user?.schoolId) return;
    const studentIds = user?.linkedStudentIds || [];
    if (studentIds.length === 0) { setLoading(false); return; }
    try {
      const students = await base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' });
      const linked = students.filter(s => studentIds.includes(s.id));
      setLinkedStudents(linked);

      const [inv, pay] = await Promise.all([
        base44.entities.FeeInvoice.filter({ schoolId: user.schoolId }),
        base44.entities.FeePayment.filter({ schoolId: user.schoolId }),
      ]);
      setInvoices(inv.filter(i => studentIds.includes(i.studentId)));
      setPayments(pay.filter(p => studentIds.includes(p.studentId)));
    } catch (e) {}
    setLoading(false);
  }

  const filteredInvoices = selectedStudentId === 'all' ? invoices : invoices.filter(i => i.studentId === selectedStudentId);
  const filteredPayments = selectedStudentId === 'all' ? payments : payments.filter(p => p.studentId === selectedStudentId);

  const totalOwed = filteredInvoices.reduce((s, i) => s + (i.outstandingBalance || 0), 0);
  const totalPaid = filteredPayments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);

  function openPayDialog(inv) {
    setPayingInvoice(inv);
    setPayForm({ amount: inv.outstandingBalance || 0, paymentDate: moment().format('YYYY-MM-DD'), paymentMethod: 'bank_transfer', referenceNumber: '', notes: '' });
    setShowPayDialog(true);
  }

  async function submitPayment() {
    if (!payingInvoice || !payForm.amount) return;
    setSubmitting(true);
    try {
      await base44.entities.FeePayment.create({
        ...payForm,
        schoolId: user.schoolId,
        invoiceId: payingInvoice.id,
        invoiceNumber: payingInvoice.invoiceNumber,
        studentId: payingInvoice.studentId,
        studentName: payingInvoice.studentName,
        classId: payingInvoice.classId,
        className: payingInvoice.className,
        term: payingInvoice.term,
        academicYear: payingInvoice.academicYear,
        status: 'pending',
        submittedByParent: true,
        parentId: user.id,
      });
      await base44.entities.FeeInvoice.update(payingInvoice.id, { status: 'pending_confirmation' });
      toast.success('Payment submitted for confirmation');
      setShowPayDialog(false);
      loadAll();
    } catch (e) {
      toast.error('Failed to submit payment');
    }
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (linkedStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p>No linked students found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Fees & Payments</h1><p className="text-sm text-muted-foreground mt-1">View and pay your children's school fees</p></div>
        {linkedStudents.length > 1 && (
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Students" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {linkedStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600 mt-1">₦{totalOwed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">₦{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Invoices</h2>
      {filteredInvoices.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No invoices found</p></CardContent></Card>
      ) : (
        <div className="space-y-3 mb-8">
          {filteredInvoices.map(inv => (
            <Card key={inv.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{inv.studentName}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {inv.term} · {inv.academicYear}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Due: {inv.dueDate ? moment(inv.dueDate).format('MMM D, YYYY') : 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>{inv.status?.replace('_', ' ')}</Badge>
                    {['unpaid', 'partially_paid', 'overdue'].includes(inv.status) && (
                      <Button size="sm" onClick={() => openPayDialog(inv)}><CreditCard className="w-3 h-3 mr-1" />Pay</Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <div><span className="text-muted-foreground">Total: </span><span className="font-medium">₦{(inv.totalAmount || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Paid: </span><span className="text-green-700 font-medium">₦{(inv.amountPaid || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Balance: </span><span className="text-red-700 font-bold">₦{(inv.outstandingBalance || 0).toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Payment History</h2>
      {filteredPayments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><p>No payment history</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredPayments.map(p => (
            <Card key={p.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.studentName} · {p.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{moment(p.paymentDate).format('MMM D, YYYY')} · {p.paymentMethod?.replace('_', ' ')}</p>
                    {p.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {p.referenceNumber}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">₦{(p.amount || 0).toLocaleString()}</p>
                    <Badge className={p.status === 'confirmed' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Payment — {payingInvoice?.studentName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm mb-1 block">Amount *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Payment Date</Label><Input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Payment Method</Label>
              <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm mb-1 block">Reference / Transaction Number</Label><Input value={payForm.referenceNumber} onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Bank reference, receipt #, etc." /></div>
            <div><Label className="text-sm mb-1 block">Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">Your payment will be submitted for confirmation by the school admin.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
              <Button onClick={submitPayment} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Payment'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}