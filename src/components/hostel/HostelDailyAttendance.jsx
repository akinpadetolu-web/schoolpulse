import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle, UserCheck, BedDouble, Save, CheckCheck, Clock, Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', activeBg: 'bg-green-600 text-white' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', activeBg: 'bg-red-600 text-white' },
  { value: 'on_leave', label: 'On Leave', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', activeBg: 'bg-blue-600 text-white' },
];

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function HostelDailyAttendance({ allocations, hostels, attendance, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [activeSessionKey, setActiveSessionKey] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);

  const activeHostels = useMemo(() => hostels.filter(h => h.isActive), [hostels]);

  useEffect(() => {
    if (activeHostels.length > 0 && !selectedHostelId) {
      setSelectedHostelId(activeHostels[0].id);
    }
  }, [activeHostels, selectedHostelId]);

  // All attendance records for this hostel + date
  const dayAttendance = useMemo(() => {
    if (!selectedHostelId || !selectedDate) return [];
    return attendance.filter(a => a.hostelId === selectedHostelId && a.attendanceDate === selectedDate);
  }, [attendance, selectedHostelId, selectedDate]);

  // Group existing records into sessions by purpose
  const sessions = useMemo(() => {
    const grouped = {};
    dayAttendance.forEach(a => {
      const key = a.purpose || 'General';
      if (!grouped[key]) {
        grouped[key] = { purpose: key, records: [], latestTime: '' };
      }
      grouped[key].records.push(a);
      if (a.recordedAt && a.recordedAt > grouped[key].latestTime) {
        grouped[key].latestTime = a.recordedAt;
      }
    });
    return Object.values(grouped).sort((a, b) => (b.latestTime || '').localeCompare(a.latestTime || ''));
  }, [dayAttendance]);

  // Auto-select first session when sessions load and no active session
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionKey) {
      setActiveSessionKey(sessions[0].purpose);
    }
  }, [sessions, activeSessionKey]);

  // Students allocated to the selected hostel, grouped by room
  const hostelAllocations = useMemo(() => {
    if (!selectedHostelId) return [];
    return allocations
      .filter(a => a.hostelId === selectedHostelId && a.status === 'active')
      .sort((a, b) => {
        const roomCompare = (a.roomNumber || 'ZZZ').localeCompare(b.roomNumber || 'ZZZ', undefined, { numeric: true });
        if (roomCompare !== 0) return roomCompare;
        return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true });
      });
  }, [allocations, selectedHostelId]);

  const rooms = useMemo(() => {
    const grouped = {};
    hostelAllocations.forEach(a => {
      const room = a.roomNumber || 'Unassigned';
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(a);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [hostelAllocations]);

  // Load attendance for the active session into the map
  useEffect(() => {
    if (!activeSessionKey) {
      setAttendanceMap({});
      return;
    }
    const sessionRecords = dayAttendance.filter(a => (a.purpose || 'General') === activeSessionKey);
    const map = {};
    sessionRecords.forEach(a => {
      map[a.studentId] = {
        status: a.status,
        checkInTime: a.checkInTime || '',
        checkOutTime: a.checkOutTime || '',
        recordId: a.id,
      };
    });
    setAttendanceMap(map);
  }, [activeSessionKey, dayAttendance]);

  const setStatus = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: prev[studentId]?.status === status ? null : status,
      },
    }));
  };

  const markAllPresent = () => {
    const map = { ...attendanceMap };
    hostelAllocations.forEach(a => {
      if (!map[a.studentId]?.status) {
        map[a.studentId] = { ...map[a.studentId], status: 'present' };
      }
    });
    setAttendanceMap(map);
    toast.success('All unmarked students set to Present');
  };

  const startNewSession = () => {
    setActiveSessionKey('');
    setPurpose('');
    setAttendanceMap({});
  };

  const selectSession = (sessionPurpose) => {
    setActiveSessionKey(sessionPurpose);
    setPurpose(sessionPurpose);
  };

  const stats = useMemo(() => {
    const present = hostelAllocations.filter(a => attendanceMap[a.studentId]?.status === 'present').length;
    const absent = hostelAllocations.filter(a => attendanceMap[a.studentId]?.status === 'absent').length;
    const onLeave = hostelAllocations.filter(a => attendanceMap[a.studentId]?.status === 'on_leave').length;
    const unmarked = hostelAllocations.filter(a => !attendanceMap[a.studentId]?.status).length;
    return { present, absent, onLeave, unmarked, total: hostelAllocations.length };
  }, [hostelAllocations, attendanceMap]);

  const currentPurpose = purpose || activeSessionKey;

  const handleSave = async () => {
    const toSave = hostelAllocations.filter(a => attendanceMap[a.studentId]?.status);
    if (toSave.length === 0) {
      toast.error('No attendance to save. Mark at least one student.');
      return;
    }

    setSaving(true);
    const hostel = hostels.find(h => h.id === selectedHostelId);
    const now = new Date();
    const recordedAt = now.toISOString();
    const recordedTime = now.toTimeString().slice(0, 5);
    let success = 0;
    let failed = 0;

    for (const alloc of toSave) {
      const entry = attendanceMap[alloc.studentId];
      try {
        if (entry.recordId) {
          await base44.entities.HostelAttendance.update(entry.recordId, {
            status: entry.status,
            purpose: currentPurpose,
            checkInTime: entry.checkInTime || '',
            checkOutTime: entry.checkOutTime || '',
            recordedBy: user?.id,
            recordedByName: user?.fullName,
            recordedAt,
            recordedTime,
          });
        } else {
          await base44.entities.HostelAttendance.create({
            schoolId: user?.schoolId,
            hostelId: selectedHostelId,
            hostelName: hostel?.name,
            studentId: alloc.studentId,
            studentName: alloc.studentName,
            attendanceDate: selectedDate,
            status: entry.status,
            purpose: currentPurpose,
            checkInTime: entry.checkInTime || '',
            checkOutTime: entry.checkOutTime || '',
            recordedBy: user?.id,
            recordedByName: user?.fullName,
            recordedAt,
            recordedTime,
          });
        }
        success++;
      } catch (err) {
        console.error('Save error for student:', alloc.studentName, err);
        failed++;
      }
    }

    setSaving(false);
    if (failed === 0) {
      toast.success(`Attendance saved for ${success} student(s)`);
    } else if (success > 0) {
      toast.warning(`Saved ${success}, failed ${failed}`);
    } else {
      toast.error('Failed to save attendance');
    }
    setActiveSessionKey(currentPurpose);
    onRefresh?.();
  };

  if (activeHostels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No active hostels available for your access level.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Hostel</Label>
              <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hostel..." />
                </SelectTrigger>
                <SelectContent>
                  {activeHostels.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-[2] min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Attendance Purpose</Label>
              <Input
                placeholder="e.g. Morning Meal, Lights Out, Evening Reading..."
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session summary — shows all attendance sessions taken today with timestamps */}
      {sessions.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Today's Attendance Sessions</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {sessions.map(s => {
                const present = s.records.filter(r => r.status === 'present').length;
                const absent = s.records.filter(r => r.status === 'absent').length;
                const isActive = activeSessionKey === s.purpose;
                return (
                  <button
                    key={s.purpose}
                    onClick={() => selectSession(s.purpose)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{s.purpose}</span>
                        {s.latestTime && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" /> {formatTime(s.latestTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className="text-green-600">{present} present</span>
                        <span className="text-red-600">{absent} absent</span>
                        <span className="text-muted-foreground">{s.records.length} total</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={startNewSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <Plus className="w-4 h-4" /> New Session
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={markAllPresent} disabled={saving || hostelAllocations.length === 0}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All Present
          </Button>
          {sessions.length > 0 && (
            <Button variant="ghost" onClick={startNewSession} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" /> New Session
            </Button>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || stats.present + stats.absent + stats.onLeave === 0 || !currentPurpose}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Attendance
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Present</div>
            <div className="text-xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Absent</div>
            <div className="text-xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">On Leave</div>
            <div className="text-xl font-bold text-blue-600">{stats.onLeave}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Unmarked</div>
            <div className="text-xl font-bold text-amber-600">{stats.unmarked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Room-grouped student list */}
      {hostelAllocations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active allocations in this hostel.</p>
        </div>
      ) : !currentPurpose ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter an attendance purpose above (e.g. "Morning Meal") to start marking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map(([room, students]) => (
            <Card key={room} className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <BedDouble className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Room {room}</span>
                  <Badge variant="secondary" className="ml-1">{students.length} student{students.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(alloc => {
                    const current = attendanceMap[alloc.studentId];
                    const currentStatus = current?.status;
                    return (
                      <div key={alloc.studentId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-muted-foreground">
                            {alloc.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{alloc.studentName}</p>
                            {alloc.bedNumber && (
                              <p className="text-xs text-muted-foreground">Bed {alloc.bedNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {STATUS_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isActive = currentStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setStatus(alloc.studentId, opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                  isActive
                                    ? opt.activeBg + ' border-transparent'
                                    : opt.bg + ' ' + opt.border + ' ' + opt.color + ' hover:opacity-80'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}