import jsPDF from 'jspdf';
import moment from 'moment';

export function generateSubscriptionInvoice(payment, subscription, schoolName) {
  const doc = new jsPDF();
  const cur = '₦';
  const fmt = (n) => `${cur}${(n || 0).toLocaleString()}`;
  const payDate = moment(payment.paymentDate || payment.confirmedAt).format('MMM D, YYYY');
  const invNo = `INV-${(payment.id || '').slice(-8).toUpperCase()}`;

  // ── Header ──
  doc.setFillColor(225, 73, 57);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('SchoolEduPulse', 14, 16);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Subscription Payment Invoice', 14, 23);
  doc.setFontSize(9);
  doc.text(`Invoice No: ${invNo}`, 196, 16, { align: 'right' });
  doc.text(`Date: ${payDate}`, 196, 23, { align: 'right' });

  // ── School Info ──
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Billed To:', 14, 42);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(schoolName || subscription.schoolName || 'N/A', 14, 49);
  if (payment.paidByName) doc.text(`Paid By: ${payment.paidByName}`, 14, 55);
  if (payment.paidByEmail) doc.text(`Email: ${payment.paidByEmail}`, 14, 61);

  // ── Subscription Summary (right column) ──
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Subscription Summary', 130, 42);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`Plan Tier: ${subscription.tierName || 'N/A'}`, 130, 49);
  doc.text(`Billing Cycle: ${(subscription.billingCycle || 'annual').replace('_', ' ')}`, 130, 55);
  doc.text(`Students Enrolled: ${subscription.registeredStudents || 0}`, 130, 61);

  // ── Fee Breakdown Table ──
  let y = 75;
  doc.setFillColor(240, 240, 245);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Description', 16, y);
  doc.text('Details', 100, y);
  doc.text('Amount', 160, y);
  y += 10;
  doc.setFont(undefined, 'normal');

  // Price per student
  doc.text('Price Per Student', 16, y);
  doc.text(`${subscription.registeredStudents || 0} student(s)`, 100, y);
  doc.text(fmt(subscription.pricePerStudent), 160, y);
  y += 8;

  // Total subscription
  doc.text('Total Subscription', 16, y);
  doc.text(`${subscription.installmentCount || 1} installment(s)`, 100, y);
  doc.text(fmt(subscription.totalAmount), 160, y);
  y += 8;

  // Installment info (if applicable)
  if ((subscription.installmentCount || 1) > 1) {
    doc.text(`Installment ${payment.installmentNumber || 1} of ${payment.totalInstallments || 1}`, 16, y);
    doc.text('Per installment', 100, y);
    doc.text(fmt(subscription.installmentAmount), 160, y);
    y += 8;
  }

  // ── Amount Paid (highlighted) ──
  y += 4;
  doc.setFillColor(230, 245, 233);
  doc.rect(14, y - 5, 182, 12, 'F');
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30, 100, 40);
  doc.text('Amount Paid', 16, y + 2);
  doc.text(fmt(payment.amount), 160, y + 2);
  y += 16;

  // ── Payment Details ──
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Transaction Reference: ${payment.referenceNumber || payment.transactionId || 'N/A'}`, 14, y);
  y += 6;
  doc.text(`Payment Method: ALAT Pay`, 14, y);
  y += 6;
  doc.text(`Payment Status: ${(payment.status || 'confirmed').toUpperCase()}`, 14, y);

  // ── Footer ──
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text('This is a computer-generated invoice and does not require a signature.', 105, 282, { align: 'center' });
  doc.text('Thank you for your subscription payment!', 105, 287, { align: 'center' });

  doc.save(`Invoice-${invNo}.pdf`);
}