import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-700',
  overdue: 'bg-red-100 text-red-700',
  pending_confirmation: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-700',
};

export default function StudentFeesTab() {
  const { schoolUser: user } = useSchoolAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.schoolId) return;
    base44.entities.FeeInvoice.filter({ schoolId: user.schoolId, studentId: user.id })
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [user?.id, user?.schoolId]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const totalOwed = invoices.reduce((s, inv) => s + (inv.outstandingBalance || 0), 0);
  const totalPaid = invoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600">₦{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-500">₦{totalOwed.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader><CardTitle className="text-base">Fee Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No invoices found.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{inv.feeStructureName || 'Fee Invoice'}</p>
                    <p className="text-xs text-muted-foreground">{inv.term} · {inv.academicYear}</p>
                    <p className="text-xs text-muted-foreground">Due: {inv.dueDate || 'N/A'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-sm">₦{(inv.totalAmount || 0).toLocaleString()}</p>
                    {inv.outstandingBalance > 0 && (
                      <p className="text-xs text-red-500">Owed: ₦{(inv.outstandingBalance || 0).toLocaleString()}</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}