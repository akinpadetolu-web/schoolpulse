import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const GRADE_COLORS = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444', E: '#dc2626', F: '#7f1d1d' };
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function ExamProgressReport({ child, examResults }) {
  // Filter results for this child
  const childResults = useMemo(() => {
    return examResults.filter(r => r.studentId === child.id);
  }, [examResults, child.id]);

  // Group by subject
  const resultsBySubject = useMemo(() => {
    const grouped = {};
    childResults.forEach(result => {
      if (!grouped[result.subjectName]) {
        grouped[result.subjectName] = [];
      }
      grouped[result.subjectName].push(result);
    });
    return grouped;
  }, [childResults]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (childResults.length === 0) return null;

    const avgScore = Math.round(childResults.reduce((sum, r) => sum + (r.score || 0), 0) / childResults.length);
    const highestScore = Math.max(...childResults.map(r => r.score || 0));
    const lowestScore = Math.min(...childResults.map(r => r.score || 0));
    
    const gradeCounts = {};
    childResults.forEach(r => {
      gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1;
    });

    return { avgScore, highestScore, lowestScore, gradeCounts };
  }, [childResults]);

  // Trend data (grouped by exam and subject)
  const trendData = useMemo(() => {
    const exams = [...new Set(childResults.map(r => r.examName))];
    return exams.map(exam => {
      const data = { exam };
      childResults
        .filter(r => r.examName === exam)
        .forEach(r => {
          data[r.subjectName] = r.score;
        });
      return data;
    });
  }, [childResults]);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.gradeCounts).map(([grade, count]) => ({
      name: grade,
      value: count,
      color: GRADE_COLORS[grade] || '#94a3b8'
    }));
  }, [metrics]);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No exam results available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold text-primary">{metrics.avgScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Highest</p>
            <p className="text-2xl font-bold text-emerald-600">{metrics.highestScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Lowest</p>
            <p className="text-2xl font-bold text-amber-600">{metrics.lowestScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Exams</p>
            <p className="text-2xl font-bold">{childResults.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exam Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="exam" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {Object.keys(resultsBySubject).map((subject, idx) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Grade Distribution */}
      {gradeDistribution.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(resultsBySubject).map(([subject, results]) => {
                const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
                const trend = results.length > 1
                  ? results[results.length - 1].score - results[0].score
                  : 0;
                
                return (
                  <div key={subject} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{subject}</p>
                      <p className="text-xs text-muted-foreground">{results.length} exam(s)</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-semibold">{avgScore}%</span>
                      {trend !== 0 && (
                        <div className={`flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span className="text-xs">{Math.abs(trend)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {childResults
              .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
              .map(result => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{result.examName}</p>
                    <p className="text-xs text-muted-foreground">{result.subjectName} • {result.examTerm}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="secondary" className="font-mono">{result.score}%</Badge>
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: GRADE_COLORS[result.grade] }}
                    >
                      {result.grade}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}