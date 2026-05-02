import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

function getColor(avg) {
  if (avg >= 70) return '#22c55e';
  if (avg >= 60) return '#3b82f6';
  if (avg >= 50) return '#f59e0b';
  if (avg >= 40) return '#f97316';
  return '#ef4444';
}

function getGrade(avg) {
  if (avg >= 70) return { label: 'A', color: 'text-emerald-600' };
  if (avg >= 60) return { label: 'B', color: 'text-blue-600' };
  if (avg >= 50) return { label: 'C', color: 'text-amber-600' };
  if (avg >= 40) return { label: 'D', color: 'text-orange-600' };
  return { label: 'F', color: 'text-red-600' };
}

export default function TermProgressTab({ user, grades }) {
  // Build term-by-term subject averages from termSubjectGrades on the user entity
  const termSubjectGrades = user?.termSubjectGrades || [];

  // Get unique terms in order
  const terms = useMemo(() => {
    const termSet = new Set(termSubjectGrades.map(t => t.term));
    return Array.from(termSet);
  }, [termSubjectGrades]);

  // Get unique subjects
  const subjects = useMemo(() => {
    const subjectMap = {};
    termSubjectGrades.forEach(t => {
      if (!subjectMap[t.subjectId]) subjectMap[t.subjectId] = t.subjectId;
    });

    // Try to get subject names from raw grades
    grades.forEach(g => {
      if (g.subjectId && g.subjectName) subjectMap[g.subjectId] = g.subjectName;
    });

    return Object.entries(subjectMap).map(([id, name]) => ({ id, name }));
  }, [termSubjectGrades, grades]);

  // Build overall average per term
  const termOverallData = useMemo(() => {
    return terms.map(term => {
      const termEntries = termSubjectGrades.filter(t => t.term === term);
      const avg = termEntries.length
        ? Math.round(termEntries.reduce((s, t) => s + t.weightedAverage, 0) / termEntries.length)
        : null;
      return { term, avg };
    });
  }, [terms, termSubjectGrades]);

  // Build per-subject trend across terms
  const subjectTrendData = useMemo(() => {
    return subjects.map(subject => {
      const termPoints = terms.map(term => {
        const entry = termSubjectGrades.find(t => t.term === term && t.subjectId === subject.id);
        return { term, avg: entry ? Math.round(entry.weightedAverage) : null };
      }).filter(p => p.avg !== null);

      const latestAvg = termPoints.length ? termPoints[termPoints.length - 1].avg : null;
      const prevAvg = termPoints.length > 1 ? termPoints[termPoints.length - 2].avg : null;
      const trend = latestAvg != null && prevAvg != null ? latestAvg - prevAvg : null;

      return { subject, termPoints, latestAvg, trend };
    }).filter(s => s.termPoints.length > 0);
  }, [subjects, terms, termSubjectGrades]);

  // Current overall (latest term)
  const latestTermData = termOverallData[termOverallData.length - 1];
  const prevTermData = termOverallData[termOverallData.length - 2];
  const overallTrend = latestTermData?.avg != null && prevTermData?.avg != null
    ? latestTermData.avg - prevTermData.avg : null;

  if (termSubjectGrades.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No term performance data yet</p>
          <p className="text-sm mt-1">Your progress across terms will appear here once grades are recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Latest Term Average</p>
            {latestTermData?.avg != null ? (
              <div className="flex items-baseline gap-2 mt-1">
                <p className={`text-2xl font-bold ${getGrade(latestTermData.avg).color}`}>
                  {latestTermData.avg}%
                </p>
                <span className={`text-sm font-semibold ${getGrade(latestTermData.avg).color}`}>
                  {getGrade(latestTermData.avg).label}
                </span>
              </div>
            ) : <p className="text-2xl font-bold mt-1 text-muted-foreground">N/A</p>}
            {overallTrend != null && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${overallTrend > 0 ? 'text-emerald-600' : overallTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {overallTrend > 0 ? <TrendingUp className="w-3 h-3" /> : overallTrend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                <span>{overallTrend > 0 ? '+' : ''}{overallTrend}% from last term</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Terms Recorded</p>
            <p className="text-2xl font-bold mt-1">{terms.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Subjects Tracked</p>
            <p className="text-2xl font-bold mt-1">{subjectTrendData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall average per term line chart */}
      {termOverallData.length > 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Average Per Term</CardTitle>
            <CardDescription>Your cumulative performance across all terms</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={termOverallData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#3b82f6' }}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Latest term subject breakdown bar chart */}
      {latestTermData && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subject Performance — {latestTermData.term}</CardTitle>
            <CardDescription>Your grades by subject in the most recent term</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const latestSubjectData = termSubjectGrades
                .filter(t => t.term === latestTermData.term)
                .map(t => {
                  const subj = subjects.find(s => s.id === t.subjectId);
                  const name = subj?.name || t.subjectId;
                  return {
                    subject: name.length > 12 ? name.slice(0, 12) + '…' : name,
                    fullName: name,
                    avg: Math.round(t.weightedAverage),
                  };
                }).sort((a, b) => b.avg - a.avg);

              return (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={latestSubjectData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      formatter={(v, _, props) => [`${v}%`, props.payload.fullName]}
                      labelFormatter={() => ''}
                    />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {latestSubjectData.map((entry, idx) => (
                        <Cell key={idx} fill={getColor(entry.avg)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Per-subject trend cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Subject Trends Across Terms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectTrendData.map(({ subject, termPoints, latestAvg, trend }) => (
            <Card key={subject.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{subject.name}</CardTitle>
                  <div className="text-right">
                    {latestAvg != null && (
                      <span className={`text-lg font-bold ${getGrade(latestAvg).color}`}>{latestAvg}%</span>
                    )}
                    {trend != null && (
                      <div className={`flex items-center justify-end gap-1 text-xs ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        <span>{trend > 0 ? '+' : ''}{trend}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {termPoints.length > 1 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={termPoints}>
                      <XAxis dataKey="term" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip formatter={v => `${v}%`} />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        stroke={getColor(latestAvg || 0)}
                        strokeWidth={2}
                        dot={{ r: 4, fill: getColor(latestAvg || 0) }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Only 1 term recorded — trends will show after more terms
                  </div>
                )}
                {/* Term badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {termPoints.map(tp => (
                    <Badge key={tp.term} variant="outline" className="text-xs">
                      {tp.term}: <span className={`ml-1 font-semibold ${getGrade(tp.avg).color}`}>{tp.avg}%</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}