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
import { Search, Plus, Eye, Send, Trash2, FileText, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
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

function InvoiceDetailDialog({ invoice, open, onClose, onRecordPayment }) {
  if (!invoice) return null;
  const currency = '₦';
  const fmt = n => `${currency}${(+n || 0).toLocaleString()}`;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invoice #{invoice.invoiceNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{invoice.studentName}</p>
                <p className="text-sm text-muted-foreground">{invoice.className} · {invoice.admissionNumber || 'N/A'}</p>
              </div>
              <Badge className={STATUS_STYLES[invoice.status] || 'bg-gray-100 text-gray-600'}>{invoice.status?.replace('_', ' ')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div><span className="text-muted-foreground">Invoice Date:</span> {moment(invoice.invoiceDate).format('MMM D, YYYY')}</div>
              <div><span className="text-muted-foreground">Due Date:</span> {moment(invoice.dueDate).format('MMM D, YYYY')}</div>
              <div><span className="text-muted-foreground">Term:</span> {invoice.term}</div>
              <div><span className="text-muted-foreground">Academic Year:</span> {invoice.academicYear}</div>
            </div>
          </div>

          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Fee Type</th><th className="text-right p-2">Amount</th></tr></thead>
            <tbody>
              {(invoice.feeItems || []).map((item, i) => (
                <tr key={i} className="border-t"><td className="p-2">{item.feeTypeName}</td><td className="text-right p-2">{fmt(item.amount)}</td></tr>
              ))}
              {(invoice.discounts || []).map((d, i) => (
                <tr key={'d' + i} className="border-t text-green-700"><td className="p-2">Discount: {d.discountName}</td><td className="text-right p-2">-{fmt(d.amount)}</td></tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 font-semibold">
              <tr className="border-t"><td className="p-2">Total</td><td className="text-right p-2">{fmt(invoice.totalAmount)}</td></tr>
              <tr className="border-t text-green-700"><td className="p-2">Amount Paid</td><td className="text-right p-2">{fmt(invoice.amountPaid)}</td></tr>
              <tr className="border-t text-red-700 font-bold"><td className="p-2">Outstanding Balance</td><td className="text-right p-2">{fmt(invoice.outstandingBalance)}</td></tr>
            </tfoot>
          </table>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => onRecordPayment(invoice)} className="flex-1"><CheckCircle className="w-4 h-4 mr-2" />Record Payment</Button>
            <Button variant="outline" className="flex-1"><Send className="w-4 h-4 mr-2" />Send to Parent</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateInvoiceDialog({ open, onClose, students, feeStructures, feeTypes, onSave }) {
  const [form, setForm] = useState({ studentId: '', studentName: '', classId: '', className: '', feeStructureId: '', term: '', academicYear: '', feeItems: [], notes: '' });

  function selectStudent(student) {
    setForm(f => ({ ...f, studentId: student.id, studentName: student.fullName, classId: student.classId || '', className: student.className || '' }));
  }

  function selectStructure(id) {
    const st = feeStructures.find(s => s.id === id);
    if (st) {
      setForm(f => ({ ...f, feeStructureId: id, feeStructureName: st.name, term: st.term, academicYear: st.academicYear, feeItems: (st.feeItems || []).map(i => ({ ...i })) }));
    }
  }

  const total = form.feeItems.reduce((s, i) => s + (+i.amount || 0), 0);
  const today = moment().format('YYYY-MM-DD');
  const due = moment().add(30, 'days').format('YYYY-MM-DD');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm mb-1 block">Student *</Label>
            <Select onValueChange={id => { const s = students.find(st => st.id === id); if (s) selectStudent(s); }}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="max-h-48">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} — {s.className}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-1 block">Fee Structure</Label>
            <Select onValueChange={selectStructure}>
              <SelectTrigger><SelectValue placeholder="Select structure (or add items manually)" /></SelectTrigger>
              <SelectContent>{feeStructures.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm mb-1 block">Invoice Date</Label><Input type="date" defaultValue={today} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Due Date</Label><Input type="date" defaultValue={due} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          {form.feeItems.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Fee Items</Label>
              {form.feeItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm border rounded p-2 mb-1">
                  <span>{item.feeTypeName}</span>
                  <span className="font-medium">{(+item.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              <p className="text-sm font-bold text-right mt-1">Total: {total.toLocaleString()}</p>
            </div>
          )}
          <div><Label className="text-sm mb-1 block">Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { if (!form.studentId) { toast.error('Select a student'); return; } onSave({ ...form, totalAmount: total, subtotal: total, amountPaid: 0, outstandingBalance: total, status: 'unpaid', invoiceDate: form.invoiceDate || today, dueDate: form.dueDate || due }); onClose(); }}>Create Invoice</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminInvoices() {
  const { schoolUser: user } = useSchoolAuth();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, paymentDate: moment().format('YYYY-MM-DD'), paymentMethod: 'cash', referenceNumber: '', notes: '' });

  useEffect(() => { loadAll(); }, [user?.schoolId]);

  async function loadAll() {
    if (!user?.schoolId) return;
    try {
      const [inv, st, str, ft] = await Promise.all([
        base44.entities.FeeInvoice.filter({ schoolId: user.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' }),
        base44.entities.FeeStructure.filter({ schoolId: user.schoolId }),
        base44.entities.FeeType.filter({ schoolId: user.schoolId }),
      ]);
      setInvoices(inv);
      setStudents(st);
      setStructures(str);
      setFeeTypes(ft);
    } catch (e) {}
    setLoading(false);
  }

  async function createInvoice(form) {
    const count = invoices.length + 1;
    const num = `${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    await base44.entities.FeeInvoice.create({ ...form, schoolId: user.schoolId, invoiceNumber: `INV-${num}`, createdByName: user.fullName });
    toast.success('Invoice created');
    loadAll();
  }

  async function deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return;
    await base44.entities.FeeInvoice.delete(id);
    toast.success('Deleted');
    loadAll();
  }

  async function recordPayment() {
    if (!payingInvoice || !payForm.amount) return;
    const newPaid = (payingInvoice.amountPaid || 0) + (+payForm.amount);
    const newBalance = (payingInvoice.totalAmount || 0) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await base44.entities.FeePayment.create({ ...payForm, schoolId: user.schoolId, invoiceId: payingInvoice.id, invoiceNumber: payingInvoice.invoiceNumber, studentId: payingInvoice.studentId, studentName: payingInvoice.studentName, classId: payingInvoice.classId, className: payingInvoice.className, status: 'confirmed', confirmedBy: user.fullName, confirmedAt: new Date().toISOString() });
    await base44.entities.FeeInvoice.update(payingInvoice.id, { amountPaid: newPaid, outstandingBalance: Math.max(0, newBalance), status: newStatus });
    toast.success('Payment recorded');
    setShowRecordPayment(false);
    setSelectedInvoice(null);
    loadAll();
  }

  const classes = [...new Set(invoices.map(i => i.className).filter(Boolean))];
  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.studentName?.toLowerCase().includes(search.toLowerCase()) || inv.invoiceNumber?.includes(search) || inv.className?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchClass = filterClass === 'all' || inv.className === filterClass;
    return matchSearch && matchStatus && matchClass;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-muted-foreground mt-1">Manage student fee invoices</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by student, class, invoice #..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid in Full</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending_confirmation">Pending Confirmation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No invoices found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>{['Invoice #', 'Student', 'Class', 'Term', 'Total', 'Paid', 'Balance', 'Due Date', 'Status', 'Actions'].map(h => <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} className="border-b hover:bg-muted/20">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3 font-medium">{inv.studentName}</td>
                      <td className="p-3 text-muted-foreground">{inv.className}</td>
                      <td className="p-3 text-muted-foreground">{inv.term}</td>
                      <td className="p-3 font-medium">₦{(inv.totalAmount || 0).toLocaleString()}</td>
                      <td className="p-3 text-green-700">₦{(inv.amountPaid || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-red-700">₦{(inv.outstandingBalance || 0).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{inv.dueDate ? moment(inv.dueDate).format('MMM D, YYYY') : '-'}</td>
                      <td className="p-3"><Badge className={STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>{inv.status?.replace('_', ' ')}</Badge></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(inv)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteInvoice(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDetailDialog invoice={selectedInvoice} open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} onRecordPayment={inv => { setPayingInvoice(inv); setPayForm({ amount: inv.outstandingBalance, paymentDate: moment().format('YYYY-MM-DD'), paymentMethod: 'cash', referenceNumber: '', notes: '' }); setSelectedInvoice(null); setShowRecordPayment(true); }} />
      <CreateInvoiceDialog open={showCreate} onClose={() => setShowCreate(false)} students={students} feeStructures={structures} feeTypes={feeTypes} onSave={createInvoice} />

      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {payingInvoice?.studentName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm mb-1 block">Amount *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Payment Date</Label><Input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Payment Method</Label>
              <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="paystack">Paystack</SelectItem><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm mb-1 block">Reference Number</Label><Input value={payForm.referenceNumber} onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRecordPayment(false)}>Cancel</Button>
              <Button onClick={recordPayment}>Confirm Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}