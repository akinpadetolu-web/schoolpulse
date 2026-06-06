import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, BookOpen, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function AttendanceKPICards({ records }) {
  const total = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const attendedCount = presentCount + lateCount;
  const overallPct = total > 0 ? Math.round((attendedCount / total) * 100) : null;

  // Most missed subject
  const absentBySubject = {};
  records.filter(r => r.status === 'absent').forEach(r => {
    const s = r.subjectName || 'General';
    absentBySubject[s] = (absentBySubject[s] || 0) + 1;
  });
  const mostMissed = Object.entries(absentBySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // Perfect attendance subjects (0 absences, at least 1 record)
  const bySubject = {};
  records.forEach(r => {
    const s = r.subjectName || 'General';
    if (!bySubject[s]) bySubject[s] = { total: 0, absent: 0 };
    bySubject[s].total++;
    if (r.status === 'absent') bySubject[s].absent++;
  });
  const perfectSubjects = Object.entries(bySubject).filter(([, v]) => v.absent === 0 && v.total > 0).length;

  // Trend: compare first half vs second half of records
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  let trend = 'stable';
  if (sorted.length >= 6) {
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    const firstPct = firstHalf.filter(r => r.status !== 'absent').length / firstHalf.length;
    const secondPct = secondHalf.filter(r => r.status !== 'absent').length / secondHalf.length;
    if (secondPct - firstPct > 0.05) trend = 'improving';
    else if (firstPct - secondPct > 0.05) trend = 'declining';
  }

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-600 bg-emerald-50' : trend === 'declining' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50';

  const kpis = [
    {
      label: 'Overall Rate',
      value: overallPct !== null ? `${overallPct}%` : '—',
      sub: `${attendedCount}/${total} classes`,
      icon: CheckCircle2,
      color: overallPct === null ? 'text-slate-600 bg-slate-50' : overallPct >= 75 ? 'text-emerald-600 bg-emerald-50' : overallPct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
    },
    {
      label: 'Classes Attended',
      value: attendedCount,
      sub: `${presentCount} present, ${lateCount} late`,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Classes Missed',
      value: absentCount,
      sub: total > 0 ? `${Math.round((absentCount / total) * 100)}% of total` : '—',
      icon: XCircle,
      color: absentCount === 0 ? 'text-emerald-600 bg-emerald-50' : absentCount > 5 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Classes Late',
      value: lateCount,
      sub: total > 0 ? `${Math.round((lateCount / total) * 100)}% of total` : '—',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Most Missed',
      value: mostMissed === '—' ? '—' : mostMissed.length > 12 ? mostMissed.slice(0, 12) + '…' : mostMissed,
      sub: mostMissed !== '—' ? `${absentBySubject[mostMissed]} absences` : 'No absences',
      icon: BookOpen,
      color: mostMissed === '—' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50',
    },
    {
      label: 'Perfect Subjects',
      value: perfectSubjects,
      sub: `of ${Object.keys(bySubject).length} subjects`,
      icon: Star,
      color: perfectSubjects > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50',
    },
    {
      label: 'Trend',
      value: trend.charAt(0).toUpperCase() + trend.slice(1),
      sub: 'vs earlier period',
      icon: TrendIcon,
      color: trendColor,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {kpis.map(k => (
        <Card key={k.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.color}`}>
              <k.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold leading-tight">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{k.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}