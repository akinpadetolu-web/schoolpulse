import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateWeightedScore } from '@/lib/gradeWeightCalculator';

function gradeLabel(p) {
  if (p >= 70) return { label: "A", color: "#10b981" };
  if (p >= 60) return { label: "B", color: "#3b82f6" };
  if (p >= 50) return { label: "C", color: "#f59e0b" };
  if (p >= 40) return { label: "D", color: "#f97316" };
  return { label: "F", color: "#ef4444" };
}

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export default function StudentGradeTrends() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [gradeCategories, setGradeCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [g, cats] = await Promise.all([
          base44.entities.Grade.filter({
            schoolId: user?.schoolId,
            studentId: user?.id,
          }),
          base44.entities.GradeCategory.filter({
            schoolId: user?.schoolId,
            classId: user?.classId,
          }),
        ]);
        setGrades(g || []);
        setGradeCategories(cats || []);
      } catch {
        setGrades([]);
        setGradeCategories([]);
      }
      setLoading(false);
    }
    load();

    const unsubscribe = base44.entities.Grade.subscribe((event) => {
      if (event.data?.studentId === user?.id && event.data?.schoolId === user?.schoolId) {
        load();
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.schoolId, user?.classId]);

  // Group by subject and calculate trend data — remember raw percentages for trend lines
  const groupedBySubject = {};
  grades.forEach(g => {
    if (!groupedBySubject[g.subjectName]) {
      groupedBySubject[g.subjectName] = [];
    }
    groupedBySubject[g.subjectName].push({
      ...g,
      percentage: pct(g.score, g.maxScore),
      date: new Date(g.lastUpdatedAt || g.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(g.lastUpdatedAt || g.created_date),
    });
  });

  // Sort by date and create trend lines
  const trendData = {};
  Object.entries(groupedBySubject).forEach(([subject, subjectGrades]) => {
    const sorted = subjectGrades.sort((a, b) => a.fullDate - b.fullDate);
    trendData[subject] = sorted.map((g, idx) => ({
      index: idx + 1,
      date: g.date,
      percentage: g.percentage,
      type: g.assessmentType,
    }));
  });

  // Calculate subject performance summary using weighted scores
  const subjectSummary = Object.entries(groupedBySubject).map(([name, subjectGrades]) => {
    const subjectId = subjectGrades[0]?.subjectId;
    const { overall: weightedAvg } = calculateWeightedScore(grades, gradeCategories, user?.id, subjectId);
    const avg = weightedAvg || Math.round(subjectGrades.reduce((sum, g) => sum + g.percentage, 0) / subjectGrades.length);
    const latest = subjectGrades[subjectGrades.length - 1];
    const previous = subjectGrades[Math.max(0, subjectGrades.length - 2)];
    const trend = latest.percentage - (previous?.percentage || latest.percentage);
    return {
      name,
      avg,
      latest: latest.percentage,
      trend,
      count: subjectGrades.length,
    };
  }).sort((a, b) => b.avg - a.avg);

  const overallAverage = subjectSummary.length > 0
    ? Math.round(subjectSummary.reduce((sum, s) => sum + s.avg, 0) / subjectSummary.length)
    : null;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (grades.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No grade data available yet. Your trends will appear once you have submitted grades.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Grade Trends</h1>
        <p className="text-muted-foreground">Track your academic progress throughout the term</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overall Average</p>
            <p className="text-3xl font-bold mt-2" style={{ color: gradeLabel(overallAverage).color }}>
              {overallAverage}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Subjects</p>
            <p className="text-3xl font-bold mt-2">{subjectSummary.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Assessments</p>
            <p className="text-3xl font-bold mt-2">{grades.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance Bar Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Performance by Subject</CardTitle>
          <CardDescription>Average grade in each subject</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="avg" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subject Trend Lines */}
      <div className="space-y-4">
        {subjectSummary.map(subject => (
          <Card key={subject.name} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{subject.name}</CardTitle>
                  <CardDescription className="mt-1">{subject.count} assessment(s)</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: gradeLabel(subject.avg).color }}>
                    {subject.avg}%
                  </div>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${subject.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {subject.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{Math.abs(subject.trend)}%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trendData[subject.name] && trendData[subject.name].length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData[subject.name]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => `${value}%`}
                      labelFormatter={(index) => `Assessment ${index}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke={gradeLabel(subject.avg).color} 
                      strokeWidth={2}
                      dot={{ fill: gradeLabel(subject.avg).color, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}