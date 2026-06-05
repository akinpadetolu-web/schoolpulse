import React, { useState, useEffect, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Clock, CheckCircle2, Loader2, AlertTriangle, MessageSquare, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

function isQuizAvailable(quiz) {
  if (!quiz.isPublished) return false;
  const now = new Date();
  if (quiz.releaseMode === "manual") return true;
  if (quiz.releaseMode === "scheduled" && quiz.scheduledAt) return new Date(quiz.scheduledAt) <= now;
  if (quiz.releaseMode === "class_start" && quiz.timetableDay && quiz.timetableStartTime) {
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (today !== quiz.timetableDay) return false;
    const [h, m] = quiz.timetableStartTime.split(':').map(Number);
    const classStart = new Date(); classStart.setHours(h, m, 0, 0);
    return now >= classStart;
  }
  if (quiz.releaseMode === "15min_into_class" && quiz.timetableDay && quiz.timetableStartTime) {
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (today !== quiz.timetableDay) return false;
    const [h, m] = quiz.timetableStartTime.split(':').map(Number);
    const classStart = new Date(); classStart.setHours(h, m + 15, 0, 0);
    return now >= classStart;
  }
  return false;
}

function getReleaseLabel(quiz) {
  if (quiz.releaseMode === "manual") return null;
  if (quiz.releaseMode === "scheduled" && quiz.scheduledAt) return `Opens ${new Date(quiz.scheduledAt).toLocaleString()}`;
  if (quiz.releaseMode === "class_start") return `Opens at class start on ${quiz.timetableDay} ${quiz.timetableStartTime}`;
  if (quiz.releaseMode === "15min_into_class") return `Opens 15min into class on ${quiz.timetableDay} ${quiz.timetableStartTime}`;
  return null;
}

export default function StudentQuizzes() {
  const { schoolUser: user } = useSchoolAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const [remarkDialog, setRemarkDialog] = useState(null); // submission
  const [remarkReason, setRemarkReason] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    const [q, s] = await Promise.all([
      base44.entities.Quiz.filter({ schoolId: user.schoolId, classId: user.classId, isArchived: false }),
      base44.entities.QuizSubmission.filter({ schoolId: user.schoolId, studentId: user.id }),
    ]);
    setQuizzes((q || []).filter(qz => qz.isPublished));
    setSubmissions(s || []);
    setLoading(false);
  }

  function startQuiz(quiz) {
    setActiveQuiz(quiz);
    setAnswers({});
    const seconds = (quiz.durationMinutes || 30) * 60;
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(quiz, {}); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() { if (timerRef.current) clearInterval(timerRef.current); }

  async function handleSubmit(quiz, currentAnswers) {
    stopTimer();
    setSubmitting(true);
    const q = quiz || activeQuiz;
    const ans = currentAnswers || answers;

    // Auto-grade MCQ and T/F; AI-grade short answers
    let score = 0;
    let maxScore = 0;
    const answerArray = (q.questions || []).map((question, idx) => {
      const pts = question.points || 1;
      maxScore += pts;
      const studentAnswer = ans[idx] || "";
      if (question.type !== "short_answer" && studentAnswer === question.correctAnswer) score += pts;
      return { questionIndex: idx, answer: studentAnswer };
    });

    // AI-grade short answer questions
    const shortAnswerGrades = [];
    const shortQs = (q.questions || []).filter((qq, i) => qq.type === "short_answer");
    for (const question of shortQs) {
      const idx = (q.questions || []).indexOf(question);
      const studentAnswer = ans[idx] || "";
      const pts = question.points || 1;
      let aiScore = 0;
      let aiFeedback = "No answer provided.";
      if (studentAnswer.trim()) {
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a fair teacher grading a student's short answer.

Question: "${question.question}"
Model Answer: "${question.correctAnswer}"
Student's Answer: "${studentAnswer}"
Maximum Points: ${pts}

Evaluate whether the student's answer captures the same GENERAL IDEA and KEY CONCEPTS as the model answer — even if worded completely differently. Do NOT penalise for different phrasing, synonyms, or word order. Award full marks if the core meaning is correct.

Return JSON with:
- score: number (0 to ${pts})
- feedback: string (1-2 sentences, encouraging)`,
            response_json_schema: {
              type: "object",
              properties: { score: { type: "number" }, feedback: { type: "string" } }
            }
          });
          aiScore = Math.min(pts, Math.max(0, result.score || 0));
          aiFeedback = result.feedback || "";
        } catch {
          aiScore = 0;
          aiFeedback = "Could not auto-grade. Your teacher will review this.";
        }
      }
      score += aiScore;
      shortAnswerGrades.push({ questionIndex: idx, aiScore, teacherScore: null, aiFeedback, teacherFeedback: "" });
    }

    const hasShortAnswers = shortQs.length > 0;

    await base44.entities.QuizSubmission.create({
      schoolId: user.schoolId,
      quizId: q.id,
      quizTitle: q.title,
      studentId: user.id,
      studentName: user.fullName,
      classId: user.classId,
      answers: answerArray,
      shortAnswerGrades,
      score,
      maxScore,
      submittedAt: new Date().toISOString(),
      isGraded: !hasShortAnswers, // short answers need teacher to confirm
    });

    // Sync quiz score to Grade entity so it reflects in the student's grade section
    await base44.entities.Grade.create({
      schoolId: user.schoolId,
      studentId: user.id,
      studentName: user.fullName,
      classId: user.classId,
      subjectId: q.subjectId || "",
      subjectName: q.subjectName || "",
      teacherId: q.teacherId || "",
      assessmentType: "quiz",
      score,
      maxScore,
      term: q.term || "",
      comment: `Quiz: ${q.title}`,
      lastUpdatedAt: new Date().toISOString(),
    });

    toast.success(shortQs.length > 0
      ? `Quiz submitted! AI Score: ${score}/${maxScore}. Short answers will be reviewed by your teacher.`
      : `Quiz submitted! Score: ${score}/${maxScore}`);
    setSubmitting(false);
    setActiveQuiz(null);
    loadData();
  }

  const hasSubmitted = (quizId) => submissions.some(s => s.quizId === quizId);
  const getSubmission = (quizId) => submissions.find(s => s.quizId === quizId);

  async function handleRequestRemark() {
    if (!remarkDialog || !remarkReason.trim()) return;
    setSubmittingRemark(true);
    await base44.entities.QuizSubmission.update(remarkDialog.id, {
      remarkRequested: true,
      remarkReason: remarkReason.trim(),
    });
    toast.success('Remark request sent to your teacher!');
    setSubmittingRemark(false);
    setRemarkDialog(null);
    setRemarkReason('');
    loadData();
  }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading || !user?.id) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your available quizzes</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No quizzes available right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => {
            const available = isQuizAvailable(quiz);
            const submitted = hasSubmitted(quiz.id);
            const sub = getSubmission(quiz.id);
            const releaseLabel = getReleaseLabel(quiz);

            return (
              <Card key={quiz.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-tight">{quiz.title}</h3>
                    {submitted
                      ? <Badge className="bg-emerald-100 text-emerald-700 flex-shrink-0">Done</Badge>
                      : available
                        ? <Badge className="bg-blue-100 text-blue-700 flex-shrink-0">Open</Badge>
                        : <Badge variant="secondary" className="flex-shrink-0">Upcoming</Badge>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{quiz.subjectName}</p>
                  {quiz.description && <p className="text-xs text-muted-foreground mb-2">{quiz.description}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                    <Clock className="w-3 h-3" />{quiz.durationMinutes} min
                    <span className="mx-1">•</span>
                    {(quiz.questions || []).length} questions
                  </p>
                  {!available && releaseLabel && (
                    <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{releaseLabel}
                    </p>
                  )}
                  {submitted && sub && (
                    <div className="space-y-2 mb-2">
                      <div className="bg-emerald-50 rounded-lg p-2 text-xs text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Score: {sub.score}/{sub.maxScore} ({sub.maxScore > 0 ? Math.round(sub.score / sub.maxScore * 100) : 0}%)
                        {!sub.isGraded && <span className="text-amber-600 ml-1">· Pending teacher review</span>}
                      </div>
                      {sub.teacherRemark && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                          <p className="font-semibold text-blue-700 mb-0.5">Teacher's Remark:</p>
                          {sub.teacherRemark}
                        </div>
                      )}
                      {sub.remarkRequested && !sub.teacherRemark && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1">
                          <MessageSquare className="w-3 h-3" /> Remark pending
                        </Badge>
                      )}
                    </div>
                  )}
                  {!submitted && available && (
                    <Button size="sm" className="w-full" onClick={() => startQuiz(quiz)}>
                      Start Quiz
                    </Button>
                  )}
                  {!submitted && !available && (
                    <Button size="sm" className="w-full" disabled variant="outline">Not Available Yet</Button>
                  )}
                  {submitted && sub && !sub.remarkRequested && (
                    <Button size="sm" variant="outline" className="w-full gap-1 text-blue-600 border-blue-300"
                      onClick={() => { setRemarkDialog(sub); setRemarkReason(''); }}>
                      <MessageSquare className="w-3.5 h-3.5" /> Request Remark
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Remark Request Dialog */}
      <Dialog open={!!remarkDialog} onOpenChange={open => !open && setRemarkDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Request a Remark
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tell your teacher why you're requesting a remark for <strong>{remarkDialog?.quizTitle}</strong>.
            </p>
            <Textarea
              rows={3}
              placeholder="e.g. I believe my short answer was correct but phrased differently..."
              value={remarkReason}
              onChange={e => setRemarkReason(e.target.value)}
              className="resize-none"
            />
            <Button
              className="w-full gap-2"
              onClick={handleRequestRemark}
              disabled={submittingRemark || !remarkReason.trim()}
            >
              {submittingRemark ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Submit Remark Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Quiz Dialog */}
      {activeQuiz && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{activeQuiz.title}</span>
                <span className={`font-mono text-base ${timeLeft < 60 ? 'text-destructive' : 'text-primary'}`}>
                  <Clock className="w-4 h-4 inline mr-1" />{formatTime(timeLeft)}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {(activeQuiz.questions || []).map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <p className="font-medium text-sm">{idx + 1}. {q.question} <span className="text-muted-foreground font-normal">({q.points || 1} pt{q.points !== 1 ? 's' : ''})</span></p>

                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${answers[idx] === opt ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-secondary/40'}`}>
                          <input type="radio" name={`q-${idx}`} value={opt} checked={answers[idx] === opt} onChange={() => setAnswers({ ...answers, [idx]: opt })} className="accent-primary" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "true_false" && (
                    <div className="flex gap-3">
                      {["True", "False"].map(v => (
                        <label key={v} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${answers[idx] === v ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-secondary/40'}`}>
                          <input type="radio" name={`q-${idx}`} value={v} checked={answers[idx] === v} onChange={() => setAnswers({ ...answers, [idx]: v })} className="accent-primary" />
                          <span className="text-sm font-medium">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "short_answer" && (
                    <textarea
                      rows={2}
                      placeholder="Type your answer..."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={answers[idx] || ""}
                      onChange={e => setAnswers({ ...answers, [idx]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { stopTimer(); setActiveQuiz(null); }}>Exit</Button>
              <Button onClick={() => handleSubmit(activeQuiz, answers)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit Quiz
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}