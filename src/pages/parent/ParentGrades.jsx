import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

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
            setSelectedChildId('');
          }

          const [allGrades, allExams] = await Promise.all([
            Promise.all(linkedIds.map(id => base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: id }).catch(() => []))),
            Promise.all(linkedIds.map(id => base44.entities.ExamResult.filter({ schoolId: user?.schoolId, studentId: id }).catch(() => []))),
          ]);
          setGrades(allGrades.flat().filter(Boolean));
          setExamResults(allExams.flat().filter(Boolean));
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

        // Group grades by subject
        const bySubject = {};
        childGrades.forEach(g => {
          if (!bySubject[g.subjectName]) bySubject[g.subjectName] = [];
          bySubject[g.subjectName].push(g);
        });

        // Group exams by subject
        const examsBySubject = {};
        childExams.forEach(e => {
          if (!examsBySubject[e.subjectName]) examsBySubject[e.subjectName] = [];
          examsBySubject[e.subjectName].push(e);
        });

        const overallAvg = childGrades.length > 0
          ? Math.round(childGrades.reduce((sum, g) => sum + ((g.score / (g.maxScore || 100)) * 100), 0) / childGrades.length)
          : null;

        return (
          <Card key={child.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{child.fullName}</CardTitle>
                <div className="flex items-center gap-2">
                  {overallAvg !== null && (
                    <Badge className={`text-sm px-3 py-1 ${overallAvg >= 70 ? 'bg-emerald-100 text-emerald-700' : overallAvg >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      Overall: {overallAvg}%
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
                  {Object.keys(bySubject).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No grade records yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(bySubject).map(([subject, gs]) => {
                        const avg = Math.round(gs.reduce((s, g) => s + ((g.score / (g.maxScore || 100)) * 100), 0) / gs.length);
                        return (
                          <div key={subject}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{subject}</p>
                              <span className={`text-sm font-semibold ${getColor(avg)}`}>{avg}% avg</span>
                            </div>
                            <div className="space-y-1">
                              {gs.map(g => (
                                <div key={g.id} className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/50 rounded px-3 py-1.5">
                                  <span className="capitalize">{g.assessmentType} {g.term ? `• ${g.term}` : ''}</span>
                                  <span className={`font-medium ${getColor((g.score / (g.maxScore || 100)) * 100)}`}>{g.score}/{g.maxScore}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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