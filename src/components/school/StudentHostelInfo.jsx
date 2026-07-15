import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Home, Bed, Clock, Phone, User } from 'lucide-react';

export function StudentHostelInfo({ student, schoolId }) {
  const [hostel, setHostel] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id || !schoolId) return;
    loadData();
  }, [student?.id, schoolId]);

  async function loadData() {
    try {
      if (!student?.hostelId) {
        setLoading(false);
        return;
      }

      const [hostels, allocs, att] = await Promise.all([
        base44.entities.Hostel.filter({ schoolId, id: student.hostelId }),
        base44.entities.HostelAllocation.filter({ schoolId, studentId: student.id, status: 'active' }),
        base44.entities.HostelAttendance.filter({ schoolId, studentId: student.id }),
      ]);

      if (hostels.length > 0) setHostel(hostels[0]);
      if (allocs.length > 0) setAllocation(allocs[0]);
      setAttendance((att || []).sort((a, b) => (b.attendanceDate || '').localeCompare(a.attendanceDate || '')).slice(0, 5));
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (!hostel || !allocation) {
    return (
      <div className="text-center py-8">
        <Home className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm text-muted-foreground">Not allocated to a hostel</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">{hostel.name}</h3>
            <Badge variant="outline" className="capitalize">{hostel.gender}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Room</p>
              <p className="font-medium flex items-center gap-1"><Bed className="w-3 h-3" /> {allocation.roomNumber || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bed</p>
              <p className="font-medium">{allocation.bedNumber || 'Not assigned'}</p>
            </div>
          </div>

          {hostel.housemasterName && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Housemaster</p>
              <p className="text-sm font-medium flex items-center gap-1"><User className="w-3 h-3" /> {hostel.housemasterName}</p>
              {hostel.housemasterPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {hostel.housemasterPhone}</p>}
            </div>
          )}

          <div className="pt-3 border-t text-sm text-muted-foreground">
            <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Check-in: {hostel.checkInTime || 'N/A'}</p>
            <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Check-out: {hostel.checkOutTime || 'N/A'}</p>
          </div>

          {hostel.facilities?.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex flex-wrap gap-1">
                {hostel.facilities.map((f, idx) => <Badge key={idx} variant="outline" className="text-xs">{f}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {attendance.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Recent Attendance</p>
            <div className="space-y-1">
              {attendance.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{a.attendanceDate}</span>
                  <Badge className={
                    a.status === 'present' ? 'bg-green-100 text-green-700' :
                    a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }>{a.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StudentHostelInfo;