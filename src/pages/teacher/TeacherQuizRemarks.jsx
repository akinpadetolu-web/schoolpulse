import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, MessageSquare, CheckCircle2, Star, ClipboardList, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TeacherQuizRemarks() {
  const { schoolUser: user } = useSchoolAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [reviewing, setReviewing] = useState(null); // { submission, quiz }
  const [shortScores, setShortScores] = useState({});
  const [shortFeedbacks, setShortFeedbacks] = useState({});
  const [remarkText, setRemarkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [q, s] = await Promise.all([
      base44.entities.Quiz.filter({ schoolId: user.schoolId, teacherId: user.id, isArchived: false }),
      base44.entities.QuizSubmission.filter({ schoolId: user.schoolId }),
    ]);
    setQuizzes(q || []);
    setSubmissions(s || []);
    setLoading(false);
  }

  // Submissions for selected quiz that need attention (ungraded short answers OR remark requested)
  const quizSubmissions = submissions.filter(s =>
    s.quizId === selectedQuiz?.id && (!s.isGraded || s.remarkRequested)
  );

  function openReview(submission) {
    const quiz = quizzes.find(q => q.id === submission.quizId);
    setReviewing({ submission, quiz });
    // Pre-fill existing short answer grades
    const existing = {};
    const existingFb = {};
    (submission.shortAnswerGrades || []).forEach(g => {
      existing[g.questionIndex] = g.teacherScore ?? g.aiScore ?? '';
      existingFb[g.questionIndex] = g.teacherFeedback || g.aiFeedback || '';
    });
    setShortScores(existing);
    setShortFeedbacks(existingFb);
    setRemarkText(submission.teacherRemark || '');
  }

  const shortAnswerQuestions = (reviewing?.quiz?.questions || [])
    .map((q, i) => ({ ...q, idx: i }))
    .filter(q => q.type === 'short_answer');

  async function handleAiGrade() {
    if (!reviewing) return;
    setAiGrading(true);
    const { submission, quiz } = reviewing;
    const newScores = { ...shortScores };
    const newFbs = { ...shortFeedbacks };

    for (const q of shortAnswerQuestions) {
      const studentAnswer = (submission.answers || []).find(a => a.questionIndex === q.idx)?.answer || '';
      if (!studentAnswer.trim()) {
        newScores[q.idx] = 0;
        newFbs[q.idx] = 'No answer provided.';
        continue;
      }
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a fair and understanding teacher grading a student's short answer.

Question: "${q.question}"
Model Answer: "${q.correctAnswer}"
Student's Answer: "${studentAnswer}"
Maximum Points: ${q.points || 1}

Evaluate whether the student's answer captures the same GENERAL IDEA and KEY CONCEPTS as the model answer — even if worded completely differently. Do NOT penalise for different phrasing, synonyms, or word order. Award full marks if the core meaning is correct.

Return a JSON with:
- score: number (0 to ${q.points || 1}, decimals allowed)
- feedback: string (1-2 sentences, encouraging, explaining what was right or missing)`,
          response_json_schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              feedback: { type: 'string' }
            }
          }
        });
        newScores[q.idx] = result.score;
        newFbs[q.idx] = result.feedback;
      } catch {
        newScores[q.idx] = 0;
        newFbs[q.idx] = 'Could not auto-grade. Please grade manually.';
      }
    }

    setShortScores(newScores);
    setShortFeedbacks(newFbs);
    setAiGrading(false);
    toast.success('AI grading complete! Review and adjust before saving.');
  }

  async function handleSave() {
    if (!reviewing) return;
    setSaving(true);
    const { submission, quiz } = reviewing;

    // Build updated shortAnswerGrades
    const shortAnswerGrades = shortAnswerQuestions.map(q => {
      const existing = (submission.shortAnswerGrades || []).find(g => g.questionIndex === q.idx) || {};
      return {
        questionIndex: q.idx,
        aiScore: existing.aiScore ?? null,
        teacherScore: shortScores[q.idx] !== '' ? Number(shortScores[q.idx]) : null,
        aiFeedback: existing.aiFeedback || '',
        teacherFeedback: shortFeedbacks[q.idx] || '',
      };
    });

    // Recalculate total score: MCQ/TF auto + short answer teacher scores
    let totalScore = 0;
    (quiz.questions || []).forEach((q, idx) => {
      const pts = q.points || 1;
      if (q.type !== 'short_answer') {
        const ans = (submission.answers || []).find(a => a.questionIndex === idx)?.answer || '';
        if (ans === q.correctAnswer) totalScore += pts;
      } else {
        const saGrade = shortAnswerGrades.find(g => g.questionIndex === idx);
        totalScore += saGrade?.teacherScore ?? 0;
      }
    });

    await base44.entities.QuizSubmission.update(submission.id, {
      shortAnswerGrades,
      score: totalScore,
      isGraded: true,
      remarkRequested: false,
      teacherRemark: remarkText.trim() || null,
      remarkResolvedAt: new Date().toISOString(),
    });

    // Upsert a Grade record so all grading views update immediately
    const quizMaxScore = (quiz.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
    const gradePayload = {
      schoolId: submission.schoolId,
      studentId: submission.studentId,
      studentName: submission.studentName,
      classId: submission.classId || '',
      subjectId: quiz.subjectId,
      subjectName: quiz.subjectName,
      teacherId: user.id,
      assessmentType: 'quiz',
      score: totalScore,
      maxScore: quizMaxScore,
      term: '',
      comment: remarkText.trim() || `Quiz: ${quiz.title}`,
      description: `Quiz: ${quiz.id}`,
      lastUpdatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };
    const existingGrade = await base44.entities.Grade.filter({
      schoolId: submission.schoolId,
      studentId: submission.studentId,
      description: `Quiz: ${quiz.id}`,
    });
    if (existingGrade.length > 0) {
      await base44.entities.Grade.update(existingGrade[0].id, gradePayload);
    } else {
      await base44.entities.Grade.create(gradePayload);
    }

    toast.success('Submission graded & remark saved!');
    setSaving(false);
    setReviewing(null);
    loadData();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Quizzes that have ungraded short-answer subs OR pending remarks
  const actionableQuizzes = quizzes.filter(q => {
    const subs = submissions.filter(s => s.quizId === q.id);
    return subs.some(s => !s.isGraded || s.remarkRequested);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Quiz Remarks & Grading
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review short answers, grade them with AI assistance, and respond to remark requests</p>
      </div>

      {actionableQuizzes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>All submissions are graded. No pending remarks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quizzes Needing Attention</p>
            {actionableQuizzes.map(quiz => {
              const subs = submissions.filter(s => s.quizId === quiz.id);
              const ungraded = subs.filter(s => !s.isGraded).length;
              const remarks = subs.filter(s => s.remarkRequested).length;
              return (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedQuiz(quiz)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent ${selectedQuiz?.id === quiz.id ? 'border-primary bg-primary/5' : 'bg-card'}`}
                >
                  <p className="font-medium text-sm truncate">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{quiz.className} · {quiz.subjectName}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {ungraded > 0 && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{ungraded} ungraded</Badge>}
                    {remarks > 0 && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{remarks} remark{remarks > 1 ? 's' : ''}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submissions */}
          <div className="lg:col-span-2 space-y-3">
            {!selectedQuiz ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <ClipboardList className="w-10 h-10 opacity-30" />
                <p>Select a quiz to view submissions</p>
              </div>
            ) : quizSubmissions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All submissions for this quiz are graded.</p>
              </div>
            ) : (
              quizSubmissions.map(sub => (
                <Card key={sub.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{sub.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {sub.submittedAt ? format(new Date(sub.submittedAt), 'MMM d, yyyy h:mm a') : ''}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {!sub.isGraded && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Needs Grading</Badge>}
                        {sub.remarkRequested && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs gap-1">
                            <MessageSquare className="w-3 h-3" /> Remark Requested
                          </Badge>
                        )}
                        {sub.isGraded && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Score: {sub.score}/{sub.maxScore}</Badge>}
                      </div>
                      {sub.remarkReason && (
                        <p className="text-xs text-blue-700 mt-1 italic">"{sub.remarkReason}"</p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => openReview(sub)}>
                      <Star className="w-3.5 h-3.5 mr-1" /> Review
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewing} onOpenChange={open => !open && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review: {reviewing?.submission?.studentName}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-5">
              {/* Remark reason */}
              {reviewing.submission.remarkReason && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Student's Remark Reason:</p>
                  <p className="text-sm text-blue-800">"{reviewing.submission.remarkReason}"</p>
                </div>
              )}

              {/* All questions */}
              <div className="space-y-4">
                {(reviewing.quiz?.questions || []).map((q, idx) => {
                  const studentAns = (reviewing.submission.answers || []).find(a => a.questionIndex === idx)?.answer || '';
                  const isShort = q.type === 'short_answer';
                  const autoCorrect = q.type !== 'short_answer' && studentAns === q.correctAnswer;
                  const autoWrong = q.type !== 'short_answer' && studentAns !== q.correctAnswer;

                  return (
                    <div key={idx} className={`rounded-lg border p-4 space-y-2 ${isShort ? 'border-primary/30 bg-primary/5' : autoCorrect ? 'border-emerald-200 bg-emerald-50' : autoWrong ? 'border-red-200 bg-red-50' : ''}`}>
                      <p className="text-sm font-medium">{idx + 1}. {q.question} <span className="text-muted-foreground font-normal">({q.points || 1} pt{q.points !== 1 ? 's' : ''})</span></p>

                      {!isShort && (
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">Student: </span><span className={autoCorrect ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>{studentAns || '(no answer)'}</span></p>
                          <p><span className="text-muted-foreground">Correct: </span><span className="text-emerald-700 font-medium">{q.correctAnswer}</span></p>
                        </div>
                      )}

                      {isShort && (
                        <div className="space-y-2">
                          <div className="text-xs bg-white rounded border p-2">
                            <p className="text-muted-foreground mb-1">Student's answer:</p>
                            <p className="text-foreground">{studentAns || '(no answer)'}</p>
                          </div>
                          <div className="text-xs bg-white rounded border p-2">
                            <p className="text-muted-foreground mb-1">Model answer:</p>
                            <p className="text-foreground">{q.correctAnswer}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Score (0–{q.points || 1})</label>
                              <Input
                                type="number"
                                min={0}
                                max={q.points || 1}
                                step={0.5}
                                value={shortScores[idx] ?? ''}
                                onChange={e => setShortScores({ ...shortScores, [idx]: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Feedback</label>
                              <Input
                                value={shortFeedbacks[idx] || ''}
                                onChange={e => setShortFeedbacks({ ...shortFeedbacks, [idx]: e.target.value })}
                                placeholder="Optional note..."
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Grade Button */}
              {shortAnswerQuestions.length > 0 && (
                <Button variant="outline" onClick={handleAiGrade} disabled={aiGrading} className="w-full gap-2">
                  {aiGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
                  {aiGrading ? 'AI is grading...' : 'Auto-grade Short Answers with AI'}
                </Button>
              )}

              {/* Teacher Remark */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-semibold">Teacher Remark / Overall Feedback</label>
                <Textarea
                  rows={3}
                  placeholder="Write an overall remark for the student (optional)..."
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  className="resize-none"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save & Mark as Graded
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}