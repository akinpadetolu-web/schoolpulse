import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, UserPlus, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function AttendanceBar({ present, absent, late, excused }) {
  const total = present + absent + late + excused;
  if (total === 0) return <p className="text-xs text-muted-foreground">No attendance records</p>;
  const rate = Math.round((present / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Attendance rate</span>
        <span className={`font-semibold ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${(present / total) * 100}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${(late / total) * 100}%` }} />
        <div className="h-full bg-blue-400" style={{ width: `${(excused / total) * 100}%` }} />
        <div className="h-full bg-red-400" style={{ width: `${(absent / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {[
          { color: 'bg-emerald-500', label: `${present} Present` },
          { color: 'bg-amber-400', label: `${late} Late` },
          { color: 'bg-blue-400', label: `${excused} Excused` },
          { color: 'bg-red-400', label: `${absent} Absent` },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const user = getCurrentUser();
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  // Auto-open the add child dialog if no children are linked yet (first login)
  useEffect(() => {
    const linkedIds = user?.linkedStudentIds || [];
    if (linkedIds.length === 0) setShowAddChild(true);
    load();
  }, []);

  async function load() {
    setLoading(true);
    const linkedIds = user?.linkedStudentIds || [];
    if (linkedIds.length > 0) {
      const [allStudents, att] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' }),
        base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
      ]);
      setChildren((allStudents || []).filter(s => linkedIds.includes(s.id)));
      setAttendance((att || []).filter(a => linkedIds.includes(a.studentId)));
    }
    setLoading(false);
  }

  async function handleAddChild(e) {
    e.preventDefault();
    setLinking(true);
    // Find student with matching parentLinkCode
    const matches = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', parentLinkCode: linkCode.trim() });
    if (!matches || matches.length === 0) {
      toast.error('No student found with that link code. Please check with the school admin.');
      setLinking(false);
      return;
    }
    const student = matches[0];
    const currentLinked = user?.linkedStudentIds || [];
    if (currentLinked.includes(student.id)) {
      toast.info('This child is already linked to your account.');
      setLinking(false);
      return;
    }
    await base44.auth.updateMe({ linkedStudentIds: [...currentLinked, student.id] });
    toast.success(`${student.fullName} linked successfully!`);
    setLinkCode('');
    setShowAddChild(false);
    // Reload page to get updated user
    window.location.reload();
  }

  const attendanceByStudent = useMemo(() => {
    const map = {};
    attendance.forEach(a => {
      if (!map[a.studentId]) map[a.studentId] = { present: 0, absent: 0, late: 0, excused: 0 };
      const s = a.status;
      if (s === 'present') map[a.studentId].present++;
      else if (s === 'absent') map[a.studentId].absent++;
      else if (s === 'late') map[a.studentId].late++;
      else if (s === 'excused') map[a.studentId].excused++;
    });
    return map;
  }, [attendance]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground">{user?.schoolName}</p>
        </div>
        <Button onClick={() => setShowAddChild(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Child
        </Button>
      </div>

      <div>
         <h2 className="text-lg font-semibold mb-4">My Children</h2>
        {children.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <GraduationCap className="w-10 h-10 opacity-30" />
              <p>No linked children yet.</p>
              <Button variant="outline" size="sm" onClick={() => setShowAddChild(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Link a Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map(child => {
              const att = attendanceByStudent[child.id] || { present: 0, absent: 0, late: 0, excused: 0 };
              return (
                <Card key={child.id} className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-lg">{child.fullName?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{child.fullName}</p>
                        <p className="text-sm text-muted-foreground">{child.className || 'No class assigned'}</p>
                        {child.studentId && <p className="text-xs text-muted-foreground">ID: {child.studentId}</p>}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Attendance</p>
                      <AttendanceBar {...att} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Child Dialog */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link a Child</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the student link code provided by your school administrator to connect your child's account.</p>
          <form onSubmit={handleAddChild} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Student Link Code</Label>
              <Input
                value={linkCode}
                onChange={e => setLinkCode(e.target.value)}
                placeholder="e.g. LINK-AB12CD"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={linking}>
              {linking && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Link Child
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}