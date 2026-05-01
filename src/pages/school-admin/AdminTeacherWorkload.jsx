import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, CheckCircle2, TrendingUp, Users, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function getBalanceScore(dailyHours) {
  // Standard deviation of hours across days — higher = more unbalanced
  const values = DAYS.map(d => dailyHours[d] || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export default function AdminTeacherWorkload() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [overloadThreshold, setOverloadThreshold] = useState(20); // hours/week
  const [balanceThreshold, setBalanceThreshold] = useState(2);   // std deviation hours

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, e] = await Promise.all([
      base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.entities.TimetableEntry.filter({ schoolId }),
    ]);
    setTeachers(t || []);
    setEntries(e || []);
    setLoading(false);
  }

  // ── Compute workload per teacher ──────────────────────────────────────────
  const workloadData = teachers.map(teacher => {
    const myEntries = entries.filter(e => e.teacherId === teacher.id);
    const dailyHours = {};
    DAYS.forEach(d => { dailyHours[d] = 0; });
    let totalHours = 0;
    let totalPeriods = 0;

    myEntries.forEach(e => {
      const h = getDurationHours(e.startTime, e.endTime);
      dailyHours[e.dayOfWeek] = (dailyHours[e.dayOfWeek] || 0) + h;
      totalHours += h;
      totalPeriods++;
    });

    const balanceScore = getBalanceScore(dailyHours);
    const isOverloaded = totalHours > overloadThreshold;
    const isUnbalanced = balanceScore > balanceThreshold && totalHours > 0;

    return {
      id: teacher.id,
      name: teacher.fullName,
      totalHours: Math.round(totalHours * 10) / 10,
      totalPeriods,
      dailyHours,
      balanceScore: Math.round(balanceScore * 10) / 10,
      isOverloaded,
      isUnbalanced,
      status: isOverloaded ? 'overloaded' : isUnbalanced ? 'unbalanced' : totalHours === 0 ? 'unassigned' : 'ok',
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const overloadedCount = workloadData.filter(w => w.isOverloaded).length;
  const unbalancedCount = workloadData.filter(w => w.isUnbalanced && !w.isOverloaded).length;
  const unassignedCount = workloadData.filter(w => w.totalHours === 0).length;
  const avgHours = workloadData.length
    ? Math.round((workloadData.reduce((a, b) => a + b.totalHours, 0) / workloadData.length) * 10) / 10
    : 0;

  // ── Bar chart data ────────────────────────────────────────────────────────
  const barData = workloadData.map(w => ({
    name: w.name.split(' ')[0], // first name for brevity
    fullName: w.name,
    hours: w.totalHours,
    fill: w.isOverloaded ? '#ef4444' : w.isUnbalanced ? '#f59e0b' : w.totalHours === 0 ? '#94a3b8' : '#3b82f6',
  }));

  // ── Radar chart for selected teacher ─────────────────────────────────────
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const radarData = selectedTeacher
    ? DAYS.map(d => ({ day: d.slice(0, 3), hours: Math.round((selectedTeacher.dailyHours[d] || 0) * 10) / 10 }))
    : [];

  const statusBadge = (status) => {
    if (status === 'overloaded') return <Badge className="bg-red-100 text-red-700 border-red-200">Overloaded</Badge>;
    if (status === 'unbalanced') return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Unbalanced</Badge>;
    if (status === 'unassigned') return <Badge className="bg-slate-100 text-slate-500 border-slate-200">No entries</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">OK</Badge>;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Teacher Workload</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Weekly teaching hours based on current timetable entries</p>
      </div>

      {/* Threshold Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Overload threshold: <span className="font-bold text-red-600">{overloadThreshold} hrs/week</span>
            </Label>
            <Slider min={5} max={40} step={1} value={[overloadThreshold]} onValueChange={([v]) => setOverloadThreshold(v)} />
            <p className="text-xs text-muted-foreground">Teachers exceeding this are flagged as overloaded</p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Imbalance threshold: <span className="font-bold text-amber-600">{balanceThreshold} std dev</span>
            </Label>
            <Slider min={0.5} max={5} step={0.5} value={[balanceThreshold]} onValueChange={([v]) => setBalanceThreshold(v)} />
            <p className="text-xs text-muted-foreground">Higher daily variation flags unbalanced schedules</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Avg Weekly Hours", value: `${avgHours}h`, icon: Clock, color: "text-primary" },
          { label: "Overloaded", value: overloadedCount, icon: AlertTriangle, color: "text-red-500" },
          { label: "Unbalanced", value: unbalancedCount, icon: TrendingUp, color: "text-amber-500" },
          { label: "No Entries", value: unassignedCount, icon: Users, color: "text-slate-400" },
        ].map(card => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`w-5 h-5 flex-shrink-0 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      {barData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Hours per Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip
                  formatter={(v, _, props) => [`${v}h`, props.payload.fullName]}
                  contentStyle={{ fontSize: 12 }}
                />
                {/* reference line rendered as annotation */}
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={true} fill="#3b82f6">
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Overloaded</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Unbalanced</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> OK</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" /> No entries</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Table + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workload Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Teacher</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Total hrs</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Periods</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Balance</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.map(w => (
                    <tr
                      key={w.id}
                      onClick={() => setSelectedTeacher(w === selectedTeacher ? null : w)}
                      className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${selectedTeacher?.id === w.id ? 'bg-primary/5' : ''} ${w.isOverloaded ? 'bg-red-50/40' : w.isUnbalanced ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium">{w.name}</td>
                      <td className="px-3 py-3 text-center font-semibold">{w.totalHours}h</td>
                      <td className="px-3 py-3 text-center text-muted-foreground hidden sm:table-cell">{w.totalPeriods}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground hidden md:table-cell">±{w.balanceScore}h</td>
                      <td className="px-3 py-3 text-center">{statusBadge(w.status)}</td>
                    </tr>
                  ))}
                  {workloadData.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No teacher data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Radar / Detail Panel */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedTeacher ? `${selectedTeacher.name.split(' ')[0]}'s Daily Distribution` : 'Daily Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTeacher ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <Radar dataKey="hours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {DAYS.map(d => (
                    <div key={d} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-muted-foreground">{d.slice(0,3)}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((selectedTeacher.dailyHours[d] || 0) / Math.max(1, overloadThreshold / 5)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium">{(selectedTeacher.dailyHours[d] || 0).toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${selectedTeacher.isOverloaded ? 'bg-red-50 text-red-700' : selectedTeacher.isUnbalanced ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {selectedTeacher.isOverloaded
                    ? <><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Exceeds the overload threshold by {(selectedTeacher.totalHours - overloadThreshold).toFixed(1)}h</>
                    : selectedTeacher.isUnbalanced
                    ? <><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Schedule is unevenly distributed across days</>
                    : <><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Workload is within healthy limits</>
                  }
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-center text-muted-foreground text-sm">
                <div>
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Click a teacher in the table to see their daily distribution
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}