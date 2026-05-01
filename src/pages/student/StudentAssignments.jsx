import React, { useState, useEffect, useCallback } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshWrapper from '@/components/mobile/PullToRefreshWrapper';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import AssignmentSubmitDialog from '@/components/student/AssignmentSubmitDialog';

export default function StudentAssignments() {
  const { schoolUser: user } = useSchoolAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const [asgn, subs] = await Promise.all([
      base44.entities.Assignment.filter({ schoolId: user?.schoolId, classId: user?.classId, isPublished: true }),
      base44.entities.Submission.filter({ schoolId: user?.schoolId, studentId: user?.id }),
    ]);
    setAssignments(asgn || []);
    setSubmissions(subs || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const ptr = usePullToRefresh(load);

  const submittedIds = new Set(submissions.map(s => s.assignmentId));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <PullToRefreshWrapper {...ptr}>
    <div className="p-4 md:p-0">
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>
      {assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assignments yet.</p>
      ) : (
        <div className="grid gap-3">
          {assignments.map(a => {
            const submitted = submittedIds.has(a.id);
            const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();
            return (
              <Card
                key={a.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setSelected(a)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{a.title}</p>
                        {submitted && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        )}
                        {isPastDue && !submitted && (
                          <Badge variant="destructive" className="text-xs">Past Due</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.subjectName} • {a.teacherName}</p>
                      {a.description && <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">{a.description}</p>}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {a.dueDate && <span>Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</span>}
                        <span>Max: {a.maxScore || 100} pts</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AssignmentSubmitDialog
        open={!!selected}
        onOpenChange={open => { if (!open) { setSelected(null); load(); } }}
        assignment={selected}
        user={user}
      />
    </div>
    </PullToRefreshWrapper>
  );
}