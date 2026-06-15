import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HostelAnalytics({ hostels, allocations, attendance }) {
  const analytics = useMemo(() => {
    // Occupancy by hostel
    const hostelOccupancy = hostels.map(h => ({
      name: h.name,
      occupied: allocations.filter(a => a.hostelId === h.id).length,
      capacity: h.capacity,
      available: h.capacity - (allocations.filter(a => a.hostelId === h.id).length),
    }));

    // Gender distribution
    const genderCount = {
      male: allocations.filter(a => a.gender === 'male').length,
      female: allocations.filter(a => a.gender === 'female').length,
    };

    // Attendance summary
    const attendanceSummary = {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      onLeave: attendance.filter(a => a.status === 'on_leave').length,
      lateArrival: attendance.filter(a => a.status === 'late_arrival').length,
    };

    return { hostelOccupancy, genderCount, attendanceSummary };
  }, [hostels, allocations, attendance]);

  const COLORS = ['#3b82f6', '#ef4444'];
  const totalOccupancy = allocations.length;
  const totalCapacity = hostels.reduce((sum, h) => sum + h.capacity, 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Capacity</div>
            <div className="text-2xl font-bold">{totalCapacity}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Currently Occupied</div>
            <div className="text-2xl font-bold text-amber-600">{totalOccupancy}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Occupancy Rate</div>
            <div className="text-2xl font-bold text-blue-600">{occupancyRate}%</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Available Beds</div>
            <div className="text-2xl font-bold text-green-600">{totalCapacity - totalOccupancy}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by Hostel */}
        {analytics.hostelOccupancy.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Occupancy by Hostel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.hostelOccupancy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="occupied" fill="#3b82f6" name="Occupied" />
                  <Bar dataKey="available" fill="#d1d5db" name="Available" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gender Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Male', value: analytics.genderCount.male },
                    { name: 'Female', value: analytics.genderCount.female },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Present</p>
              <p className="text-lg font-bold text-green-600">{analytics.attendanceSummary.present}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Absent</p>
              <p className="text-lg font-bold text-red-600">{analytics.attendanceSummary.absent}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">On Leave</p>
              <p className="text-lg font-bold text-blue-600">{analytics.attendanceSummary.onLeave}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Late Arrival</p>
              <p className="text-lg font-bold text-amber-600">{analytics.attendanceSummary.lateArrival}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}