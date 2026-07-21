import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';
import { getGradeLabel, getBarColor } from '@/lib/gradeMapper';
import { getStudentSubjects } from '@/lib/streamUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

const ASSESSMENT_LABELS = {
  exam: 'Exam',
  test: 'Test',
  quiz: 'Quiz',
  assignment: 'Assignment',
  classwork: 'Classwork',
};

export default function StudentSubjects() {
  const { schoolUser: user } = useSchoolAuth();
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradeCategories, setGradeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      try {
        const [allSubjects, grd, cats, classList] = await Promise.all([
          base44.entities.Subject.filter({ schoolId: user.schoolId }),
          base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }),
          base44.entities.GradeCategory.filter({ schoolId: user.schoolId, classId: user.classId }),
          base44.entities.SchoolClass.filter({ schoolId: user.schoolId }),
        ]);
        const classObj = (classList || []).find(c => c.id === user.classId);
        // Filter subjects by stream (core + student's stream for SSS; all for JSS)
        const classSubjects = getStudentSubjects(user, classObj, (allSubjects || []).filter(s => !s.isArchived));
        setSubjects(classSubjects);
        setGrades(grd || []);
        setGradeCategories(cats || []);
      } catch {
        setSubjects([]);
        setGrades([]);
        setGradeCategories([]);
      }
      setLoading(false);
    }
    load();
  }, [user?.id, user?.schoolId, user?.classId]);

  // Build per-subject summary with weighted averages
  const subjectSummaries = useMemo(() => {
    return subjects.map(subject => {
      const subjectGrades = grades.filter(g => g.subjectId === subject.id);
      const cats = gradeCategories.filter(c => c.subjectId === subject.id);
      const { overall, breakdown, hasWeights } = getSubjectFinalGrade(subjectGrades, cats);

      // Sort grades by date for trend
      const sortedGrades = [...subjectGrades].sort((a, b) =>
        new Date(a.lastUpdatedAt || a.created_date) - new Date(b.lastUpdatedAt || b.created_date)
      );

      // Category breakdown for display
      const categoryBreakdown = breakdown.length > 0
        ? breakdown
        : (() => {
            // Fallback: simple grouping by assessmentType
            const grouped = {};
            subjectGrades.forEach(g => {
              const t = g.assessmentType || 'other';
              if (!grouped[t]) grouped[t] = [];
              grouped[t].push(pct(g.score, g.maxScore));
            });
            return Object.entries(grouped).map(([type, pcts]) => ({
              categoryName: ASSESSMENT_LABELS[type] || type,
              assessmentType: type,
              weight: null,
              categoryAvg: pcts.length > 0 ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null,
              count: pcts.length,
              contribution: null,
            }));
          })();

      // Trend: latest vs previous
      const validGrades = sortedGrades.filter(g => g.maxScore > 0);
      let trend = 0;
      if (validGrades.length >= 2) {
        trend = pct(validGrades[validGrades.length - 1].score, validGrades[validGrades.length - 1].maxScore) -
                pct(validGrades[validGrades.length - 2].score, validGrades[validGrades.length - 2].maxScore);
      }

      return {
        subject,
        grades: sortedGrades,
        weightedAvg: overall,
        hasWeights,
        breakdown: categoryBreakdown,
        trend,
        assessmentCount: subjectGrades.length,
      };
    }).sort((a, b) => (b.weightedAvg || 0) - (a.weightedAvg || 0));
  }, [subjects, grades, gradeCategories]);

  const overallAvg = useMemo(() => {
    const valid = subjectSummaries.filter(s => s.weightedAvg != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((sum, s) => sum + s.weightedAvg, 0) / valid.length);
  }, [subjectSummaries]);

  const [letterGrade, setLetterGrade] = useState(null);
  useEffect(() => {
    if (overallAvg != null && user?.schoolId) {
      getGradeLabel(overallAvg, user.schoolId).then(setLetterGrade);
    } else {
      setLetterGrade(null);
    }
  }, [overallAvg, user?.schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const chartData = subjectSummaries
    .filter(s => s.weightedAvg != null)
    .map(s => ({
      subject: s.subject.name.length > 10 ? s.subject.name.slice(0, 10) + '…' : s.subject.name,
      fullName: s.subject.name,
      avg: s.weightedAvg,
    }));

  return (
    <div className="space-y-6 p-3 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">My Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">Academic history and grades for each subject in your class</p>
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overall Weighted Average</p>
            {overallAvg != null ? (
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold" style={{ color: getBarColor(overallAvg) }}>{overallAvg}%</p>
                {letterGrade && <span className={`text-lg font-bold ${letterGrade.color}`}>{letterGrade.label}</span>}
              </div>
            ) : (
              <p className="text-2xl font-bold mt-2 text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Subjects</p>
            <p className="text-3xl font-bold mt-2">{subjects.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Assessments</p>
            <p className="text-3xl font-bold mt-2">{grades.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weighted averages bar chart */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Weighted Average by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value, _, props) => [`${value}%`, props.payload.fullName]} labelFormatter={() => ''} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={getBarColor(entry.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Subject list */}
      <div className="space-y-3">
        {subjects.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No subjects are assigned to your class yet.</p>
            </CardContent>
          </Card>
        ) : (
          subjectSummaries.map(({ subject, grades: subjectGrades, weightedAvg, hasWeights, breakdown, trend, assessmentCount }) => {
            const isExpanded = expandedSubject === subject.id;
            return (
              <Card key={subject.id} className="border-0 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.code && <span>{subject.code} · </span>}
                        {assessmentCount} assessment{assessmentCount !== 1 ? 's' : ''}
                        {hasWeights ? ' · Weighted' : ' · Simple avg'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {weightedAvg != null ? (
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: getBarColor(weightedAvg) }}>{weightedAvg}%</p>
                        {trend !== 0 && (
                          <div className={`flex items-center gap-0.5 text-xs ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(trend)}%
                          </div>
                        )}
                        {trend === 0 && assessmentCount >= 2 && (
                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Minus className="w-3 h-3" />0%
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">No grades</Badge>
                    )}
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
                    {subject.description && (
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    )}

                    {/* Category breakdown */}
                    {breakdown.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Assessment Breakdown</p>
                        <div className="space-y-2">
                          {breakdown.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-2">
                              <div>
                                <span className="font-medium">{cat.categoryName}</span>
                                {cat.weight != null && <span className="text-muted-foreground ml-2">({cat.weight}% weight)</span>}
                                <span className="text-muted-foreground ml-2">· {cat.count} grade{cat.count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="text-right">
                                {cat.categoryAvg != null ? (
                                  <span className="font-medium" style={{ color: getBarColor(cat.categoryAvg) }}>{Math.round(cat.categoryAvg)}%</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No grades</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grade history */}
                    <div>
                      <p className="text-sm font-medium mb-2">Grade History</p>
                      {subjectGrades.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No grades recorded for this subject yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {subjectGrades.map(g => {
                            const percentage = pct(g.score, g.maxScore);
                            return (
                              <div key={g.id} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-2">
                                <div className="min-w-0">
                                  <span className="font-medium">{ASSESSMENT_LABELS[g.assessmentType] || g.assessmentType || 'Assessment'}</span>
                                  {g.term && <span className="text-muted-foreground ml-2">· {g.term}</span>}
                                  {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-xs text-muted-foreground">{g.score}/{g.maxScore}</span>
                                  <span className="font-bold" style={{ color: getBarColor(percentage) }}>{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}