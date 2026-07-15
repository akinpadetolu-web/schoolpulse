import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Home, Users, UserCheck, ShieldCheck, ClipboardCheck, BarChart3 } from 'lucide-react';
import HostelManagementPanel from '@/components/hostel/HostelManagementPanel';
import HostelAllocationPanel from '@/components/hostel/HostelAllocationPanel';
import HostelAttendancePanel from '@/components/hostel/HostelAttendancePanel';
import HostelDailyAttendance from '@/components/hostel/HostelDailyAttendance';
import HostelAttendanceReport from '@/components/hostel/HostelAttendanceReport';
import HostelAnalytics from '@/components/hostel/HostelAnalytics';

export default function AdminHostel() {
  const { schoolUser: user } = useSchoolAuth();
  const [hostels, setHostels] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.schoolId) return;
    loadData();
    const unsub = base44.entities.Hostel.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    return unsub;
  }, [user?.schoolId]);

  async function loadData() {
    try {
      const [h, a, att, stds] = await Promise.all([
        base44.entities.Hostel.filter({ schoolId: user?.schoolId, isActive: true }),
        base44.entities.HostelAllocation.filter({ schoolId: user?.schoolId, status: 'active' }),
        base44.entities.HostelAttendance.filter({ schoolId: user?.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' }),
      ]);
      setHostels(h || []);
      setAllocations(a || []);
      setAttendance(att || []);
      setStudents((stds || []).filter(s => !s.isArchived));
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const genderFilter = user?.genderAccess;

  const filteredAllocations = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return allocations;
    return allocations.filter(a => (a.gender || '').toLowerCase() === genderFilter);
  }, [allocations, genderFilter]);

  const filteredAttendance = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return attendance;
    return attendance.filter(a => {
      const alloc = allocations.find(al => al.studentId === a.studentId);
      return alloc && (alloc.gender || '').toLowerCase() === genderFilter;
    });
  }, [attendance, allocations, genderFilter]);

  const filteredHostels = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return hostels;
    return hostels.filter(h => h.gender === genderFilter || h.gender === 'mixed');
  }, [hostels, genderFilter]);

  const stats = {
    totalHostels: filteredHostels.length,
    totalBeds: filteredHostels.reduce((sum, h) => sum + (h.capacity || 0), 0),
    occupied: filteredAllocations.length,
    available: Math.max(0, filteredHostels.reduce((sum, h) => sum + (h.capacity || 0), 0) - filteredAllocations.length),
    todayPresent: filteredAttendance.filter(a => a.attendanceDate === new Date().toISOString().split('T')[0] && a.status === 'present').length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const accessLabel = !genderFilter || genderFilter === 'all'
    ? 'Full Access (All Students)'
    : genderFilter === 'male'
      ? 'Male Students Only'
      : 'Female Students Only';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hostel Management</h1>
          <p className="text-muted-foreground">Manage hostels, student allocations, and attendance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4" /> {accessLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Hostels</div>
            <div className="text-2xl font-bold">{stats.totalHostels}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Beds</div>
            <div className="text-2xl font-bold">{stats.totalBeds}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Occupied</div>
            <div className="text-2xl font-bold text-amber-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Available</div>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Present Today</div>
            <div className="text-2xl font-bold">{stats.todayPresent}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hostels or students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Tabs defaultValue="hostels" className="w-full">
        <TabsList>
          <TabsTrigger value="hostels"><Home className="w-4 h-4 mr-2" /> Hostels</TabsTrigger>
          <TabsTrigger value="allocations"><Users className="w-4 h-4 mr-2" /> Allocations ({filteredAllocations.length})</TabsTrigger>
          <TabsTrigger value="take-attendance"><ClipboardCheck className="w-4 h-4 mr-2" /> Take Attendance</TabsTrigger>
          <TabsTrigger value="attendance"><UserCheck className="w-4 h-4 mr-2" /> Attendance Log</TabsTrigger>
          <TabsTrigger value="report"><BarChart3 className="w-4 h-4 mr-2" /> Attendance Report</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="hostels"><HostelManagementPanel hostels={filteredHostels} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="allocations"><HostelAllocationPanel allocations={filteredAllocations} hostels={filteredHostels} search={search} onRefresh={loadData} students={students} /></TabsContent>
        <TabsContent value="take-attendance"><HostelDailyAttendance allocations={filteredAllocations} hostels={filteredHostels} attendance={filteredAttendance} onRefresh={loadData} /></TabsContent>
        <TabsContent value="attendance"><HostelAttendancePanel attendance={filteredAttendance} allocations={filteredAllocations} hostels={filteredHostels} onRefresh={loadData} /></TabsContent>
        <TabsContent value="report"><HostelAttendanceReport allocations={filteredAllocations} hostels={filteredHostels} attendance={filteredAttendance} /></TabsContent>
        <TabsContent value="analytics"><HostelAnalytics hostels={filteredHostels} allocations={filteredAllocations} attendance={filteredAttendance} /></TabsContent>
      </Tabs>
    </div>
  );
}