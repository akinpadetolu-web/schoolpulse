import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminFinancialReports() {
  const { schoolUser: user } = useSchoolAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filterTerm, setFilterTerm] = useState('all');
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [expandedClass, setExpandedClass] = useState(null);

  useEffect(() => { loadAll(); }, [user?.schoolId]);

  async function loadAll() {
    if (!user?.schoolId) return;
    try {
      const [inv, pay, structs, cls, studs] = await Promise.all([
        base44.entities.FeeInvoice.filter({ schoolId: user.schoolId }),
        base44.entities.FeePayment.filter({ schoolId: user.schoolId }),
        base44.entities.FeeStructure.filter({ schoolId: user.schoolId }),
        base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student', isArchived: false }),
      ]);
      setInvoices(inv);
      setPayments(pay);
      setStructures(structs || []);
      setClasses(cls || []);
      setStudents(studs || []);
    } catch (e) {}
    setLoading(false);
  }

  const terms = [...new Set(invoices.map(i => i.term).filter(Boolean))];
  const filtered = filterTerm === 'all' ? invoices : invoices.filter(i => i.term === filterTerm);
  const filteredPayments = filterTerm === 'all' ? payments : payments.filter(p => p.term === filterTerm);

  const totalBilled = filtered.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected = filteredPayments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const statusData = [
    { name: 'Paid', value: filtered.filter(i => i.status === 'paid').length },
    { name: 'Partial', value: filtered.filter(i => i.status === 'partially_paid').length },
    { name: 'Unpaid', value: filtered.filter(i => i.status === 'unpaid').length },
    { name: 'Overdue', value: filtered.filter(i => i.status === 'overdue').length },
  ].filter(d => d.value > 0);

  const methodData = Object.entries(
    filteredPayments.filter(p => p.status === 'confirmed').reduce((acc, p) => {
      acc[p.paymentMethod || 'other'] = (acc[p.paymentMethod || 'other'] || 0) + (p.amount || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Class breakdown
  const classMap = {};
  filtered.forEach(inv => {
    const cls = inv.className || 'Unknown';
    if (!classMap[cls]) classMap[cls] = { billed: 0, collected: 0 };
    classMap[cls].billed += inv.totalAmount || 0;
    classMap[cls].collected += (inv.totalAmount || 0) - (inv.outstandingBalance || 0);
  });
  const classData = Object.entries(classMap).map(([name, v]) => ({ name, ...v }));

  // Fees by class based on active fee structures: expected (fee × students), collected, outstanding, students owing
  const activeStructures = structures.filter(s => s.status === 'active' && (filterTerm === 'all' || s.term === filterTerm));
  const expectedPerClass = {};
  classes.forEach(c => {
    const classStructures = activeStructures.filter(s => s.applyToAllClasses || (s.applicableClasses || []).includes(c.id));
    expectedPerClass[c.id] = classStructures.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  });
  const studentFeeMap = students.map(st => {
    const expected = expectedPerClass[st.classId] || 0;
    const paid = payments
      .filter(p => p.studentId === st.id && p.status === 'confirmed' && p.paymentType !== 'library_fine' && (filterTerm === 'all' || p.term === filterTerm))
      .reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding = Math.max(0, expected - paid);
    return { id: st.id, name: st.fullName, classId: st.classId, expected, paid, outstanding, owing: outstanding > 0.5 };
  });
  // Accurate outstanding: sum of (expected fee − confirmed payments) across all students.
  const totalOutstanding = studentFeeMap.reduce((s, st) => s + st.outstanding, 0);
  const classFeeData = classes.map(c => {
    const classStudents = studentFeeMap.filter(st => st.classId === c.id);
    const totalExpected = classStudents.reduce((s, st) => s + st.expected, 0);
    const totalCollected = classStudents.reduce((s, st) => s + st.paid, 0);
    const totalOutstanding = classStudents.reduce((s, st) => s + st.outstanding, 0);
    const owingStudents = classStudents.filter(st => st.owing);
    return {
      id: c.id, name: c.className,
      feePerStudent: expectedPerClass[c.id] || 0,
      studentCount: classStudents.length,
      totalExpected, totalCollected, totalOutstanding,
      owingCount: owingStudents.length,
      owingStudents,
    };
  }).filter(c => c.studentCount > 0 || c.feePerStudent > 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Financial Reports</h1><p className="text-sm text-muted-foreground mt-1">Overview of fee collection and payment trends</p></div>
        <Select value={filterTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Billed', value: `₦${totalBilled.toLocaleString()}`, color: 'text-blue-600' },
          { label: 'Total Collected', value: `₦${totalCollected.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Outstanding', value: `₦${totalOutstanding.toLocaleString()}`, color: 'text-red-600' },
          { label: 'Collection Rate', value: `${collectionRate}%`, color: 'text-purple-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment by Method</CardTitle></CardHeader>
          <CardContent>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={methodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₦${(+v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No confirmed payments</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Collection by Class</CardTitle></CardHeader>
        <CardContent>
          {classData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `₦${(+v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="billed" name="Billed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-8">No data</p>}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Fees by Class (Based on Fee Structures)</CardTitle>
          <p className="text-xs text-muted-foreground">Expected fees per class from active fee structures, amounts collected, outstanding balances, and students owing. Click a row to see students owing.</p>
        </CardHeader>
        <CardContent>
          {classFeeData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    {['Class', 'Fee/Student', 'Students', 'Total Expected', 'Collected', 'Outstanding', 'Owing'].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classFeeData.map(c => (
                    <React.Fragment key={c.id}>
                      <tr className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setExpandedClass(expandedClass === c.id ? null : c.id)}>
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3">₦{c.feePerStudent.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{c.studentCount}</td>
                        <td className="p-3 font-medium">₦{c.totalExpected.toLocaleString()}</td>
                        <td className="p-3 text-green-700">₦{c.totalCollected.toLocaleString()}</td>
                        <td className="p-3 font-bold text-red-700">₦{c.totalOutstanding.toLocaleString()}</td>
                        <td className="p-3">
                          {c.owingCount > 0 ? (
                            <Badge className="bg-red-100 text-red-700">{c.owingCount} student{c.owingCount > 1 ? 's' : ''} ▾</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">None</Badge>
                          )}
                        </td>
                      </tr>
                      {expandedClass === c.id && c.owingStudents.length > 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="p-3">
                            <div className="pl-4">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Students owing in {c.name}:</p>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="text-left pb-1 font-medium">Student</th>
                                    <th className="text-right pb-1 font-medium">Expected</th>
                                    <th className="text-right pb-1 font-medium">Paid</th>
                                    <th className="text-right pb-1 font-medium">Outstanding</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.owingStudents.map(st => (
                                    <tr key={st.id} className="border-t">
                                      <td className="py-1.5">{st.name}</td>
                                      <td className="text-right py-1.5 text-muted-foreground">₦{st.expected.toLocaleString()}</td>
                                      <td className="text-right py-1.5 text-green-700">₦{st.paid.toLocaleString()}</td>
                                      <td className="text-right py-1.5 font-bold text-red-700">₦{st.outstanding.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted-foreground text-center py-8">No fee structures set for classes yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}