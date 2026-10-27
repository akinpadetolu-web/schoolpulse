import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, CalendarClock } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { releasedOnly } from '@/lib/assignmentRelease';
import { toDate } from '@/lib/periodUtils';
import AssignmentAttachment from '@/components/assignments/AssignmentAttachment';

export default function ParentAssignments() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const students = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
          const linked = (students || []).filter(s => linkedIds.includes(s.id));
          setChildren(linked);
          if (linked.length > 0) {
            setSelectedChildId(linked[0].id);
          }

          const classIds = [...new Set(linked.map(s => s.classId).filter(Boolean))];
          if (classIds.length > 0) {
            const all = await base44.entities.Assignment.filter({ schoolId: user?.schoolId, isPublished: true });
            const enriched = releasedOnly(all).map(a => {
              const child = linked.find(c => c.classId === a.classId);
              return { ...a, childName: child?.fullName || 'Unknown', childId: child?.id };
            });
            setAssignments(enriched.filter(a => classIds.includes(a.classId)));

            const subs = await base44.entities.Submission.filter({
              schoolId: user?.schoolId,
              studentId: { $in: linked.map(s => s.id) },
            });
            setSubmissions(subs || []);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [user?.id, user?.linkedStudentIds, user?.schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filtered = assignments.filter(a => !selectedChildId || a.childId === selectedChildId);
  const submittedKeys = new Set(submissions.map(s => `${s.assignmentId}:${s.studentId}`));
  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Children's Assignments</h1>
      
      {children.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by child</label>
          <Select
            value={selectedChildId || 'all'}
            onValueChange={v => setSelectedChildId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Children</SelectItem>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id}>{child.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assignments available.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(a => {
            const due = toDate(a.dueDate);
            const submitted = submittedKeys.has(`${a.id}:${a.childId}`);
            const isLate = Boolean(due) && due < today && !submitted;
            const isDueToday = Boolean(due) && due.getTime() === today.getTime();
            return (
              <Card key={a.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{a.title}</p>
                        {isLate && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Missing
                          </Badge>
                        )}
                        {!isLate && submitted && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.subjectName} • {a.className}</p>
                      {children.length > 1 && <p className="text-xs text-primary font-medium mt-1">{a.childName}</p>}
                      <p className={`text-xs mt-1 flex items-center gap-1 ${isLate ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        <CalendarClock className="w-3 h-3" />
                        {due
                          ? `Due: ${format(due, 'MMM d, yyyy')}${isDueToday ? ' (today)' : ''}`
                          : 'No due date set'}
                      </p>
                      {a.attachmentFileUri && (
                        <div className="mt-2">
                          <AssignmentAttachment fileUri={a.attachmentFileUri} fileName={a.attachmentFileName} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}