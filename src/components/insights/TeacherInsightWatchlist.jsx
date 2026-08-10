import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import InsightCard from './InsightCard';

const PRIORITY = { warning: 0, negative: 1, neutral: 2, positive: 3 };

/**
 * Teacher dashboard widget: surfaces the most pressing Kairos insights across the
 * teacher's assigned classes/subjects — at-risk and declining students first.
 */
export default function TeacherInsightWatchlist() {
  const { schoolUser: user } = useSchoolAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;
    let active = true;

    async function load() {
      try {
        const classIds = [
          ...new Set([
            ...(user.assignedClasses || []),
            ...((user.teachingAssignments || []).map((a) => a.classId).filter(Boolean)),
          ]),
        ];
        const subjectIds = user.assignedSubjects || [];

        const all = await base44.entities.StudentInsight.filter({ schoolId: user.schoolId });
        let filtered = (all || []).filter((i) => {
          const classMatch = classIds.length === 0 || classIds.includes(i.classId);
          const subjMatch = subjectIds.length === 0 || subjectIds.includes(i.subjectId);
          return classMatch && subjMatch;
        });

        filtered.sort(
          (a, b) =>
            (PRIORITY[a.insightType] ?? 9) - (PRIORITY[b.insightType] ?? 9) ||
            new Date(b.updated_date) - new Date(a.updated_date)
        );

        if (active) setInsights(filtered.slice(0, 5));
      } catch {
        if (active) setInsights([]);
      }
      if (active) setLoading(false);
    }

    load();
    const unsub = base44.entities.StudentInsight.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, user?.schoolId]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <CardTitle className="text-base">Kairos Insight Watchlist</CardTitle>
            <CardDescription className="text-xs">
              Recent performance insights from your students&apos; grades
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} showSubject={true} />
        ))}
      </CardContent>
    </Card>
  );
}