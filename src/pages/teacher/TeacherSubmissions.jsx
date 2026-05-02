import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ChevronRight, CheckCircle2, Clock, Star, FileText, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TeacherSubmissions() {
  const { schoolUser: user } = useSchoolAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [viewingContent, setViewingContent] = useState(null);

  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    loadData(); 
    // Subscribe to submission updates
    const unsubscribe = base44.entities.Submission.subscribe((event) => {
      if (event.type === 'update' && event.data.schoolId === user.schoolId) {
        loadData();
      }
    });
    return unsubscribe;
  }, [user.schoolId]);

  async function loadData() {
    const [a, s, st] = await Promise.all([
      base44.entities.Assignment.filter({ schoolId: user.schoolId, teacherId: user.id }),
      base44.entities.Submission.filter({ schoolId: user.schoolId }),
      base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student', isArchived: false }),
    ]);
    setAssignments(a || []);
    setSubmissions(s || []);
    setStudents(st || []);
    setLoading(false);
  }

  // Unique classes/subjects from teacher's assignments
  const classes = useMemo(() => {
    const map = {};
    assignments.forEach(a => { if (a.classId) map[a.classId] = a.className; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const subjects = useMemo(() => {
    const map = {};
    assignments.forEach(a => { if (a.subjectId) map[a.subjectId] = a.subjectName; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const filteredAssignments = useMemo(() => assignments.filter(a => {
    if (filterClass !== 'all' && a.classId !== filterClass) return false;
    if (filterSubject !== 'all' && a.subjectId !== filterSubject) return false;
    return true;
  }), [assignments, filterClass, filterSubject]);

  // Build a map of submissionsByAssignmentId
  const submissionMap = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!map[s.assignmentId]) map[s.assignmentId] = [];
      map[s.assignmentId].push(s);
    });
    return map;
  }, [submissions]);

  // Students enrolled in the selected assignment's class
  const assignmentStudents = useMemo(() => {
    if (!selectedAssignment) return [];
    return students.filter(s => s.classId === selectedAssignment.classId);
  }, [selectedAssignment, students]);

  const assignmentSubs = useMemo(() => {
    if (!selectedAssignment) return [];
    return submissionMap[selectedAssignment.id] || [];
  }, [selectedAssignment, submissionMap]);

  const submittedIds = useMemo(() => new Set(assignmentSubs.map(s => s.studentId)), [assignmentSubs]);

  const displayStudents = useMemo(() => {
    const all = assignmentStudents.map(st => ({
      student: st,
      submission: assignmentSubs.find(s => s.studentId === st.id) || null,
    }));
    if (filterStatus === 'submitted') return all.filter(r => r.submission);
    if (filterStatus === 'pending') return all.filter(r => !r.submission);
    if (filterStatus === 'graded') return all.filter(r => r.submission?.isGraded);
    return all;
  }, [assignmentStudents, assignmentSubs, filterStatus]);

  function openGrading(submission, student) {
    setGradingSubmission({ submission, student });
    setScore(submission.score != null ? String(submission.score) : '');
    setFeedback(submission.feedback || '');
  }

  async function handleGrade(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const assignment = selectedAssignment;
      const termValue = assignment.term || 'General';

      // Update submission
      await base44.entities.Submission.update(gradingSubmission.submission.id, {
        score: Number(score),
        feedback,
        isGraded: true,
      });

      // Check if a Grade record already exists for this student/subject/assignment (re-grading case)
      const existingGrades = await base44.entities.Grade.filter({
        schoolId: user.schoolId,
        studentId: gradingSubmission.student.id,
        subjectId: assignment.subjectId,
        term: termValue,
        description: `Assignment: ${assignment.id}`,
      });

      let gradeId;
      const gradeData = {
        schoolId: user.schoolId,
        studentId: gradingSubmission.student.id,
        studentName: gradingSubmission.student.fullName,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
        teacherId: user.id,
        assessmentType: 'assignment',
        score: Number(score),
        maxScore: assignment.maxScore,
        comment: feedback,
        term: termValue,
        description: `Assignment: ${assignment.id}`,
        lastUpdatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };

      if (existingGrades.length > 0) {
        await base44.entities.Grade.update(existingGrades[0].id, gradeData);
        gradeId = existingGrades[0].id;
      } else {
        const newGrade = await base44.entities.Grade.create(gradeData);
        gradeId = newGrade?.id;
      }

      // Trigger weighted average recalculation + notifications via V2
      await base44.functions.invoke('onGradeSubmittedV2', {
        gradeId,
        schoolId: user.schoolId,
        studentId: gradingSubmission.student.id,
        teacherId: user.id,
        subjectId: assignment.subjectId,
        term: termValue,
      });

      setSaving(false);
      setGradingSubmission(null);
    } catch (error) {
      console.error('Error grading submission:', error);
      setSaving(false);
    }
  }

  // Stats for selected assignment
  const stats = useMemo(() => {
    if (!selectedAssignment) return null;
    const total = assignmentStudents.length;
    const submitted = assignmentSubs.length;
    const graded = assignmentSubs.filter(s => s.isGraded).length;
    const avgScore = assignmentSubs.filter(s => s.isGraded && s.score != null && selectedAssignment.maxScore > 0)
      .reduce((acc, s, _, arr) => acc + (s.score / selectedAssignment.maxScore) * 100 / arr.length, 0);
    return { total, submitted, graded, avgScore: Math.round(avgScore) };
  }, [selectedAssignment, assignmentStudents, assignmentSubs]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Submissions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterClass} onValueChange={v => { setFilterClass(v); setSelectedAssignment(null); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setSelectedAssignment(null); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedAssignment && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Students" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Not Submitted</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment list */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assignments ({filteredAssignments.length})</p>
          {filteredAssignments.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No assignments found.</p>
          )}
          {filteredAssignments.map(a => {
            const subs = submissionMap[a.id] || [];
            const graded = subs.filter(s => s.isGraded).length;
            const isActive = selectedAssignment?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => { setSelectedAssignment(a); setFilterStatus('all'); }}
                className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent ${isActive ? 'border-primary bg-primary/5' : 'bg-card'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.subjectName} · {a.className}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">{subs.length} submitted</span>
                  {graded > 0 && <span className="text-xs text-emerald-600">{graded} graded</span>}
                  {a.dueDate && <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submission detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedAssignment ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <FileText className="w-10 h-10 opacity-30" />
              <p>Select an assignment to view submissions</p>
            </div>
          ) : (
            <>
              {/* Assignment header + stats */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">{selectedAssignment.title}</h2>
                      <p className="text-sm text-muted-foreground">{selectedAssignment.subjectName} · {selectedAssignment.className}</p>
                      {selectedAssignment.description && <p className="text-sm mt-2 text-foreground/80">{selectedAssignment.description}</p>}
                    </div>
                    <Badge variant="outline">Max: {selectedAssignment.maxScore} pts</Badge>
                  </div>
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        { label: 'Students', value: stats.total, color: 'text-blue-600' },
                        { label: 'Submitted', value: stats.submitted, color: 'text-emerald-600' },
                        { label: 'Graded', value: stats.graded, color: 'text-purple-600' },
                        { label: 'Avg Score', value: stats.graded > 0 ? `${stats.avgScore}%` : '—', color: 'text-amber-600' },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student rows */}
              <div className="space-y-2">
                {displayStudents.map(({ student, submission }) => {
                  const pct = submission?.isGraded && submission.score != null && selectedAssignment.maxScore > 0
                    ? Math.round((submission.score / selectedAssignment.maxScore) * 100) : null;
                  return (
                    <Card key={student.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                              {student.fullName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{student.fullName}</p>
                              {submission ? (
                                <p className="text-xs text-muted-foreground">
                                  Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : ''}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Not submitted</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {!submission && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                            )}
                            {submission && !submission.isGraded && (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">Needs Grading</Badge>
                            )}
                            {submission?.isGraded && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {submission.score}/{selectedAssignment.maxScore} ({pct}%)
                              </Badge>
                            )}
                            {submission && (submission.content || submission.fileUrl) && (
                              <Button size="sm" variant="ghost" onClick={() => setViewingContent(submission)}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            )}
                            {submission && (
                              <Button size="sm" variant={submission.isGraded ? "outline" : "default"} onClick={() => openGrading(submission, student)}>
                                <Star className="w-3.5 h-3.5 mr-1" /> {submission.isGraded ? 'Re-grade' : 'Grade'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {submission?.feedback && (
                          <div className="mt-3 ml-12 text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
                            <span className="font-medium text-foreground">Feedback: </span>{submission.feedback}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grading Dialog */}
      <Dialog open={!!gradingSubmission} onOpenChange={open => !open && setGradingSubmission(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          {gradingSubmission && (
            <form onSubmit={handleGrade} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Student: <span className="font-medium text-foreground">{gradingSubmission.student.fullName}</span>
              </p>
              <div className="space-y-2">
                <Label>Score (out of {selectedAssignment?.maxScore})</Label>
                <Input
                  type="number"
                  min={0}
                  max={selectedAssignment?.maxScore}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder={`0 – ${selectedAssignment?.maxScore}`}
                  required
                />
                {score !== '' && selectedAssignment?.maxScore > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {Math.round((Number(score) / selectedAssignment.maxScore) * 100)}%
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Feedback (optional)</Label>
                <Textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Write feedback for the student…"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Grade
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Content Dialog */}
      <Dialog open={!!viewingContent} onOpenChange={open => !open && setViewingContent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submission Content</DialogTitle></DialogHeader>
          {viewingContent?.content && (
            <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/20"
              dangerouslySetInnerHTML={{ __html: viewingContent.content }} />
          )}
          {viewingContent?.fileUrl && (
            <a href={viewingContent.fileUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-primary underline text-sm mt-2">
              <ExternalLink className="w-4 h-4" /> Open Submitted File
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}