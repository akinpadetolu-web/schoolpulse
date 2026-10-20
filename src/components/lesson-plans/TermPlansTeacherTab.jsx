import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Loader2, CalendarRange, Pencil, Trash2, Send, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { filledWeeks } from '@/lib/termPlanUtils';
import TermPlanForm from './TermPlanForm';
import TermPlanWeeks from './TermPlanWeeks';

function StatusBadge({ status }) {
  if (status === 'approved') return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === 'rejected') return <Badge className="text-xs bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge className="text-xs bg-amber-100 text-amber-700 border-0"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
}

export default function TermPlansTeacherTab() {
  const { schoolUser: user } = useSchoolAuth();
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.schoolId) return;
    const [p, ses, trm, c, s] = await Promise.all([
      base44.entities.TermLessonPlan.filter({ schoolId: user.schoolId, teacherId: user.id }),
      base44.entities.AcademicSession.filter({ schoolId: user.schoolId }),
      base44.entities.AcademicTerm.filter({ schoolId: user.schoolId }),
      base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user.schoolId, isArchived: false }),
    ]);

    setPlans((p || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));

    const byStart = (a, b) => (a.startDate || '').localeCompare(b.startDate || '');
    setSessions((ses || []).sort(byStart));
    setTerms((trm || []).sort(byStart));

    const ta = user?.teachingAssignments || [];
    const assignedClassIds = [...new Set(ta.map(t => t.classId))];
    const assignedSubjectIds = [...new Set(ta.map(t => t.subjectId))];
    setClasses(assignedClassIds.length ? (c || []).filter(cl => assignedClassIds.includes(cl.id)) : (c || []));
    setSubjects(assignedSubjectIds.length ? (s || []).filter(sub => assignedSubjectIds.includes(sub.id)) : (s || []));
    setLoading(false);
  }, [user?.schoolId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(plan) {
    if (!window.confirm(`Delete the ${plan.subjectName} term plan for ${plan.className}?`)) return;
    await base44.entities.TermLessonPlan.delete(plan.id);
    toast.success('Term plan deleted');
    loadData();
  }

  async function resubmit(plan) {
    await base44.entities.TermLessonPlan.update(plan.id, {
      status: 'pending', approvedBy: '', approvedByName: '', approvalDate: '', approvalNotes: '',
    });
    toast.success('Resubmitted for admin approval');
    loadData();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Term Lesson Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set the weekly topics for a subject from the start of term to the end, then submit the whole plan for approval
          </p>
        </div>
        <Button onClick={() => { setEditingPlan(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Term Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <CalendarRange className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No term plans yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a session, term, class and subject to schedule every week up to the end of the term.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const isExpanded = expandedId === plan.id;
            return (
              <Card key={plan.id} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{plan.subjectName}</p>
                        <StatusBadge status={plan.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {plan.className} · {plan.termName}{plan.academicYear ? ` ${plan.academicYear}` : ''} · {filledWeeks(plan.weeks)} of {(plan.weeks || []).length} weeks planned
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {plan.status === 'rejected' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600" title="Resubmit for approval"
                          onClick={e => { e.stopPropagation(); resubmit(plan); }}>
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={e => { e.stopPropagation(); setEditingPlan(plan); setShowForm(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={e => { e.stopPropagation(); handleDelete(plan); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      <TermPlanWeeks plan={plan} />
                      {plan.status === 'rejected' && plan.approvalNotes && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Admin Feedback
                          </p>
                          <p className="text-sm text-red-800">{plan.approvalNotes}</p>
                        </div>
                      )}
                      {plan.status === 'approved' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                          Approved — this plan is now visible to students and parents.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TermPlanForm
        open={showForm}
        onOpenChange={setShowForm}
        plan={editingPlan}
        user={user}
        sessions={sessions}
        terms={terms}
        classes={classes}
        subjects={subjects}
        onSaved={loadData}
      />
    </div>
  );
}