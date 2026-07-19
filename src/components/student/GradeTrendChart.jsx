import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#6366f1'];

export default function GradeTrendChart({ grades }) {
  const { trendData, subjects } = useMemo(() => {
    if (!grades || grades.length === 0) return { trendData: [], subjects: [] };

    const bySubject = {};
    grades.forEach(g => {
      if (g.score == null || g.maxScore <= 0 || !g.subjectName) return;
      if (!bySubject[g.subjectName]) bySubject[g.subjectName] = [];
      bySubject[g.subjectName].push({
        percentage: pct(g.score, g.maxScore),
        date: new Date(g.lastUpdatedAt || g.created_date),
      });
    });

    // Collect all unique dates sorted chronologically
    const allDates = grades
      .map(g => new Date(g.lastUpdatedAt || g.created_date))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);

    if (allDates.length === 0) return { trendData: [], subjects: [] };

    const dateMap = new Map();
    allDates.forEach(d => {
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(key)) dateMap.set(key, { label: key, ts: d.getTime() });
    });

    const sortedDates = [...dateMap.values()].sort((a, b) => a.ts - b.ts);
    const subjectNames = Object.keys(bySubject).sort();

    // Build trend data: for each date, compute cumulative average per subject up to that date
    const data = sortedDates.map((dateEntry) => {
      const point = { date: dateEntry.label };
      subjectNames.forEach(subject => {
        const upTo = bySubject[subject].filter(g => g.date.getTime() <= dateEntry.ts);
        if (upTo.length > 0) {
          point[subject] = Math.round(upTo.reduce((s, g) => s + g.percentage, 0) / upTo.length);
        }
      });
      return point;
    });

    return { trendData: data, subjects: subjectNames };
  }, [grades]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Grade Trends Over Term
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trendData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <TrendingUp className="w-8 h-8 opacity-30" />
            <p>No trend data yet — grades will appear here as they are recorded.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                {subjects.map((subject, idx) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {subjects.map((subject, idx) => (
                <span key={subject} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  {subject}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}