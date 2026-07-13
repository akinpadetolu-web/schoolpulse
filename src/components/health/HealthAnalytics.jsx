import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Stethoscope, AlertTriangle, Syringe, Accessibility, BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function HealthAnalytics({ records, visits, incidents, vaccinations, specialNeeds }) {
  const summary = [
    { name: 'Medical Records', count: records.length,       icon: Heart,         color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { name: 'Nurse Visits',    count: visits.length,         icon: Stethoscope,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { name: 'Incidents',       count: incidents.length,     icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { name: 'Vaccinations',    count: vaccinations.length,  icon: Syringe,      color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { name: 'Special Needs',   count: specialNeeds.length,  icon: Accessibility,color: 'text-pink-600',    bg: 'bg-pink-50 dark:bg-pink-900/20' },
  ];

  const visitReasons = ['illness', 'injury', 'routine_checkup', 'medication_administration', 'allergy_reaction', 'mental_health', 'dental', 'other'];
  const visitReasonData = visitReasons.map(reason => ({
    name: reason.replace(/_/g, ' '),
    count: visits.filter(v => v.reason === reason).length,
  })).filter(d => d.count > 0);

  const severityData = ['minor', 'moderate', 'severe', 'critical'].map(severity => ({
    name: severity,
    count: incidents.filter(i => i.severity === severity).length,
  })).filter(d => d.count > 0);

  const vacStatusData = ['completed', 'pending', 'overdue', 'exempted'].map(status => ({
    name: status,
    count: vaccinations.filter(v => v.status === status).length,
  })).filter(d => d.count > 0);

  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown'];
  const bloodGroupData = bloodGroups.map(bg => ({
    name: bg,
    count: records.filter(r => r.bloodGroup === bg).length,
  })).filter(d => d.count > 0);

  const hasData = records.length > 0 || visits.length > 0 || incidents.length > 0 || vaccinations.length > 0 || specialNeeds.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No health data to display yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.name} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.name}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overview Bar Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Health Records Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summary.map(s => ({ name: s.name, count: s.count }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visit Reasons */}
        {visitReasonData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Nurse Visits by Reason</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={visitReasonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Incident Severity */}
        {severityData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Incidents by Severity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={severityData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Vaccination Status */}
        {vacStatusData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Vaccinations by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vacStatusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Blood Group Distribution */}
        {bloodGroupData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Blood Group Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={bloodGroupData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {bloodGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}