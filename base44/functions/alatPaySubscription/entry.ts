import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ALATPAY_BASE_URL = 'https://apibox.alatpay.ng';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    const secretKey = Deno.env.get("ALATPAY_SECRET_KEY");
    const publicKey = Deno.env.get("ALATPAY_PUBLIC_KEY");
    const businessId = Deno.env.get("ALATPAY_BUSINESS_ID");

    if (!secretKey || !publicKey || !businessId) {
      return Response.json({ error: 'ALAT Pay credentials are not configured' }, { status: 500 });
    }

    // ── Initialize: return public key + business ID for the web plugin ──
    if (action === 'initialize') {
      const { schoolId, email, amount } = body;
      if (!schoolId || !amount || !email) {
        return Response.json({ error: 'Missing required fields (schoolId, amount, email)' }, { status: 400 });
      }

      // Load the school's subscription to validate
      const subs = await base44.asServiceRole.entities.SchoolSubscription.filter({ schoolId });
      const subscription = (subs || [])[0];
      if (!subscription) {
        return Response.json({ error: 'No subscription configured for this school' }, { status: 404 });
      }

      return Response.json({
        publicKey,
        businessId,
        amount,
        email,
        subscriptionId: subscription.id,
        tierName: subscription.tierName,
      });
    }

    // ── Verify: confirm transaction via ALAT Pay Transaction Monitoring API ──
    if (action === 'verify') {
      const { transactionId, schoolId, subscriptionId, installmentNumber, totalInstallments, paidBy, paidByName, paidByEmail } = body;
      if (!transactionId || !schoolId) {
        return Response.json({ error: 'Missing transactionId or schoolId' }, { status: 400 });
      }

      // Prevent duplicate processing
      const existing = await base44.asServiceRole.entities.SubscriptionPayment.filter({ transactionId, schoolId });
      if (existing && existing.length > 0) {
        return Response.json({ status: 'success', reference: transactionId, amount: existing[0].amount, alreadyProcessed: true });
      }

      // Call ALAT Pay Transaction Monitoring API
      const alatRes = await fetch(
        `${ALATPAY_BASE_URL}/alatpaytransaction/api/v1/transactions/${encodeURIComponent(transactionId)}`,
        { headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' } }
      );

      if (!alatRes.ok) {
        return Response.json({ error: 'Failed to verify transaction with ALAT Pay' }, { status: 400 });
      }

      const txData = await alatRes.json();
      const tx = txData.data || txData;

      // Check transaction status — ALAT Pay uses "success" for completed payments
      const txStatus = (tx.status || '').toLowerCase();
      if (txStatus !== 'success' && txStatus !== 'completed' && txStatus !== 'successful') {
        return Response.json({ status: txStatus || 'unknown', reference: transactionId });
      }

      const paidAmount = tx.amount || 0;
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // Load subscription
      const subscription = await base44.asServiceRole.entities.SchoolSubscription.get(subscriptionId);
      if (!subscription) {
        return Response.json({ error: 'Subscription not found' }, { status: 404 });
      }

      // Create payment record
      await base44.asServiceRole.entities.SubscriptionPayment.create({
        schoolId,
        schoolName: subscription.schoolName || '',
        subscriptionId,
        tierName: subscription.tierName || '',
        amount: paidAmount,
        currency: subscription.currency || 'NGN',
        paymentMethod: 'alatpay',
        referenceNumber: transactionId,
        transactionId,
        installmentNumber: installmentNumber || 1,
        totalInstallments: totalInstallments || 1,
        paymentDate: today,
        status: 'confirmed',
        confirmedAt: nowIso,
        paidBy: paidBy || '',
        paidByName: paidByName || '',
        paidByEmail: paidByEmail || '',
        notes: `Subscription payment via ALAT Pay (${subscription.tierName})`,
      });

      // Check if subscription is fully paid
      const allPayments = await base44.asServiceRole.entities.SubscriptionPayment.filter({ subscriptionId, schoolId, status: 'confirmed' });
      const totalPaid = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const totalAmount = subscription.totalAmount || 0;
      const isFullyPaid = totalPaid >= totalAmount;

      if (isFullyPaid) {
        const startDate = subscription.startDate || today;
        const endDate = new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await base44.asServiceRole.entities.SchoolSubscription.update(subscriptionId, {
          status: 'active',
          startDate,
          endDate,
          lastPaymentDate: today,
        });
      } else {
        await base44.asServiceRole.entities.SchoolSubscription.update(subscriptionId, {
          lastPaymentDate: today,
        });
      }

      return Response.json({ status: 'success', reference: transactionId, amount: paidAmount, fullyPaid: isFullyPaid });
    }

    return Response.json({ error: 'Invalid action. Use "initialize" or "verify".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});