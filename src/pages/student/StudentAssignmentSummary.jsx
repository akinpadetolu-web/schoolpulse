import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getGradeLabel } from '@/lib/gradeMapper';

export default function StudentAssignmentSummary() {
  const { schoolUser: user } = useSchoolAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradeLabels, setGradeLabels] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.classId || !user?.schoolId) return;
    const [assignmentsList, submissionsList, gradesList] = await Promise.all([
      base44.entities.Assignment.filter({ schoolId: user.schoolId, classId: user.classId, isPublished: true }),
      base44.entities.Submission.filter({ schoolId: user.schoolId, studentId: user.id }),
      base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }),
    ]);
    setAssignments((assignmentsList || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setSubmissions(submissionsList || []);
    setGrades(gradesList || []);
    setLoading(false);
  }, [user?.id, user?.schoolId, user?.classId]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscriptions — mirrors Grades page
  useEffect(() => {
    const unsubGrades = base44.entities.Grade.subscribe((event) => {
      if (event.data?.studentId === user?.id) load();
    });
    const unsubSubs = base44.entities.Submission.subscribe((event) => {
      if (event.data?.studentId === user?.id) load();
    });
    return () => { unsubGrades(); unsubSubs(); };
  }, [user?.id, load]);

  // Resolve grade labels from school rubric
  useEffect(() => {
    if (!user?.schoolId || !grades.length) return;
    const percentages = new Set(
      grades.filter(g => g.maxScore > 0).map(g => Math.round((g.score / g.maxScore) * 100))
    );
    Promise.all([...percentages].map(async p => [p, await getGradeLabel(p, user.schoolId)]))
      .then(entries => setGradeLabels(Object.fromEntries(entries)));
  }, [grades, user?.schoolId]);

  const getLabelForPct = (p) => gradeLabels[p] || { label: '…', color: 'text-muted-foreground', bg: '' };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const submittedIds = new Set(submissions.map(s => s.assignmentId));

  // Build summary: assignments that have a submission or a grade
  const summary = assignments.map(assignment => {
    const submission = submissions.find(s => s.assignmentId === assignment.id);
    const grade = grades.find(g => g.assignmentId === assignment.id);
    return { assignment, submission, grade };
  }).filter(item => item.submission || item.grade);

  // Overall average from all grades (percentage-based, like Grades page)
  const validGrades = grades.filter(g => g.score != null && g.maxScore > 0);
  const averagePct = validGrades.length > 0
    ? Math.round(validGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / validGrades.length)
    : null;
  const avgLabel = averagePct != null ? getLabelForPct(averagePct) : null;

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Assignment Summary</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="text-3xl font-bold mt-1">{submittedIds.size}</p>
            <p className="text-xs text-muted-foreground">of {assignments.length} assignments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Average Score</p>
            {averagePct != null ? (
              <div className="flex items-baseline gap-2 mt-1">
                <p className={`text-3xl font-bold ${avgLabel?.color}`}>{averagePct}%</p>
                <span className={`text-lg font-bold ${avgLabel?.color}`}>{avgLabel?.label}</span>
              </div>
            ) : (
              <p className="text-3xl font-bold mt-1 text-muted-foreground">—</p>
            )}
            <p className="text-xs text-muted-foreground">across all grades</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Graded</p>
            <p className="text-3xl font-bold mt-1">{validGrades.length}</p>
            <p className="text-xs text-muted-foreground">of {submissions.length} submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Assignment list with grades */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Assignments & Feedback
          </CardTitle>
          <CardDescription>Your recent assignment scores and teacher comments</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No submitted assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.map(({ assignment, submission, grade }) => {
                const pct = grade?.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : null;
                const { label, color, bg } = pct != null ? getLabelForPct(pct) : { label: null, color: '', bg: '' };
                return (
                  <div key={assignment.id} className={`p-4 rounded-lg border ${bg || 'bg-muted/20'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{assignment.title}</h4>
                        <p className="text-xs text-muted-foreground">{assignment.subjectName} • {assignment.teacherName}</p>
                      </div>
                      {grade && pct != null && (
                        <div className="text-right shrink-0 ml-3">
                          <p className={`text-lg font-bold ${color}`}>{grade.score}/{grade.maxScore}</p>
                          <p className={`text-xs font-semibold ${color}`}>{pct}% {label}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {submission && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Submitted
                        </Badge>
                      )}
                      {grade?.isGraded && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" /> Graded
                        </Badge>
                      )}
                      {grade?.assessmentType && (
                        <Badge variant="outline" className="text-xs capitalize">{grade.assessmentType}</Badge>
                      )}
                    </div>

                    {grade?.comment && (
                      <div className="mt-2 p-2 bg-white/60 rounded border-l-2 border-primary">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Teacher Feedback:</p>
                        <p className="text-sm">{grade.comment}</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(submission?.created_date || grade?.created_date || assignment.created_date), { addSuffix: true })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}