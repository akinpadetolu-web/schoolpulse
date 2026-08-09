import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

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
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.schoolId) return;
    Promise.all([
      base44.entities.FeeInvoice.filter({ schoolId: user.schoolId, studentId: user.id }),
      base44.entities.FeeStructure.filter({ schoolId: user.schoolId }),
    ])
      .then(([inv, struct]) => {
        setInvoices(inv || []);
        setFeeStructures(struct || []);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.schoolId]);

  // Recompute outstanding from CURRENT active fee structure totals minus paid,
  // so that a tuition update after a payment surfaces as outstanding.
  const applicableStructures = useMemo(() => {
    if (!user) return [];
    const result = [];
    for (const structure of feeStructures) {
      if (structure.status !== 'active') continue;
      const applies = structure.applyToAllClasses || (structure.applicableClasses || []).includes(user.classId);
      if (!applies) continue;
      const structInvoices = invoices.filter(inv => inv.feeStructureId === structure.id);
      const paidAmount = structInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
      const currentTotal = structure.totalAmount || 0;
      const outstanding = Math.max(0, currentTotal - paidAmount);
      const alreadyPaid = paidAmount > 0 && outstanding <= 0.5;
      result.push({ structure, alreadyPaid, paidAmount, outstanding });
    }
    return result;
  }, [user, invoices, feeStructures]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const totalOwed = applicableStructures.reduce((s, a) => s + (a.alreadyPaid ? 0 : a.outstanding), 0);
  const totalPaid = applicableStructures.reduce((s, a) => s + a.paidAmount, 0);

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

      {/* Fee Structures (current tuition, recomputed) */}
      {applicableStructures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fee Structures</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {applicableStructures.map(({ structure, alreadyPaid, paidAmount, outstanding }) => (
              <div key={structure.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm">{structure.name || 'Fee Structure'}</p>
                    <p className="text-xs text-muted-foreground">{structure.term} · {structure.academicYear}</p>
                  </div>
                  {alreadyPaid ? (
                    <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                  ) : paidAmount > 0 && outstanding > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" /> Partially Paid</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
                  )}
                </div>
                {(structure.feeItems || []).length > 0 && (
                  <div className="mt-2 border-t pt-2 space-y-1">
                    {structure.feeItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.feeTypeName}</span>
                        <span>₦{(item.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>₦{(structure.totalAmount || 0).toLocaleString()}</span>
                </div>
                {paidAmount > 0 && !alreadyPaid && (
                  <>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-emerald-700">Paid</span>
                      <span className="text-emerald-700 font-medium">₦{paidAmount.toLocaleString()}</span>
                    </div>
                    {outstanding > 0 && (
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-red-700">Outstanding</span>
                        <span className="text-red-700">₦{outstanding.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fee Invoices</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {applicableStructures.length === 0 && invoices.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No fees found.</CardContent></Card>
      )}
    </div>
  );
}