import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Calendar, Loader2, Check, X, Clock, Search, Plus, Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import CreateHRStaffDialog from '@/components/hr/CreateHRStaffDialog';
import HRStaffPermissionsDialog from '@/components/hr/HRStaffPermissionsDialog';

const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'other'];
const STATUS_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  on_leave: 'bg-blue-100 text-blue-700',
};

export default function AdminHR() {
  const { schoolUser: user } = useSchoolAuth();
  const [staff, setStaff] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLeave, setShowLeave] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [hrStaff, setHrStaff] = useState([]);
  const [showCreateHR, setShowCreateHR] = useState(false);
  const [selectedHRMember, setSelectedHRMember] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    staffId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '',
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    // Build attendance map for selected date
    const map = {};
    staffAttendance.filter(a => a.date === attendanceDate).forEach(a => { map[a.staffId] = a; });
    setAttendanceMap(map);
  }, [staffAttendance, attendanceDate]);

  async function loadData() {
    const [teachers, admins, hrStaffList, lv, att] = await Promise.all([
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'teacher', isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'admin', isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'hr_staff', isArchived: false }),
      base44.entities.StaffLeave.filter({ schoolId: user?.schoolId }),
      base44.entities.StaffAttendance.filter({ schoolId: user?.schoolId }),
    ]);
    const allStaff = [...(teachers || []), ...(admins || [])];
    setStaff(allStaff);
    setHrStaff(hrStaffList || []);
    setLeaves(lv || []);
    setStaffAttendance(att || []);
    setLoading(false);
  }

  async function handleLeaveSubmit(e) {
    e.preventDefault();
    if (!leaveForm.staffId || !leaveForm.startDate || !leaveForm.endDate) return toast.error('All required fields must be filled');
    setSavingLeave(true);
    const member = staff.find(s => s.id === leaveForm.staffId);
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    await base44.entities.StaffLeave.create({
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      staffId: leaveForm.staffId,
      staffName: member?.fullName || '',
      staffRole: member?.role || '',
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      daysRequested: days,
      reason: leaveForm.reason,
      status: 'pending',
    });
    toast.success('Leave request submitted');
    setLeaveForm({ staffId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' });
    setShowLeave(false);
    setSavingLeave(false);
    loadData();
  }

  async function reviewLeave(leave, decision) {
    await base44.entities.StaffLeave.update(leave.id, {
      status: decision,
      reviewedBy: user.fullName,
      reviewedAt: new Date().toISOString(),
    });
    toast.success(`Leave ${decision}`);
    loadData();
  }

  async function markAttendance(staffId, status) {
    const existing = attendanceMap[staffId];
    const member = staff.find(s => s.id === staffId);
    if (existing) {
      await base44.entities.StaffAttendance.update(existing.id, { status });
    } else {
      await base44.entities.StaffAttendance.create({
        schoolId: user.schoolId,
        staffId,
        staffName: member?.fullName || '',
        staffRole: member?.role || '',
        date: attendanceDate,
        status,
        markedBy: user.fullName,
      });
    }
    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), staffId, status, date: attendanceDate },
    }));
  }

  async function saveAttendance() {
    setSavingAttendance(true);
    // attendance is saved incrementally via markAttendance
    await loadData();
    toast.success('Attendance saved');
    setSavingAttendance(false);
  }

  const filteredStaff = staff.filter(s => {
    const matchSearch = s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const todayAttendance = staffAttendance.filter(a => a.date === new Date().toISOString().split('T')[0]);
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">HR Module</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Staff directory, leave management, and attendance</p>
        </div>
        <Button onClick={() => setShowLeave(true)}><Plus className="w-4 h-4 mr-2" /> Add Leave Request</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Staff', value: staff.length, icon: Users, color: 'text-blue-600' },
          { label: 'Present Today', value: `${presentToday}/${staff.length}`, icon: UserCheck, color: 'text-emerald-600' },
          { label: 'Pending Leaves', value: pendingLeaves, icon: Clock, color: 'text-amber-600' },
          { label: 'Teachers', value: staff.filter(s => s.role === 'teacher').length, icon: Users, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">
            Leave Requests
            {pendingLeaves > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5">{pendingLeaves}</span>}
          </TabsTrigger>
          <TabsTrigger value="hr_staff">HR Staff <span className="ml-1.5 bg-primary/20 text-primary text-xs rounded-full px-1.5">{hrStaff.length}</span></TabsTrigger>
        </TabsList>

        {/* STAFF DIRECTORY */}
        <TabsContent value="directory">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredStaff.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No staff found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredStaff.map(member => {
                const todayRec = todayAttendance.find(a => a.staffId === member.id);
                const pendingLeave = leaves.find(l => l.staffId === member.id && l.status === 'pending');
                return (
                  <Card key={member.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                            {member.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.fullName}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role} {member.assignedClasses?.length > 0 && `• ${member.assignedClasses.length} class(es)`}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant="outline" className="capitalize text-xs">{member.role}</Badge>
                          {todayRec && <Badge className={`text-xs ${STATUS_COLORS[todayRec.status]}`}>{todayRec.status}</Badge>}
                          {pendingLeave && <Badge className="text-xs bg-amber-100 text-amber-700">Leave pending</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* STAFF ATTENDANCE */}
        <TabsContent value="attendance">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-44" />
            </div>
            <div className="sm:ml-auto mt-2 sm:mt-0">
              <Button onClick={saveAttendance} disabled={savingAttendance}>
                {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save Attendance
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {staff.map(member => {
              const current = attendanceMap[member.id]?.status || null;
              return (
                <Card key={member.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {(['present', 'absent', 'late', 'on_leave']).map(status => (
                          <button
                            key={status}
                            onClick={() => markAttendance(member.id, status)}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                              current === status
                                ? STATUS_COLORS[status] + ' border-transparent'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {status === 'on_leave' ? 'Leave' : status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* LEAVE REQUESTS */}
        <TabsContent value="leaves">
          {leaves.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No leave requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...leaves].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(leave => (
                <Card key={leave.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{leave.staffName}</p>
                          <Badge className={
                            leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>{leave.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize mt-0.5">
                          {leave.leaveType} leave • {leave.startDate} → {leave.endDate} ({leave.daysRequested} day{leave.daysRequested !== 1 ? 's' : ''})
                        </p>
                        {leave.reason && <p className="text-xs text-muted-foreground mt-1">"{leave.reason}"</p>}
                      </div>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => reviewLeave(leave, 'approved')}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => reviewLeave(leave, 'rejected')}>
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HR STAFF TAB */}
        <TabsContent value="hr_staff">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Manage HR staff accounts and control which features they can access.</p>
            <Button onClick={() => setShowCreateHR(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add HR Staff
            </Button>
          </div>

          {hrStaff.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No HR staff yet</p>
                <p className="text-sm mt-1">Add an HR staff member to delegate HR tasks with controlled access.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hrStaff.map(member => {
                const enabledCount = Object.values(member.permittedFeatures || {}).filter(Boolean).length;
                return (
                  <Card key={member.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                            {member.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.fullName}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{enabledCount} feature{enabledCount !== 1 ? 's' : ''} enabled</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedHRMember(member); setShowPermissions(true); }}>
                          <Shield className="w-3.5 h-3.5 mr-1" /> Permissions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateHRStaffDialog open={showCreateHR} onOpenChange={setShowCreateHR} schoolUser={user} onCreated={loadData} />
      {selectedHRMember && (
        <HRStaffPermissionsDialog
          open={showPermissions}
          onOpenChange={setShowPermissions}
          member={selectedHRMember}
          onSaved={loadData}
        />
      )}

      {/* Leave Request Dialog */}
      <Dialog open={showLeave} onOpenChange={setShowLeave}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Leave Request</DialogTitle></DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={leaveForm.staffId} onValueChange={v => setLeaveForm({ ...leaveForm, staffId: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.role})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={leaveForm.leaveType} onValueChange={v => setLeaveForm({ ...leaveForm, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional reason" />
            </div>
            <Button type="submit" className="w-full" disabled={savingLeave}>
              {savingLeave && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Leave Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}