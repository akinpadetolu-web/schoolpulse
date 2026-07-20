import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, CreditCard, CheckCircle2, Clock, BookOpen, Loader2,
  ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
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

const FINE_STATUS_STYLES = {
  pending: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-600',
};

const FINE_TYPE_LABELS = {
  overdue: 'Overdue Book',
  damage: 'Book Damage',
  loss: 'Book Loss',
};

export default function ParentFeesPayments() {
  const { schoolUser: user } = useSchoolAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fines, setFines] = useState([]);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [paySettings, setPaySettings] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [payingItem, setPayingItem] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feeStructures, setFeeStructures] = useState([]);

  const currency = paySettings?.currencySymbol || '₦';

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('reference') || urlParams.get('trxref');
    if (ref) {
      verifyTransaction(ref);
    }
    loadAll();
  }, [user?.schoolId, user?.linkedStudentIds]);

  async function loadAll() {
    if (!user?.schoolId) return;
    const studentIds = user?.linkedStudentIds || [];
    if (studentIds.length === 0) { setLoading(false); return; }
    try {
      const students = await base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' });
      const linked = students.filter(s => studentIds.includes(s.id));
      setLinkedStudents(linked);

      const [inv, pay, fineRes, settings, structRes] = await Promise.all([
        base44.entities.FeeInvoice.filter({ schoolId: user.schoolId }),
        base44.entities.FeePayment.filter({ schoolId: user.schoolId }),
        base44.entities.BookFine.filter({ schoolId: user.schoolId }),
        base44.entities.PaymentSettings.filter({ schoolId: user.schoolId }),
        base44.entities.FeeStructure.filter({ schoolId: user.schoolId }),
      ]);

      setInvoices(inv.filter(i => studentIds.includes(i.studentId)));
      setPayments(pay.filter(p => studentIds.includes(p.studentId)));
      setFines(fineRes.filter(f => studentIds.includes(f.studentId)));
      setFeeStructures(structRes || []);
      setPaySettings((settings || [])[0] || null);
    } catch (e) {}
    setLoading(false);
  }

  async function verifyTransaction(reference) {
    setVerifying(true);
    try {
      const res = await base44.functions.invoke('paystackPayment', { action: 'verify', reference });
      const data = res.data || res;
      if (data.status === 'success') {
        toast.success(`Payment of ${currency}${(data.amount || 0).toLocaleString()} confirmed!`);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        toast.error('Payment verification failed or was not completed');
      }
    } catch (e) {
      toast.error('Could not verify payment. If you were charged, contact the school.');
    }
    setVerifying(false);
    loadAll();
  }

  const paystackEnabled = paySettings?.paystackEnabled || paySettings?.primaryGateway === 'paystack';

  const filteredInvoices = selectedStudentId === 'all' ? invoices : invoices.filter(i => i.studentId === selectedStudentId);
  const filteredFines = selectedStudentId === 'all' ? fines : fines.filter(f => f.studentId === selectedStudentId);
  const filteredPayments = selectedStudentId === 'all' ? payments : payments.filter(p => p.studentId === selectedStudentId);

  const applicableStructures = useMemo(() => {
    const students = selectedStudentId === 'all' ? linkedStudents : linkedStudents.filter(s => s.id === selectedStudentId);
    const result = [];
    for (const student of students) {
      for (const structure of feeStructures) {
        if (structure.status !== 'active') continue;
        const applies = structure.applyToAllClasses || (structure.applicableClasses || []).includes(student.classId);
        if (!applies) continue;
        const alreadyPaid = invoices.some(inv => inv.studentId === student.id && inv.feeStructureId === structure.id && inv.status === 'paid');
        result.push({ student, structure, alreadyPaid });
      }
    }
    return result;
  }, [linkedStudents, feeStructures, selectedStudentId, invoices]);

  const totalFeesOwed = filteredInvoices.reduce((s, i) => s + (i.outstandingBalance || 0), 0)
    + applicableStructures.filter(a => !a.alreadyPaid).reduce((s, a) => s + (a.structure.totalAmount || 0), 0);
  const totalFinesOwed = filteredFines.filter(f => f.status === 'pending').reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = filteredPayments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);

  function openPayDialog(item, type) {
    setPayingItem({ ...item, _type: type });
    if (type === 'fine') setPayAmount(item.amount || 0);
    else if (type === 'structure') setPayAmount(item.totalAmount || 0);
    else setPayAmount(item.outstandingBalance || 0);
  }

  async function initiatePaystack() {
    if (!payingItem || !payAmount) return;
    setSubmitting(true);
    try {
      const isFine = payingItem._type === 'fine';
      const isStructure = payingItem._type === 'structure';
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const res = await base44.functions.invoke('paystackPayment', {
        action: 'initialize',
        schoolId: user.schoolId,
        invoiceId: (isFine || isStructure) ? null : payingItem.id,
        bookFineId: isFine ? payingItem.id : null,
        feeStructureId: isStructure ? payingItem.id : null,
        paymentType: isFine ? 'library_fine' : 'school_fees',
        amount: payAmount,
        studentId: payingItem.studentId,
        studentName: payingItem.studentName,
        classId: payingItem.classId || null,
        className: payingItem.className || null,
        email: user.email,
        parentId: user.id,
        callbackUrl,
      });
      const data = res.data || res;
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Failed to start payment');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to start payment';
      toast.error(msg);
    }
    setSubmitting(false);
  }

  if (loading || verifying) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        {verifying ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Verifying your payment...</p>
          </>
        ) : (
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p>No linked students found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Pay school fees and library fines</p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-muted-foreground font-medium">Outstanding Fees</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{currency}{totalFeesOwed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-muted-foreground font-medium">Library Fines</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{currency}{totalFinesOwed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{currency}{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Paystack notice */}
      {paystackEnabled && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Secure online payments powered by <strong className="text-foreground">Paystack</strong>. Click "Pay with Paystack" on any item below.</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="fees">
        <TabsList className="mb-4">
          <TabsTrigger value="fees">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> School Fees
            {totalFeesOwed > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">{filteredInvoices.filter(i => (i.outstandingBalance || 0) > 0).length}</span>}
          </TabsTrigger>
          <TabsTrigger value="fines">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Library Fines
            {totalFinesOwed > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">{filteredFines.filter(f => f.status === 'pending').length}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* School Fees Tab */}
        <TabsContent value="fees">
          {/* Fee Structures */}
          {applicableStructures.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Applicable Fee Structures</p>
              <div className="space-y-3">
                {applicableStructures.map(({ student, structure, alreadyPaid }) => (
                  <Card key={`${student.id}-${structure.id}`} className="overflow-hidden">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{student.fullName}</p>
                            <Badge className="bg-blue-100 text-blue-700">Fee Structure</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{structure.name} · {structure.term} · {structure.academicYear}</p>
                        </div>
                        {alreadyPaid ? (
                          <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                        ) : (
                          <Button size="sm" onClick={() => openPayDialog({ ...structure, studentId: student.id, studentName: student.fullName, classId: student.classId, className: student.className }, 'structure')}>
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            Pay {currency}{(structure.totalAmount || 0).toLocaleString()}
                          </Button>
                        )}
                      </div>
                      {(structure.feeItems || []).length > 0 && (
                        <div className="mt-3 border-t pt-3 space-y-1">
                          {structure.feeItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.feeTypeName}</span>
                              <span>{currency}{(item.amount || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold pt-1 border-t mt-1">
                            <span>Total</span>
                            <span>{currency}{(structure.totalAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              {applicableStructures.length > 0 && <p className="text-sm font-medium text-muted-foreground mb-2">Invoices</p>}
              <div className="space-y-3">
                {filteredInvoices.map(inv => (
                  <Card key={inv.id} className="overflow-hidden">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{inv.studentName}</p>
                            <Badge className={STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>{inv.status?.replace(/_/g, ' ')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{inv.invoiceNumber} · {inv.term} · {inv.academicYear}</p>
                          {inv.dueDate && <p className="text-xs text-muted-foreground mt-0.5">Due: {moment(inv.dueDate).format('MMM D, YYYY')}</p>}
                        </div>
                        {['unpaid', 'partially_paid', 'overdue'].includes(inv.status) && (inv.outstandingBalance || 0) > 0 && (
                          <Button size="sm" onClick={() => openPayDialog(inv, 'invoice')}>
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            Pay {currency}{(inv.outstandingBalance || 0).toLocaleString()}
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-4 mt-3 text-sm border-t pt-3">
                        <div><span className="text-muted-foreground">Total: </span><span className="font-medium">{currency}{(inv.totalAmount || 0).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Paid: </span><span className="text-green-700 font-medium">{currency}{(inv.amountPaid || 0).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Balance: </span><span className="text-red-700 font-bold">{currency}{(inv.outstandingBalance || 0).toLocaleString()}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {applicableStructures.length === 0 && filteredInvoices.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No fees found</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Library Fines Tab */}
        <TabsContent value="fines">
          {filteredFines.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No library fines</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredFines.map(fine => (
                <Card key={fine.id} className="overflow-hidden">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{fine.studentName}</p>
                          <Badge className={FINE_STATUS_STYLES[fine.status] || 'bg-gray-100 text-gray-600'}>{fine.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fine.bookTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {FINE_TYPE_LABELS[fine.fineType] || fine.fineType}
                          {fine.fineType === 'overdue' && fine.daysLate > 0 && ` · ${fine.daysLate} day(s) late`}
                        </p>
                        {fine.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">{fine.reason}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600 text-lg">{currency}{(fine.amount || 0).toLocaleString()}</p>
                        {fine.status === 'pending' && (
                          <Button size="sm" className="mt-1" onClick={() => openPayDialog(fine, 'fine')}>
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Pay Fine
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {filteredPayments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No payment history</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map(p => (
                <Card key={p.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.studentName}</p>
                          {p.paymentType === 'library_fine' && <Badge variant="outline" className="text-xs">Library Fine</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {moment(p.paymentDate).format('MMM D, YYYY')} · {p.paymentMethod?.replace(/_/g, ' ')}
                        </p>
                        {p.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {p.referenceNumber}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">{currency}{(p.amount || 0).toLocaleString()}</p>
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
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={!!payingItem} onOpenChange={(open) => !open && setPayingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {payingItem?._type === 'fine' ? 'Pay Library Fine' : 'Pay School Fees'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{payingItem?.studentName}</p>
              {payingItem?._type === 'fine' ? (
                <p className="text-xs text-muted-foreground mt-0.5">{payingItem?.bookTitle} · {FINE_TYPE_LABELS[payingItem?.fineType] || payingItem?.fineType}</p>
              ) : payingItem?._type === 'structure' ? (
                <p className="text-xs text-muted-foreground mt-0.5">{payingItem?.name} · {payingItem?.term} · {payingItem?.academicYear}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">{payingItem?.invoiceNumber} · {payingItem?.term}</p>
              )}
            </div>

            <div>
              <Label className="text-sm mb-1 block">Amount to Pay ({currency})</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(+e.target.value)}
                disabled={payingItem?._type === 'fine'}
              />
              {payingItem?._type === 'invoice' && (
                <p className="text-xs text-muted-foreground mt-1">Outstanding: {currency}{(payingItem?.outstandingBalance || 0).toLocaleString()}</p>
              )}
              {payingItem?._type === 'structure' && (
                <p className="text-xs text-muted-foreground mt-1">Total: {currency}{(payingItem?.totalAmount || 0).toLocaleString()}</p>
              )}
            </div>

            {paystackEnabled ? (
              <Button onClick={initiatePaystack} disabled={submitting || !payAmount} className="w-full" size="lg">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Paystack...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" /> Pay with Paystack <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
                Online payment is not enabled. Please contact the school to pay in person.
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">You will be redirected to Paystack's secure checkout to complete your payment.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}