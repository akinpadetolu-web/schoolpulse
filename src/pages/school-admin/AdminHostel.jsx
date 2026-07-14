import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, Home, Users, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import HostelManagementPanel from '@/components/hostel/HostelManagementPanel';
import HostelAllocationPanel from '@/components/hostel/HostelAllocationPanel';
import HostelAttendancePanel from '@/components/hostel/HostelAttendancePanel';
import HostelAnalytics from '@/components/hostel/HostelAnalytics';

export default function AdminHostel() {
  const { schoolUser: user } = useSchoolAuth();
  const [hostels, setHostels] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [attendance, setAttendance] = useState([]);
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
      const [h, a, att] = await Promise.all([
        base44.entities.Hostel.filter({ schoolId: user?.schoolId, isActive: true }),
        base44.entities.HostelAllocation.filter({ schoolId: user?.schoolId, status: 'active' }),
        base44.entities.HostelAttendance.filter({ schoolId: user?.schoolId }),
      ]);
      setHostels(h || []);
      setAllocations(a || []);
      setAttendance(att || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalHostels: hostels.length,
    totalBeds: hostels.reduce((sum, h) => sum + (h.capacity || 0), 0),
    occupied: allocations.length,
    available: Math.max(0, hostels.reduce((sum, h) => sum + (h.capacity || 0), 0) - allocations.length),
    todayPresent: attendance.filter(a => a.attendanceDate === new Date().toISOString().split('T')[0] && a.status === 'present').length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hostel Management</h1>
          <p className="text-muted-foreground">Manage hostels, student allocations, and attendance</p>
        </div>
      </div>

      {/* Stats */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hostels or students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hostels" className="w-full">
        <TabsList>
          <TabsTrigger value="hostels"><Home className="w-4 h-4 mr-2" /> Hostels</TabsTrigger>
          <TabsTrigger value="allocations"><Users className="w-4 h-4 mr-2" /> Allocations ({allocations.length})</TabsTrigger>
          <TabsTrigger value="attendance"><UserCheck className="w-4 h-4 mr-2" /> Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="hostels"><HostelManagementPanel hostels={hostels} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="allocations"><HostelAllocationPanel allocations={allocations} hostels={hostels} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="attendance"><HostelAttendancePanel attendance={attendance} allocations={allocations} hostels={hostels} onRefresh={loadData} /></TabsContent>
        <TabsContent value="analytics"><HostelAnalytics hostels={hostels} allocations={allocations} attendance={attendance} /></TabsContent>
      </Tabs>
    </div>
  );
}