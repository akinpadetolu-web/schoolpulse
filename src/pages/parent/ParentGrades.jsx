import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { calculateWeightedScore } from '@/lib/gradeWeightCalculator';

function getColor(pct) {
  if (pct >= 70) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function ParentGrades() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [grades, setGrades] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
          const linked = (allStudents || []).filter(s => linkedIds.includes(s.id));
          setChildren(linked);
          if (linked.length > 0) {
            setSelectedChildId(linked[0].id);
          }

          const [allGrades, allExams] = await Promise.all([
            Promise.all(linkedIds.map(id => base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: id }).catch(() => []))),
            Promise.all(linkedIds.map(id => base44.entities.ExamResult.filter({ schoolId: user?.schoolId, studentId: id }).catch(() => []))),
          ]);
          setGrades(allGrades.flat().filter(Boolean));
          setExamResults(allExams.flat().filter(Boolean));
          const cats = await base44.entities.GradeCategory.filter({ schoolId: user?.schoolId }).catch(() => []);
          setCategories(cats || []);
          // Subscribe to category updates for real-time weight changes
          base44.entities.GradeCategory.subscribe(() => {
            base44.entities.GradeCategory.filter({ schoolId: user?.schoolId }).then(c => setCategories(c || [])).catch(() => {});
          });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();

    // Subscribe to grade updates for linked children
    const linkedIds = user?.linkedStudentIds || [];
    const unsubGrade = base44.entities.Grade.subscribe((event) => {
      if (linkedIds.includes(event.data?.studentId)) load();
    });
    // Subscribe to quiz submission updates (remark resolved)
    const unsubQuiz = base44.entities.QuizSubmission.subscribe((event) => {
      if (linkedIds.includes(event.data?.studentId)) load();
    });
    // Poll every second for proactive live updates
    const poll = setInterval(load, 1000);
    return () => { unsubGrade(); unsubQuiz(); clearInterval(poll); };
  }, [user?.id, user?.linkedStudentIds, user?.schoolId]);

  async function downloadReport(child) {
    setDownloadingId(child.id);
    try {
      const response = await base44.functions.invoke('downloadSubjectAverageReport', { studentId: child.id });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subject_averages_${child.fullName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
      console.error(error);
    }
    setDownloadingId(null);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (children.length === 0) return <div className="text-center text-muted-foreground py-12">No linked children found.</div>;

  const filteredChildren = selectedChildId ? children.filter(c => c.id === selectedChildId) : children;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Children's Grades</h1>
      
      {children.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by child</label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All Children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Children</SelectItem>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id}>{child.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredChildren.map(child => {
        const childGrades = grades.filter(g => g.studentId === child.id);
        const childExams = examResults.filter(e => e.studentId === child.id);

        // Group grades by subjectId
        const bySubject = {};
        childGrades.forEach(g => {
          const key = g.subjectId || g.subjectName;
          if (!bySubject[key]) bySubject[key] = { name: g.subjectName, subjectId: g.subjectId, grades: [] };
          bySubject[key].grades.push(g);
        });

        // Weighted subject results
        const subjectResults = Object.values(bySubject).map(({ name, subjectId, grades: sg }) => {
          const classCats = categories.filter(c => c.subjectId === subjectId && c.classId === child.classId);
          const result = calculateWeightedScore(childGrades, classCats, child.id, subjectId);
          return { name, subjectId, grades: sg, ...result };
        });

        const overallAvg = subjectResults.length > 0
          ? Math.round(subjectResults.reduce((sum, s) => sum + s.overall, 0) / subjectResults.length)
          : null;

        const anyWeighted = subjectResults.some(s => s.hasWeights);

        // Group exams by subject
        const examsBySubject = {};
        childExams.forEach(e => {
          if (!examsBySubject[e.subjectName]) examsBySubject[e.subjectName] = [];
          examsBySubject[e.subjectName].push(e);
        });

        return (
          <Card key={child.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{child.fullName}</CardTitle>
                <div className="flex items-center gap-2">
                  {overallAvg !== null && (
                    <Badge className={`text-sm px-3 py-1 ${overallAvg >= 70 ? 'bg-emerald-100 text-emerald-700' : overallAvg >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      Overall: {overallAvg}% {anyWeighted && '(weighted)'}
                    </Badge>
                  )}
                  {child.subjectAverages && child.subjectAverages.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadReport(child)}
                      disabled={downloadingId === child.id}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingId === child.id ? 'Downloading...' : 'Report'}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{child.className || 'No class assigned'}</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="classwork">
                <TabsList className="mb-4">
                  <TabsTrigger value="classwork">Classwork & Tests</TabsTrigger>
                  <TabsTrigger value="exams">Exam Results</TabsTrigger>
                </TabsList>

                <TabsContent value="classwork">
                  {subjectResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No grade records yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {subjectResults.map(({ name, subjectId, grades: sg, overall, breakdown, hasWeights }) => (
                        <div key={subjectId}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{name}</p>
                            <span className={`text-sm font-semibold ${getColor(overall)}`}>{overall}% {hasWeights && <span className="text-xs font-normal text-muted-foreground">(weighted)</span>}</span>
                          </div>
                          {hasWeights && breakdown.length > 0 && (
                            <div className="mb-2 text-xs text-muted-foreground bg-muted/40 rounded px-2.5 py-1.5 flex flex-wrap gap-x-2">
                              {breakdown.map(b => (
                                <span key={b.assessmentType}>
                                  {b.categoryName} {b.weight}% ({b.categoryAvg !== null ? b.categoryAvg.toFixed(0) : '—'}) → <strong>{b.contribution.toFixed(1)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="space-y-1">
                            {sg.map(g => (
                              <div key={g.id} className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/50 rounded px-3 py-1.5">
                                <span className="capitalize">{g.assessmentType} {g.term ? `• ${g.term}` : ''}</span>
                                <span className={`font-medium ${getColor((g.score / (g.maxScore || 100)) * 100)}`}>{g.score}/{g.maxScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="exams">
                  {Object.keys(examsBySubject).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No exam results yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(examsBySubject).map(([subject, exams]) => (
                        <div key={subject}>
                          <p className="font-medium text-sm mb-2">{subject}</p>
                          <div className="space-y-1">
                            {exams.map(e => {
                              const pct = Math.round((e.score / (e.maxScore || 100)) * 100);
                              return (
                                <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/50 rounded px-3 py-1.5">
                                  <span>{e.examName} {e.examTerm ? `• ${e.examTerm}` : ''}</span>
                                  <span className={`font-medium ${getColor(pct)}`}>{e.score}/{e.maxScore || 100} ({pct}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}