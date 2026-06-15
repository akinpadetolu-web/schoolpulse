import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, AlertTriangle, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

function KPICard({ label, value, sub, color = 'text-foreground', icon: IconComp }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p>{sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}</div>
          {IconComp && <IconComp className="w-8 h-8 text-muted-foreground/30" />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPayments() {
  const { schoolUser: user } = useSchoolAuth();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showRecord, setShowRecord] = useState(false);
  const [payForm, setPayForm] = useState({ studentId: '', invoiceId: '', amount: 0, paymentDate: moment().format('YYYY-MM-DD'), paymentMethod: 'cash', referenceNumber: '', notes: '' });
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadAll(); }, [user?.schoolId]);

  async function loadAll() {
    if (!user?.schoolId) return;
    try {
      const [pays, invs, sts] = await Promise.all([
        base44.entities.FeePayment.filter({ schoolId: user.schoolId }),
        base44.entities.FeeInvoice.filter({ schoolId: user.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' }),
      ]);
      setPayments(pays);
      setInvoices(invs);
      setStudents(sts);
    } catch (e) {}
    setLoading(false);
  }

  const pending = payments.filter(p => p.status === 'pending');
  const confirmed = payments.filter(p => p.status === 'confirmed');
  const totalCollected = confirmed.reduce((s, p) => s + (+p.amount || 0), 0);
  const totalExpected = invoices.reduce((s, i) => s + (+i.totalAmount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (+i.outstandingBalance || 0), 0);

  async function confirmPayment(payment) {
    const inv = invoices.find(i => i.id === payment.invoiceId);
    const newPaid = (inv?.amountPaid || 0) + (+payment.amount || 0);
    const newBalance = (inv?.totalAmount || 0) - newPaid;
    await base44.entities.FeePayment.update(payment.id, { status: 'confirmed', confirmedBy: user.fullName, confirmedAt: new Date().toISOString() });
    if (inv) {
      await base44.entities.FeeInvoice.update(inv.id, { amountPaid: newPaid, outstandingBalance: Math.max(0, newBalance), status: newBalance <= 0 ? 'paid' : 'partially_paid' });
    }
    toast.success('Payment confirmed!');
    loadAll();
  }

  async function rejectPayment() {
    if (!rejectReason) { toast.error('Please provide a rejection reason'); return; }
    await base44.entities.FeePayment.update(rejectDialog.id, { status: 'rejected', rejectedBy: user.fullName, rejectedAt: new Date().toISOString(), rejectionReason: rejectReason });
    toast.success('Payment rejected');
    setRejectDialog(null);
    setRejectReason('');
    loadAll();
  }

  async function recordManualPayment() {
    if (!payForm.studentId || !payForm.amount) { toast.error('Fill in required fields'); return; }
    const inv = invoices.find(i => i.id === payForm.invoiceId);
    await base44.entities.FeePayment.create({ ...payForm, schoolId: user.schoolId, studentName: students.find(s => s.id === payForm.studentId)?.fullName || '', invoiceNumber: inv?.invoiceNumber || '', status: 'confirmed', confirmedBy: user.fullName, confirmedAt: new Date().toISOString() });
    if (inv) {
      const newPaid = (inv.amountPaid || 0) + (+payForm.amount);
      await base44.entities.FeeInvoice.update(inv.id, { amountPaid: newPaid, outstandingBalance: Math.max(0, (inv.totalAmount || 0) - newPaid), status: newPaid >= (inv.totalAmount || 0) ? 'paid' : 'partially_paid' });
    }
    toast.success('Payment recorded');
    setShowRecord(false);
    loadAll();
  }

  const filtered = payments.filter(p => {
    const matchSearch = !search || p.studentName?.toLowerCase().includes(search.toLowerCase()) || p.referenceNumber?.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchMethod = filterMethod === 'all' || p.paymentMethod === filterMethod;
    return matchSearch && matchStatus && matchMethod;
  });

  const studentInvoices = payForm.studentId ? invoices.filter(i => i.studentId === payForm.studentId && i.outstandingBalance > 0) : [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Payments</h1><p className="text-sm text-muted-foreground mt-1">Track and manage all fee payments</p></div>
        <Button onClick={() => setShowRecord(true)}><Plus className="w-4 h-4 mr-2" />Record Payment</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard label="Total Expected" value={`₦${totalExpected.toLocaleString()}`} icon={DollarSign} />
        <KPICard label="Total Collected" value={`₦${totalCollected.toLocaleString()}`} color="text-green-700" icon={TrendingUp} />
        <KPICard label="Outstanding" value={`₦${totalOutstanding.toLocaleString()}`} color="text-red-700" icon={AlertTriangle} />
        <KPICard label="Collection Rate" value={totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}%` : '0%'} icon={TrendingUp} />
        <KPICard label="Pending Confirmations" value={pending.length} color={pending.length > 0 ? 'text-orange-600' : 'text-foreground'} sub={pending.length > 0 ? 'Requires action' : 'None pending'} icon={Clock} />
        <KPICard label="Confirmed Payments" value={confirmed.length} color="text-green-700" icon={CheckCircle} />
      </div>

      {/* Pending Confirmations */}
      {pending.length > 0 && (
        <Card className="mb-6 border-orange-200">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" />Pending Confirmations ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 bg-orange-50/50">
                <div>
                  <p className="font-medium text-sm">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground">{p.className} · ₦{(+p.amount || 0).toLocaleString()} · {p.paymentMethod?.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">Submitted: {moment(p.created_date).fromNow()}</p>
                  {p.referenceNumber && <p className="text-xs font-mono text-muted-foreground">Ref: {p.referenceNumber}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => confirmPayment(p)}><CheckCircle className="w-3 h-3 mr-1" />Confirm</Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectDialog(p)}><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Payments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by student or reference..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Methods</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="paystack">Paystack</SelectItem><SelectItem value="stripe">Stripe</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>{['Date', 'Student', 'Class', 'Invoice', 'Amount', 'Method', 'Reference', 'Confirmed By', 'Status'].map(h => <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">No payments found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="p-3">{moment(p.paymentDate || p.created_date).format('MMM D, YYYY')}</td>
                    <td className="p-3 font-medium">{p.studentName}</td>
                    <td className="p-3 text-muted-foreground">{p.className}</td>
                    <td className="p-3 font-mono text-xs">{p.invoiceNumber}</td>
                    <td className="p-3 font-medium">₦{(+p.amount || 0).toLocaleString()}</td>
                    <td className="p-3 capitalize">{p.paymentMethod?.replace('_', ' ')}</td>
                    <td className="p-3 font-mono text-xs">{p.referenceNumber || '-'}</td>
                    <td className="p-3 text-muted-foreground">{p.confirmedBy || '-'}</td>
                    <td className="p-3">
                      <Badge className={p.status === 'confirmed' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={showRecord} onOpenChange={setShowRecord}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Manual Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1 block">Student *</Label>
              <Select onValueChange={v => setPayForm(f => ({ ...f, studentId: v, invoiceId: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent className="max-h-48">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} — {s.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {studentInvoices.length > 0 && (
              <div>
                <Label className="text-sm mb-1 block">Invoice</Label>
                <Select onValueChange={v => { const inv = invoices.find(i => i.id === v); setPayForm(f => ({ ...f, invoiceId: v, amount: inv?.outstandingBalance || 0 })); }}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>{studentInvoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} — Balance: ₦{(i.outstandingBalance || 0).toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-sm mb-1 block">Amount *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Payment Date</Label><Input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
            <div>
              <Label className="text-sm mb-1 block">Payment Method</Label>
              <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="paystack">Paystack</SelectItem><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm mb-1 block">Reference Number</Label><Input value={payForm.referenceNumber} onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRecord(false)}>Cancel</Button>
              <Button onClick={recordManualPayment}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Rejecting payment of ₦{(+rejectDialog?.amount || 0).toLocaleString()} from {rejectDialog?.studentName}</p>
            <div><Label className="text-sm mb-1 block">Rejection Reason *</Label><Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={rejectPayment}>Reject Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}