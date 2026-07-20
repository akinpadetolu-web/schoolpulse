import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      return Response.json({ error: 'Paystack secret key not configured' }, { status: 500 });
    }

    const { action } = body;

    // ── Initialize a transaction ──────────────────────────────────────────
    if (action === 'initialize') {
      const { schoolId, invoiceId, bookFineId, feeStructureId, amount, studentId, studentName, classId, className, email, paymentType, callbackUrl } = body;

      if (!schoolId || !amount || !email) {
        return Response.json({ error: 'Missing required fields (schoolId, amount, email)' }, { status: 400 });
      }

      // Verify Paystack is enabled for this school
      const settings = await base44.asServiceRole.entities.PaymentSettings.filter({ schoolId });
      const config = (settings || [])[0];
      if (!config || (config.primaryGateway !== 'paystack' && !config.paystackEnabled)) {
        return Response.json({ error: 'Online payment is not enabled for this school' }, { status: 403 });
      }

      const reference = `SCH-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Paystack expects kobo
          reference,
          callback_url: callbackUrl || `${new URL(req.url).origin}/parent/fees-payments`,
          metadata: {
            schoolId,
            invoiceId: invoiceId || null,
            bookFineId: bookFineId || null,
            feeStructureId: feeStructureId || null,
            studentId,
            studentName,
            classId: classId || null,
            className: className || null,
            paymentType: paymentType || 'school_fees',
            parentId: body.parentId || null,
            custom_fields: [
              { display_name: 'Student', variable_name: 'student', value: studentName || '' },
              { display_name: 'Payment For', variable_name: 'payment_for', value: paymentType === 'library_fine' ? 'Library Fine' : 'School Fees' },
            ],
          },
        }),
      });

      const data = await paystackRes.json();
      if (!data.status) {
        return Response.json({ error: data.message || 'Failed to initialize payment' }, { status: 400 });
      }

      return Response.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        access_code: data.data.access_code,
      });
    }

    // ── Verify a transaction ──────────────────────────────────────────────
    if (action === 'verify') {
      const { reference } = body;
      if (!reference) {
        return Response.json({ error: 'Missing transaction reference' }, { status: 400 });
      }

      // Prevent duplicate processing
      const existing = await base44.asServiceRole.entities.FeePayment.filter({ referenceNumber: reference });
      if (existing && existing.length > 0) {
        return Response.json({ status: 'success', reference, alreadyProcessed: true, amount: existing[0].amount });
      }

      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      });

      const data = await paystackRes.json();
      if (!data.status) {
        return Response.json({ error: data.message || 'Verification failed' }, { status: 400 });
      }

      const tx = data.data;
      if (tx.status !== 'success') {
        return Response.json({ status: tx.status, reference });
      }

      const metadata = tx.metadata || {};
      const paidAmount = tx.amount / 100; // Convert kobo to naira
      const schoolId = metadata.schoolId;
      const studentId = metadata.studentId;
      const studentName = metadata.studentName || '';
      const pType = metadata.paymentType || 'school_fees';
      const invId = metadata.invoiceId;
      const fineId = metadata.bookFineId;
      const feeStructId = metadata.feeStructureId;
      const parentId = metadata.parentId;

      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      if (pType === 'library_fine' && fineId) {
        await base44.asServiceRole.entities.FeePayment.create({
          schoolId,
          bookFineId: fineId,
          paymentType: 'library_fine',
          studentId,
          studentName,
          amount: paidAmount,
          paymentDate: today,
          paymentMethod: 'paystack',
          referenceNumber: reference,
          status: 'confirmed',
          confirmedBy: parentId || 'paystack',
          confirmedAt: nowIso,
          submittedByParent: true,
          parentId: parentId || null,
          notes: 'Library fine payment via Paystack',
        });

        await base44.asServiceRole.entities.BookFine.update(fineId, {
          status: 'paid',
          paidDate: today,
        });
      } else if (invId) {
        await base44.asServiceRole.entities.FeePayment.create({
          schoolId,
          invoiceId: invId,
          paymentType: 'school_fees',
          studentId,
          studentName,
          amount: paidAmount,
          paymentDate: today,
          paymentMethod: 'paystack',
          referenceNumber: reference,
          status: 'confirmed',
          confirmedBy: parentId || 'paystack',
          confirmedAt: nowIso,
          submittedByParent: true,
          parentId: parentId || null,
          notes: 'School fee payment via Paystack',
        });

        const invoice = await base44.asServiceRole.entities.FeeInvoice.get(invId);
        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || 0) + paidAmount;
          const newBalance = Math.max(0, (invoice.totalAmount || 0) - newAmountPaid);
          const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
          await base44.asServiceRole.entities.FeeInvoice.update(invId, {
            amountPaid: newAmountPaid,
            outstandingBalance: newBalance,
            status: newStatus,
          });
        }
      } else if (feeStructId) {
        // Payment from a fee structure — create invoice + payment record
        const structure = await base44.asServiceRole.entities.FeeStructure.get(feeStructId);
        if (structure) {
          const invNumber = `INV-${Date.now()}`;
          const newInvoice = await base44.asServiceRole.entities.FeeInvoice.create({
            schoolId,
            invoiceNumber: invNumber,
            studentId,
            studentName,
            classId: metadata.classId || '',
            className: metadata.className || '',
            feeStructureId: feeStructId,
            feeStructureName: structure.name,
            academicYear: structure.academicYear || '',
            term: structure.term || '',
            invoiceDate: today,
            feeItems: structure.feeItems || [],
            totalAmount: paidAmount,
            amountPaid: paidAmount,
            outstandingBalance: 0,
            status: 'paid',
            sentToParent: true,
          });

          await base44.asServiceRole.entities.FeePayment.create({
            schoolId,
            invoiceId: newInvoice.id,
            invoiceNumber: invNumber,
            paymentType: 'school_fees',
            studentId,
            studentName,
            amount: paidAmount,
            paymentDate: today,
            paymentMethod: 'paystack',
            referenceNumber: reference,
            status: 'confirmed',
            confirmedBy: parentId || 'paystack',
            confirmedAt: nowIso,
            submittedByParent: true,
            parentId: parentId || null,
            notes: `Payment for ${structure.name} via Paystack`,
          });
        }
      }

      return Response.json({ status: 'success', reference, amount: paidAmount });
    }

    return Response.json({ error: 'Invalid action. Use "initialize" or "verify".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});