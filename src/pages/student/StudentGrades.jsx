import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp } from 'lucide-react';
import { getGradeLabel } from '@/lib/gradeMapper';

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export default function StudentGrades() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeLabels, setGradeLabels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [g, s] = await Promise.all([
          base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: user?.id }),
          base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
        ]);
        setGrades(g || []);
        setSubjects(s || []);
      } catch { 
        setGrades([]);
        setSubjects([]);
      }
      setLoading(false);
    }
    load();

    // Subscribe to grade updates
    const unsubscribe = base44.entities.Grade.subscribe((event) => {
      if (event.data?.studentId === user?.id && event.data?.schoolId === user?.schoolId) {
        load(); // Refresh grades on any update
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.schoolId]);

  // Load grade labels for all unique percentages using school rubric
  useEffect(() => {
    if (!user?.schoolId || !grades.length) return;
    const percentages = new Set();
    grades.forEach(g => { if (g.maxScore > 0) percentages.add(Math.round((g.score / g.maxScore) * 100)); });
    Promise.all([...percentages].map(async p => [p, await getGradeLabel(p, user.schoolId)]))
      .then(entries => setGradeLabels(Object.fromEntries(entries)));
  }, [grades, user?.schoolId]);

  const getLabelForPct = (p) => gradeLabels[p] || { label: '…', color: 'text-muted-foreground' };

  // Group grades by subject and calculate averages
  const groupedBySubject = {};
  grades.forEach(g => {
    if (!groupedBySubject[g.subjectName]) {
      groupedBySubject[g.subjectName] = { grades: [], subjectId: g.subjectId };
    }
    groupedBySubject[g.subjectName].grades.push(g);
  });

  // Calculate subject averages
  const subjectAverages = Object.entries(groupedBySubject).map(([name, data]) => {
    const avg = Math.round(data.grades.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / data.grades.length);
    return { name, avg, grades: data.grades, subjectId: data.subjectId };
  });

  const overallAverage = subjectAverages.length > 0
    ? Math.round(subjectAverages.reduce((sum, s) => sum + s.avg, 0) / subjectAverages.length)
    : null;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">My Grades</h1>
        
        {grades.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No grades recorded yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                    <p className="text-xs text-muted-foreground">Overall Average</p>
                    <p className={`text-3xl font-bold mt-0.5 ${getLabelForPct(overallAverage).color}`}>
                      {overallAverage !== null ? `${overallAverage}%` : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subject Breakdown */}
            <div className="space-y-4">
              {subjectAverages.map(({ name, avg, grades: subjectGrades }) => {
                const { label, color } = getLabelForPct(avg);
                return (
                  <Card key={name} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{name}</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${color}`}>{avg}%</span>
                          <Badge className={`text-sm px-2 py-1 ${color} bg-opacity-10`}>{label}</Badge>
                        </div>
                      </div>
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
                                  <TableCell className="capitalize text-xs">{g.assessmentType}</TableCell>
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
    </div>
  );
}