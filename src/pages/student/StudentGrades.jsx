import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, Info } from 'lucide-react';
import { getGradeLabel } from '@/lib/gradeMapper';
import { getSubjectFinalGrade, formatBreakdown } from '@/lib/gradeWeightCalculator';

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export default function StudentGrades() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [gradeLabels, setGradeLabels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [g, s, cats] = await Promise.all([
          base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: user?.id }),
          base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
          base44.entities.GradeCategory.filter({ schoolId: user?.schoolId, classId: user?.classId }),
        ]);
        setGrades(g || []);
        setSubjects(s || []);
        setCategories(cats || []);
      } catch {
        setGrades([]);
        setSubjects([]);
        setCategories([]);
      }
      setLoading(false);
    }
    load();

    const unsubGrade = base44.entities.Grade.subscribe((event) => {
      if (event.data?.studentId === user?.id && event.data?.schoolId === user?.schoolId) load();
    });
    const unsubQuiz = base44.entities.QuizSubmission.subscribe((event) => {
      if (event.data?.studentId === user?.id && event.data?.schoolId === user?.schoolId) load();
    });
    const poll = setInterval(load, 5000);
    return () => { unsubGrade(); unsubQuiz(); clearInterval(poll); };
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    if (!user?.schoolId || !grades.length) return;
    const percentages = new Set();
    grades.forEach(g => { if (g.maxScore > 0) percentages.add(Math.round((g.score / g.maxScore) * 100)); });
    Promise.all([...percentages].map(async p => [p, await getGradeLabel(p, user.schoolId)]))
      .then(entries => setGradeLabels(Object.fromEntries(entries)));
  }, [grades, user?.schoolId]);

  const getLabelForPct = (p) => gradeLabels[Math.round(p)] || { label: '…', color: 'text-muted-foreground' };

  // Group by subject name
  const groupedBySubject = useMemo(() => {
    const map = {};
    grades.forEach(g => {
      if (!map[g.subjectId]) map[g.subjectId] = { name: g.subjectName, subjectId: g.subjectId, grades: [] };
      map[g.subjectId].grades.push(g);
    });
    return Object.values(map);
  }, [grades]);

  // Per-subject weighted scores
  const subjectResults = useMemo(() => {
    return groupedBySubject.map(({ name, subjectId, grades: subjectGrades }) => {
      const classCats = categories.filter(c => c.subjectId === subjectId && c.classId === user?.classId);
      const result = getSubjectFinalGrade(subjectGrades, classCats);
      return { name, subjectId, grades: subjectGrades, ...result };
    });
  }, [groupedBySubject, categories, user?.classId]);

  const overallAverage = subjectResults.length > 0
    ? Math.round(subjectResults.reduce((sum, s) => sum + s.overall, 0) / subjectResults.length * 100) / 100
    : null;

  const anyWeighted = subjectResults.some(s => s.hasWeights);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Grades</h1>

      {grades.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No grades recorded yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Grades</p>
                <p className="text-3xl font-bold mt-1">{grades.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Overall Average {anyWeighted && <span className="text-primary">(weighted)</span>}</p>
                  <p className={`text-3xl font-bold mt-0.5 ${getLabelForPct(overallAverage).color}`}>
                    {overallAverage !== null ? `${overallAverage}%` : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Breakdown */}
          <div className="space-y-4">
            {subjectResults.map(({ name, subjectId, grades: subjectGrades, overall, breakdown, hasWeights }) => {
              const { label, color } = getLabelForPct(overall);
              return (
                <Card key={subjectId} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">{name}</CardTitle>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${color}`}>{overall}%</span>
                        <Badge className={`text-sm px-2 py-1 ${color} bg-opacity-10`}>{label}</Badge>
                      </div>
                    </div>

                    {/* Weighted breakdown banner */}
                    {hasWeights && breakdown.length > 0 && (
                      <div className="mt-2 p-3 bg-primary/5 border border-primary/15 rounded-lg text-xs font-mono leading-relaxed">
                        <div className="flex items-center gap-1.5 mb-2 font-sans font-semibold text-primary">
                          <Info className="w-3.5 h-3.5" /> Weight Breakdown
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-foreground">
                          {breakdown.map(b => (
                            <span key={b.assessmentType}>
                              <span className="capitalize font-medium">{b.categoryName}</span>
                              {' '}<span className="text-muted-foreground">{b.weight}%</span>
                              {' '}(<span className={b.categoryAvg !== null && b.categoryAvg > 0 ? 'text-primary font-medium' : 'text-destructive'}>{b.categoryAvg !== null ? b.categoryAvg.toFixed(0) : '—'}</span>)
                              {' → '}<strong className="text-primary">{b.contribution.toFixed(1)}</strong>
                              {b.count === 0 && <span className="text-destructive font-medium"> [no scores]</span>}
                            </span>
                          ))}
                          <span className="font-sans font-bold text-foreground">= {overall}%</span>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead>Comment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectGrades.map(g => {
                            const p = pct(g.score, g.maxScore);
                            const { label: gradeL, color: gradeC } = getLabelForPct(p);
                            return (
                              <TableRow key={g.id}>
                                <TableCell className="capitalize text-xs">
                                  <Badge variant="outline" className="text-xs capitalize">{g.assessmentType}</Badge>
                                  {g.term && <span className="text-muted-foreground ml-1.5 text-xs">{g.term}</span>}
                                </TableCell>
                                <TableCell className="text-right font-medium">{g.score}/{g.maxScore}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-bold ${gradeC}`}>{p}%</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                                  {g.comment || '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}