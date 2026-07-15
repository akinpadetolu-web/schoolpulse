import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const statusColor = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  on_leave: 'bg-blue-100 text-blue-700',
  late_arrival: 'bg-amber-100 text-amber-700',
  early_departure: 'bg-purple-100 text-purple-700',
};

export default function HostelAttendancePanel({ attendance, allocations, hostels, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hostelId: '',
    studentId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '',
    checkOutTime: '',
  });

  const todayAttendance = attendance.filter(a => a.attendanceDate === new Date().toISOString().split('T')[0]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!form.hostelId || !form.studentId || !form.status) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const alloc = allocations.find(a => a.studentId === form.studentId && a.hostelId === form.hostelId);
      const hostel = hostels.find(h => h.id === form.hostelId);

      if (!alloc) {
        toast.error('Student not allocated to this hostel');
        setSaving(false);
        return;
      }

      await base44.entities.HostelAttendance.create({
        schoolId: user?.schoolId,
        hostelId: form.hostelId,
        hostelName: hostel?.name,
        studentId: form.studentId,
        studentName: alloc.studentName,
        attendanceDate: form.attendanceDate,
        status: form.status,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        recordedBy: user?.id,
        recordedByName: user?.fullName,
        recordedAt: new Date().toISOString(),
      });

      toast.success('Attendance marked');
      setForm({
        hostelId: '',
        studentId: '',
        attendanceDate: new Date().toISOString().split('T')[0],
        status: 'present',
        checkInTime: '',
        checkOutTime: '',
      });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  const allocsByHostel = allocations.filter(a => a.status === 'active');
  const todayStats = {
    present: todayAttendance.filter(a => a.status === 'present').length,
    absent: todayAttendance.filter(a => a.status === 'absent').length,
    onLeave: todayAttendance.filter(a => a.status === 'on_leave').length,
    total: allocsByHostel.length,
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Mark Attendance</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Present</div>
            <div className="text-xl font-bold text-green-600">{todayStats.present}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Absent</div>
            <div className="text-xl font-bold text-red-600">{todayStats.absent}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">On Leave</div>
            <div className="text-xl font-bold text-blue-600">{todayStats.onLeave}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-xl font-bold">{todayStats.total}</div>
          </CardContent>
        </Card>
      </div>

      {todayAttendance.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No attendance marked for today</div>
      ) : (
        <div className="grid gap-3">
          {todayAttendance.map(att => (
            <Card key={att.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{att.studentName}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-sm text-muted-foreground">{att.hostelName}</p>
                      {att.purpose && (
                        <Badge variant="outline" className="text-xs">{att.purpose}</Badge>
                      )}
                      {att.recordedTime && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {att.recordedTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColor[att.status]}>{att.status.replace(/_/g, ' ')}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mark Attendance Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkAttendance} className="space-y-4">
            <div>
              <Label>Hostel *</Label>
              <Select value={form.hostelId} onValueChange={v => setForm({ ...form, hostelId: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select hostel..." />
                </SelectTrigger>
                <SelectContent>
                  {hostels.filter(h => h.isActive).map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student *</Label>
              <Select value={form.studentId} onValueChange={v => setForm({ ...form, studentId: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allocsByHostel
                    .filter(a => a.hostelId === form.hostelId)
                    .map(a => (
                      <SelectItem key={a.id} value={a.studentId}>{a.studentName}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.attendanceDate}
                onChange={e => setForm({ ...form, attendanceDate: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="late_arrival">Late Arrival</SelectItem>
                  <SelectItem value="early_departure">Early Departure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Time</Label>
                <Input
                  type="time"
                  value={form.checkInTime}
                  onChange={e => setForm({ ...form, checkInTime: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Check-out Time</Label>
                <Input
                  type="time"
                  value={form.checkOutTime}
                  onChange={e => setForm({ ...form, checkOutTime: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Mark Attendance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}