import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HealthAnalytics({ records, visits, incidents, vaccinations, special }) {
  const analytics = useMemo(() => {
    // Blood group distribution
    const bloodGroups = {};
    records.forEach(r => {
      bloodGroups[r.bloodGroup] = (bloodGroups[r.bloodGroup] || 0) + 1;
    });

    // Visit reasons
    const visitReasons = {};
    visits.forEach(v => {
      visitReasons[v.reason] = (visitReasons[v.reason] || 0) + 1;
    });

    // Vaccination status
    const vacStatus = {
      completed: vaccinations.filter(v => v.status === 'completed').length,
      pending: vaccinations.filter(v => v.status === 'pending').length,
      overdue: vaccinations.filter(v => v.status === 'overdue').length,
    };

    return {
      bloodGroups: Object.entries(bloodGroups).map(([name, value]) => ({ name, value })),
      visitReasons: Object.entries(visitReasons).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
      vacStatus: [
        { name: 'Completed', value: vacStatus.completed },
        { name: 'Pending', value: vacStatus.pending },
        { name: 'Overdue', value: vacStatus.overdue },
      ],
    };
  }, [records, visits, vaccinations]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Records</div>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Visits</div>
            <div className="text-2xl font-bold text-blue-600">{visits.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Open Incidents</div>
            <div className="text-2xl font-bold text-red-600">{incidents.filter(i => i.status !== 'closed').length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Special Needs</div>
            <div className="text-2xl font-bold">{special.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.bloodGroups.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Blood Group Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={analytics.bloodGroups} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {analytics.bloodGroups.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {analytics.vacStatus.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vaccination Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.vacStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}