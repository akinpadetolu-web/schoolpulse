import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO, startOfWeek, getISOWeek } from 'date-fns';

const COLORS = { present: '#10b981', absent: '#ef4444', late: '#f59e0b', excused: '#3b82f6' };

export default function AttendanceCharts({ records }) {
  const [chartType, setChartType] = useState('bar');

  // Per-subject bar data
  const bySubject = {};
  records.forEach(r => {
    const s = r.subjectName || 'General';
    if (!bySubject[s]) bySubject[s] = { subject: s, Present: 0, Absent: 0, Late: 0 };
    if (r.status === 'present') bySubject[s].Present++;
    else if (r.status === 'absent') bySubject[s].Absent++;
    else if (r.status === 'late') bySubject[s].Late++;
  });
  const subjectData = Object.values(bySubject).map(d => ({
    ...d,
    pct: d.Present + d.Late + d.Absent > 0 ? Math.round(((d.Present + d.Late) / (d.Present + d.Late + d.Absent)) * 100) : 0,
  }));

  // Overall pie data
  const overall = { Present: 0, Absent: 0, Late: 0 };
  records.forEach(r => {
    if (r.status === 'present') overall.Present++;
    else if (r.status === 'absent') overall.Absent++;
    else if (r.status === 'late') overall.Late++;
  });
  const pieData = Object.entries(overall).map(([name, value]) => ({ name, value }));

  // Weekly trend line data
  const byWeek = {};
  records.forEach(r => {
    if (!r.date) return;
    const d = parseISO(r.date);
    const ws = format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d');
    if (!byWeek[ws]) byWeek[ws] = { week: ws, total: 0, attended: 0 };
    byWeek[ws].total++;
    if (r.status !== 'absent') byWeek[ws].attended++;
  });
  const trendData = Object.values(byWeek).map(w => ({
    week: w.week,
    Rate: w.total > 0 ? Math.round((w.attended / w.total) * 100) : 0,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Attendance Analytics</CardTitle>
          <div className="flex gap-1">
            {[
              { key: 'bar', label: 'By Subject' },
              { key: 'line', label: 'Trend' },
              { key: 'pie', label: 'Overall' },
            ].map(t => (
              <Button
                key={t.key}
                variant={chartType === t.key ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setChartType(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">No data to display.</div>
        ) : (
          <>
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Present" fill={COLORS.present} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Absent" fill={COLORS.absent} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Late" fill={COLORS.late} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={v => [`${v}%`, 'Attendance Rate']} />
                  <Line type="monotone" dataKey="Rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {chartType === 'pie' && (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}