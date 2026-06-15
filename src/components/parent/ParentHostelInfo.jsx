import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Loader2, Home, Users } from 'lucide-react';

export default function ParentHostelInfo({ studentId }) {
  const { schoolUser: user } = useSchoolAuth();
  const [allocation, setAllocation] = useState(null);
  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    try {
      const allocs = await base44.entities.HostelAllocation.filter({
        schoolId: user?.schoolId,
        studentId,
        status: 'active',
      });

      if (allocs.length > 0) {
        setAllocation(allocs[0]);
        const hostels = await base44.entities.Hostel.filter({
          schoolId: user?.schoolId,
          id: allocs[0].hostelId,
        });
        if (hostels.length > 0) {
          setHostel(hostels[0]);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (!allocation || !hostel) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Not a boarding student</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="w-4 h-4" /> Hostel Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{hostel.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {hostel.gender} - Bed {allocation.bedNumber || 'TBD'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {hostel.housemasterName && (
            <div>
              <p className="text-xs text-muted-foreground">Housemaster</p>
              <p className="font-medium text-xs">{hostel.housemasterName}</p>
              {hostel.housemasterPhone && <p className="text-xs text-muted-foreground">{hostel.housemasterPhone}</p>}
            </div>
          )}
          {hostel.monthlyFee && (
            <div>
              <p className="text-xs text-muted-foreground">Monthly Fee</p>
              <p className="font-medium text-xs">NGN {hostel.monthlyFee.toLocaleString()}</p>
            </div>
          )}
        </div>

        {hostel.facilities?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Facilities</p>
            <div className="flex flex-wrap gap-1">
              {hostel.facilities.map((f, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{f}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p><span className="font-medium">Check-in:</span> {hostel.checkInTime}</p>
          <p><span className="font-medium">Check-out:</span> {hostel.checkOutTime}</p>
          {hostel.visitingHours && <p><span className="font-medium">Visiting Hours:</span> {hostel.visitingHours}</p>}
        </div>
      </CardContent>
    </Card>
  );
}