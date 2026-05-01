import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingDown, Users, AlertTriangle, Mail, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminAttendance() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [threshold, setThreshold] = useState(75);
  const [notifying, setNotifying] = useState(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (!loading) loadAttendance(); }, [selectedClassId, selectedMonth]);

  async function loadData() {
    const [cls, stu, att] = await Promise.all([
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', isArchived: false }),
      base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
    ]);
    setClasses(cls || []);
    setStudents(stu || []);
    setAttendance(att || []);
    setLoading(false);
  }

  async function loadAttendance() {
    const att = await base44.entities.Attendance.filter({ schoolId: user?.schoolId });
    setAttendance(att || []);
  }

  // Filter attendance by month and class
  const filteredAttendance = attendance.filter(a => {
    const inMonth = a.date?.startsWith(selectedMonth);
    const inClass = selectedClassId === 'all' || a.classId === selectedClassId;
    return inMonth && inClass;
  });

  // Calculate school days in selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const schoolDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d)).length;

  // Per-student stats
  const relevantStudents = selectedClassId === 'all'
    ? students
    : students.filter(s => s.classId === selectedClassId);

  const studentStats = relevantStudents.map(s => {
    const records = filteredAttendance.filter(a => a.studentId === s.id);
    const present = records.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const excused = records.filter(a => a.status === 'excused').length;
    const pct = schoolDays > 0 ? Math.round((present / schoolDays) * 100) : null;
    return { ...s, present, absent, excused, total: records.length, pct };
  }).filter(s => s.total > 0 || selectedClassId !== 'all');

  const belowThreshold = studentStats.filter(s => s.pct !== null && s.pct < threshold);

  // Trend chart data – daily present count for month
  const chartData = [];
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d));
  days.forEach(d => {
    const ds = format(d, 'yyyy-MM-dd');
    const dayRecords = filteredAttendance.filter(a => a.date === ds);
    if (dayRecords.length > 0) {
      chartData.push({
        day: format(d, 'MMM d'),
        Present: dayRecords.filter(a => a.status === 'present').length,
        Absent: dayRecords.filter(a => a.status === 'absent').length,
        Late: dayRecords.filter(a => a.status === 'late').length,
      });
    }
  });

  async function sendNotification(student) {
    setNotifying(student.id);
    try {
      if (student.email) {
        await base44.integrations.Core.SendEmail({
          to: student.email,
          subject: `Low Attendance Alert — ${student.fullName}`,
          body: `Dear ${student.fullName},\n\nThis is an automated notice from ${user?.schoolName}.\n\nYour attendance for ${format(monthStart, 'MMMM yyyy')} is ${student.pct}%, which is below the required threshold of ${threshold}%.\n\nPresent: ${student.present} days | Absent: ${student.absent} days\n\nPlease contact your class teacher or school administration.\n\nRegards,\n${user?.schoolName}`,
        });
        toast.success(`Email sent to ${student.fullName}`);
      } else {
        toast.error(`No email on file for ${student.fullName}`);
      }
    } catch (err) {
      toast.error('Failed to send notification');
    }
    setNotifying(null);
  }

  async function notifyAll() {
    for (const s of belowThreshold) {
      if (s.email) await sendNotification(s);
    }
    toast.success(`Notified ${belowThreshold.filter(s => s.email).length} students`);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Attendance Dashboard</h1>
      <p className="text-muted-foreground mb-6">Track attendance trends and manage low-attendance alerts</p>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Month</Label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Alert Threshold (%)</Label>
            <Input
              type="number" min={0} max={100}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'School Days', value: schoolDays, icon: BarChart3, color: 'text-blue-600 bg-blue-100' },
          { label: 'Students Tracked', value: studentStats.filter(s => s.total > 0).length, icon: Users, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Attendance Records', value: filteredAttendance.length, icon: TrendingDown, color: 'text-purple-600 bg-purple-100' },
          { label: 'Below Threshold', value: belowThreshold.length, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-2xl font-bold mt-1">{c.value}</p></div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}><c.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trend">
        <TabsList className="mb-4">
          <TabsTrigger value="trend">Trend Chart</TabsTrigger>
          <TabsTrigger value="report">Monthly Report</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {belowThreshold.length > 0 && <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{belowThreshold.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* Trend Chart */}
        <TabsContent value="trend">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Daily Attendance — {format(monthStart, 'MMMM yyyy')}</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Present" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Report Table */}
        <TabsContent value="report">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Student Report — {format(monthStart, 'MMMM yyyy')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {studentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attendance data for selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Student</th>
                        <th className="text-left px-4 py-3 font-semibold">Class</th>
                        <th className="text-center px-3 py-3 font-semibold">Present</th>
                        <th className="text-center px-3 py-3 font-semibold">Absent</th>
                        <th className="text-center px-3 py-3 font-semibold">Excused</th>
                        <th className="text-center px-3 py-3 font-semibold">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentStats.map(s => (
                        <tr key={s.id} className={s.pct !== null && s.pct < threshold ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 font-medium">{s.fullName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                          <td className="px-3 py-3 text-center text-emerald-700">{s.present}</td>
                          <td className="px-3 py-3 text-center text-red-700">{s.absent}</td>
                          <td className="px-3 py-3 text-center text-blue-700">{s.excused}</td>
                          <td className="px-3 py-3 text-center">
                            {s.pct !== null ? (
                              <Badge className={s.pct >= threshold ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                {s.pct}%
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Students Below {threshold}% Attendance</CardTitle>
              {belowThreshold.length > 0 && (
                <Button size="sm" variant="outline" onClick={notifyAll}>
                  <Mail className="w-4 h-4 mr-2" /> Notify All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {belowThreshold.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No students below threshold. 🎉</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {belowThreshold.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50">
                      <div>
                        <p className="font-medium text-sm">{s.fullName}</p>
                        <p className="text-xs text-muted-foreground">{s.className} • Present: {s.present}/{schoolDays} days</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-100 text-red-700">{s.pct}%</Badge>
                        <Button size="sm" variant="outline" onClick={() => sendNotification(s)} disabled={notifying === s.id}>
                          {notifying === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                          <span className="ml-1 hidden sm:inline">Notify</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}