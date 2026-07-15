import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Home, Bed, Clock, Phone, User } from 'lucide-react';

export default function StudentHostel() {
  const { schoolUser: user } = useSchoolAuth();
  const [hostel, setHostel] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  async function loadData() {
    try {
      if (!user?.hostelId) {
        setLoading(false);
        return;
      }

      const [hostels, allocs, att] = await Promise.all([
        base44.entities.Hostel.filter({ schoolId: user.schoolId, id: user.hostelId }),
        base44.entities.HostelAllocation.filter({ schoolId: user.schoolId, studentId: user.id, status: 'active' }),
        base44.entities.HostelAttendance.filter({ schoolId: user.schoolId, studentId: user.id }),
      ]);

      if (hostels.length > 0) setHostel(hostels[0]);
      if (allocs.length > 0) setAllocation(allocs[0]);
      setAttendance((att || []).sort((a, b) => (b.attendanceDate || '').localeCompare(a.attendanceDate || '')).slice(0, 10));
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!hostel || !allocation) {
    return (
      <div className="text-center py-20">
        <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground">You are not currently allocated to a hostel.</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(a => a.attendanceDate === todayStr);

  const statusBadge = (status) => {
    const cls = status === 'present' ? 'bg-green-100 text-green-700' :
      status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
    return <Badge className={cls}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Hostel</h1>
        <p className="text-muted-foreground">Your hostel allocation and attendance</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="w-4 h-4" /> {hostel.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Room Number</p>
              <p className="font-medium flex items-center gap-1"><Bed className="w-3 h-3" /> {allocation.roomNumber || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bed Number</p>
              <p className="font-medium">{allocation.bedNumber || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gender</p>
              <Badge variant="outline" className="capitalize">{hostel.gender}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <Badge variant="outline">{hostel.type}</Badge>
            </div>
          </div>

          {hostel.housemasterName && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Housemaster</p>
              <p className="font-medium flex items-center gap-1"><User className="w-3 h-3" /> {hostel.housemasterName}</p>
              {hostel.housemasterPhone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {hostel.housemasterPhone}</p>}
            </div>
          )}

          <div className="pt-3 border-t text-sm text-muted-foreground">
            <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Check-in: {hostel.checkInTime || 'N/A'}</p>
            <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Check-out: {hostel.checkOutTime || 'N/A'}</p>
            {hostel.visitingHours && <p>Visiting Hours: {hostel.visitingHours}</p>}
          </div>

          {hostel.facilities?.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Facilities</p>
              <div className="flex flex-wrap gap-1">
                {hostel.facilities.map((f, idx) => <Badge key={idx} variant="outline" className="text-xs">{f}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Status</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize">{todayAttendance.status.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{todayAttendance.attendanceDate}</p>
              </div>
              {statusBadge(todayAttendance.status)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance marked for today</p>
          )}
        </CardContent>
      </Card>

      {attendance.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendance.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{a.attendanceDate}</p>
                    {a.checkInTime && <p className="text-xs text-muted-foreground">In: {a.checkInTime}</p>}
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}