import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, FileText, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentAssignmentSummary() {
  const { schoolUser: user } = useSchoolAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!user?.classId || !user?.schoolId) return;

    try {
      // Fetch assignments for this class
      const assignmentsList = await base44.entities.Assignment.filter({
        schoolId: user.schoolId,
        classId: user.classId,
      });
      setAssignments((assignmentsList || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10));

      // Fetch student's submissions
      const submissionsList = await base44.entities.Submission.filter({
        studentId: user.id,
      });
      setSubmissions(submissionsList || []);

      // Fetch grades
      const gradesList = await base44.entities.Grade.filter({
        studentId: user.id,
      });
      setGrades(gradesList || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-emerald-50';
    if (percentage >= 60) return 'bg-amber-50';
    return 'bg-red-50';
  };

  if (loading) {
    return <div className="text-center py-8">Loading assignment summary...</div>;
  }

  // Group data: latest assignments with their submission/grade info
  const summary = assignments.map(assignment => {
    const submission = submissions.find(s => s.assignmentId === assignment.id);
    const grade = grades.find(g => g.assignmentId === assignment.id);
    return { assignment, submission, grade };
  }).filter(item => item.submission || item.grade).slice(0, 8);

  const averageScore = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length).toFixed(1)
    : 0;

  const completedCount = submissions.filter(s => s.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Assignments Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">out of {submissions.length} assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{averageScore}%</p>
            <p className="text-xs text-muted-foreground">across all assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignments.length}</p>
            <p className="text-xs text-muted-foreground">in your class</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Latest Assignments & Feedback
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
            <div className="space-y-4">
              {summary.map(({ assignment, submission, grade }) => (
                <div key={assignment.id} className={`p-4 rounded-lg border ${getScoreBgColor(grade?.score || 0, grade?.maxScore || 100)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{assignment.title}</h4>
                      <p className="text-xs text-muted-foreground">{assignment.subject}</p>
                    </div>
                    {grade && (
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getScoreColor(grade.score, grade.maxScore)}`}>
                          {grade.score}/{grade.maxScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((grade.score / grade.maxScore) * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {submission && (
                      <Badge variant={submission.status === 'submitted' ? 'default' : 'secondary'}>
                        {submission.status === 'submitted' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Submitted
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    )}
                    {grade?.assessmentType && (
                      <Badge variant="outline" className="text-xs">
                        {grade.assessmentType}
                      </Badge>
                    )}
                  </div>

                  {grade?.comment && (
                    <div className="mt-3 p-2 bg-white/50 rounded border-l-2 border-primary">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Teacher Feedback:</p>
                      <p className="text-sm text-foreground">{grade.comment}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(submission?.created_date || grade?.created_date), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}