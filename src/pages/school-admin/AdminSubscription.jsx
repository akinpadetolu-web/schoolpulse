import React, { useState, useEffect, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Calendar, Wallet, Users } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function AdminSubscription() {
  const { schoolUser: user } = useSchoolAuth();
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const alatpayLoaded = useRef(false);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://web.alatpay.ng/js/alatpay.js"]');
    if (existing) { alatpayLoaded.current = true; return; }
    const script = document.createElement('script');
    script.src = 'https://web.alatpay.ng/js/alatpay.js';
    script.async = true;
    script.onload = () => { alatpayLoaded.current = true; };
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  useEffect(() => { loadAll(); }, [user?.schoolId]);

  async function loadAll() {
    if (!user?.schoolId) return;
    try {
      const [subRes, payRes] = await Promise.all([
        base44.entities.SchoolSubscription.filter({ schoolId: user.schoolId }),
        base44.entities.SubscriptionPayment.filter({ schoolId: user.schoolId }),
      ]);
      setSubscription((subRes || [])[0] || null);
      setPayments(payRes || []);
    } catch {}
    setLoading(false);
  }

  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = subscription ? Math.max(0, (subscription.totalAmount || 0) - totalPaid) : 0;
  const nextInstallment = confirmedPayments.length + 1;
  const installmentAmount = subscription?.installmentAmount || 0;
  const amountDue = subscription?.installmentCount > 1 ? Math.min(installmentAmount, balance) : balance;

  async function handlePay() {
    if (!subscription || amountDue <= 0) return;
    if (!window.Alatpay) {
      toast.error('Payment plugin not loaded yet. Please wait a moment and try again.');
      return;
    }
    setPaying(true);
    try {
      const res = await base44.functions.invoke('alatPaySubscription', {
        action: 'initialize',
        schoolId: user.schoolId,
        email: user.email,
        amount: amountDue,
      });
      const data = res.data || res;
      if (!data.publicKey || !data.businessId) {
        toast.error('ALAT Pay is not configured. Please contact support.');
        setPaying(false);
        return;
      }

      const names = (user.fullName || 'School Admin').split(' ');
      const firstName = names[0] || 'School';
      const lastName = names.slice(1).join(' ') || 'Admin';

      const popup = window.Alatpay.setup({
        apiKey: data.publicKey,
        businessId: data.businessId,
        email: user.email,
        firstName,
        lastName,
        currency: 'NGN',
        amount: amountDue,
        metadata: {
          schoolId: user.schoolId,
          subscriptionId: subscription.id,
          installmentNumber: nextInstallment,
          totalInstallments: subscription.installmentCount || 1,
          paidBy: user.id,
          paidByName: user.fullName,
          paidByEmail: user.email,
        },
        onTransaction: function (response) {
          handleTransactionResponse(response);
        },
        onClose: function () {
          setPaying(false);
        },
      });

      popup.show();
    } catch (e) {
      toast.error(e?.message || 'Failed to start payment');
      setPaying(false);
    }
  }

  async function handleTransactionResponse(response) {
    setPaying(false);
    setVerifying(true);
    try {
      const txnId = response?.transactionId || response?.id || response?.reference
        || response?.data?.transactionId || response?.data?.id || response?.data?.reference;
      if (!txnId) {
        toast.error('No transaction ID received. Please contact support with your payment receipt.');
        setVerifying(false);
        return;
      }

      const res = await base44.functions.invoke('alatPaySubscription', {
        action: 'verify',
        transactionId: txnId,
        schoolId: user.schoolId,
        subscriptionId: subscription.id,
        installmentNumber: nextInstallment,
        totalInstallments: subscription.installmentCount || 1,
        paidBy: user.id,
        paidByName: user.fullName,
        paidByEmail: user.email,
      });
      const data = res.data || res;
      if (data.status === 'success') {
        toast.success(`Subscription payment of ₦${(data.amount || amountDue).toLocaleString()} confirmed!`);
        loadAll();
      } else {
        toast.error('Payment verification failed. If you were charged, please contact support.');
      }
    } catch (e) {
      toast.error('Could not verify payment. If you were charged, please contact support.');
    }
    setVerifying(false);
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

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <CreditCard className="w-10 h-10 mb-3 opacity-40" />
        <p>No subscription configured for your school yet.</p>
        <p className="text-sm mt-1">Please contact support to set up your subscription plan.</p>
      </div>
    );
  }

  const currencySymbol = '₦';
  const isFullyPaid = balance <= 0;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your school's subscription payment</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
            </div>
            <p className="text-xl font-bold">{currencySymbol}{(subscription.totalAmount || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
            </div>
            <p className="text-xl font-bold text-green-600">{currencySymbol}{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={isFullyPaid ? 'border-green-200' : 'border-red-200'}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={`w-4 h-4 ${isFullyPaid ? 'text-green-500' : 'text-red-500'}`} />
              <p className="text-xs text-muted-foreground font-medium">{isFullyPaid ? 'Fully Paid' : 'Balance'}</p>
            </div>
            <p className={`text-xl font-bold ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>{currencySymbol}{balance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Status</p>
            </div>
            <Badge className={STATUS_STYLES[subscription.status] || 'bg-gray-100 text-gray-600'}>{subscription.status}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Subscription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Plan Tier</p>
              <p className="font-medium">{subscription.tierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billing Cycle</p>
              <p className="font-medium capitalize">{(subscription.billingCycle || 'annual').replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Registered Students</p>
              <p className="font-medium">{subscription.registeredStudents || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Price Per Student</p>
              <p className="font-medium">{currencySymbol}{(subscription.pricePerStudent || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Installments</p>
              <p className="font-medium">{subscription.installmentCount || 1} × {currencySymbol}{(subscription.installmentAmount || 0).toLocaleString()}</p>
            </div>
            {subscription.startDate && (
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{moment(subscription.startDate).format('MMM D, YYYY')}</p>
              </div>
            )}
            {subscription.endDate && (
              <div>
                <p className="text-xs text-muted-foreground">Expiry Date</p>
                <p className="font-medium">{moment(subscription.endDate).format('MMM D, YYYY')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Action */}
      {!isFullyPaid && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium">Payment Due</p>
                {subscription.installmentCount > 1 && nextInstallment <= subscription.installmentCount && (
                  <p className="text-xs text-muted-foreground">Installment {nextInstallment} of {subscription.installmentCount}</p>
                )}
                <p className="text-2xl font-bold text-primary mt-1">{currencySymbol}{amountDue.toLocaleString()}</p>
              </div>
              <Button size="lg" onClick={handlePay} disabled={paying}>
                {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Pay with ALAT Pay
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fully Paid Banner */}
      {isFullyPaid && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-700">Subscription Fully Paid</p>
              <p className="text-sm text-green-600">Your subscription is active. Thank you for your payment!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <p>No payments yet</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <Card key={p.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{p.tierName || 'Subscription'}</p>
                        {p.installmentNumber > 0 && <Badge variant="outline" className="text-xs">Installment {p.installmentNumber}/{p.totalInstallments}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {moment(p.paymentDate).format('MMM D, YYYY')} · {p.paymentMethod}
                      </p>
                      {p.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {p.referenceNumber}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{currencySymbol}{(p.amount || 0).toLocaleString()}</p>
                      <Badge className={p.status === 'confirmed' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}