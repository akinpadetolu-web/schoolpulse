import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Home, Bed, Clock, Phone, User, Users } from 'lucide-react';

export default function ParentHostel() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [hostelData, setHostelData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id, user?.linkedStudentIds]);

  async function loadData() {
    try {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.length === 0) {
        setLoading(false);
        return;
      }

      const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' });
      const myChildren = (allStudents || []).filter(s => linkedIds.includes(s.id));
      setChildren(myChildren);

      const boardingChildren = myChildren.filter(c => c.hostelId);
      const dataPromises = boardingChildren.map(async (child) => {
        const [hostels, allocs, att] = await Promise.all([
          base44.entities.Hostel.filter({ schoolId: user.schoolId, id: child.hostelId }),
          base44.entities.HostelAllocation.filter({ schoolId: user.schoolId, studentId: child.id, status: 'active' }),
          base44.entities.HostelAttendance.filter({ schoolId: user.schoolId, studentId: child.id }),
        ]);
        return {
          child,
          hostel: hostels?.[0] || null,
          allocation: allocs?.[0] || null,
          attendance: (att || []).sort((a, b) => (b.attendanceDate || '').localeCompare(a.attendanceDate || '')).slice(0, 10),
        };
      });

      const results = await Promise.all(dataPromises);
      setHostelData(results);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const boardingChildren = hostelData.filter(d => d.hostel && d.allocation);

  if (boardingChildren.length === 0) {
    return (
      <div className="text-center py-20">
        <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground">Your child(ren) are not currently allocated to a hostel.</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const statusBadge = (status) => {
    const cls = status === 'present' ? 'bg-green-100 text-green-700' :
      status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
    return <Badge className={cls}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hostel Information</h1>
        <p className="text-muted-foreground">Live updates on your child's hostel allocation and attendance</p>
      </div>

      {boardingChildren.map(({ child, hostel, allocation, attendance }) => (
        <div key={child.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{child.fullName}</h2>
            {child.className && <Badge variant="outline">{child.className}</Badge>}
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
              {(() => {
                const today = attendance.find(a => a.attendanceDate === todayStr);
                return today ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{today.status.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{today.attendanceDate}</p>
                    </div>
                    {statusBadge(today.status)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attendance marked for today</p>
                );
              })()}
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
      ))}
    </div>
  );
}