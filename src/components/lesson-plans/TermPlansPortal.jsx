import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarRange, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { currentPeriod } from '@/lib/periodUtils';
import { groupBySubject, filledWeeks } from '@/lib/termPlanUtils';
import TermPlanWeeks from './TermPlanWeeks';

/** Approved term plans for the student and parent portals, grouped by subject. */
export default function TermPlansPortal({ user, role }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user?.schoolId) return;

    async function load() {
      try {
        let classIds = [];
        if (role === 'student') {
          classIds = user.classId ? [user.classId] : [];
        } else {
          const linked = user.linkedStudentIds || [];
          if (linked.length) {
            const students = await Promise.all(linked.map(id => base44.entities.SchoolUser.get(id).catch(() => null)));
            classIds = [...new Set(students.filter(s => s?.classId).map(s => s.classId))];
          }
        }

        if (!classIds.length) { setGroups([]); setLoading(false); return; }

        const [plans, sessions, terms] = await Promise.all([
          base44.entities.TermLessonPlan.filter({ schoolId: user.schoolId, status: 'approved' }),
          base44.entities.AcademicSession.filter({ schoolId: user.schoolId }),
          base44.entities.AcademicTerm.filter({ schoolId: user.schoolId }),
        ]);

        const { term } = currentPeriod(sessions || [], terms || []);
        const relevant = (plans || []).filter(p =>
          classIds.includes(p.classId) && (!term || !p.termId || p.termId === term.id)
        );

        setGroups(groupBySubject(relevant));
      } catch {
        setGroups([]);
      }
      setLoading(false);
    }

    load();
  }, [user?.schoolId, user?.classId, role, JSON.stringify(user?.linkedStudentIds)]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (groups.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <CalendarRange className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No term lesson plans published yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your teachers' weekly topics appear here once the school approves them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const isExpanded = expanded === group.key;
        const totalWeeks = group.plans.reduce((sum, p) => sum + filledWeeks(p.weeks), 0);
        const className = group.plans[0]?.className;

        return (
          <Card key={group.key} className="border-0 shadow-sm">
            <CardContent className="p-0">
              <button
                type="button"
                className="w-full flex items-start gap-3 p-4 text-left"
                onClick={() => setExpanded(isExpanded ? null : group.key)}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{group.subjectName}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {className} · {totalWeeks} week{totalWeeks === 1 ? '' : 's'} scheduled
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">{group.plans.length} term{group.plans.length > 1 ? 's' : ''}</Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-4 space-y-5">
                  {group.plans.map(plan => (
                    <TermPlanWeeks key={plan.id} plan={plan} showTerm />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}