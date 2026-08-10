import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, History, ChevronUp } from 'lucide-react';
import InsightCard from './InsightCard';

const PRIORITY = { warning: 0, negative: 1, neutral: 2, positive: 3 };

/**
 * Teacher dashboard widget: surfaces Kairos insights for the teacher's assigned
 * classes/subjects. Collapsed = latest insight per student/subject (a clean
 * at-risk watchlist). Expanded = full dated history of every insight this term.
 */
export default function TeacherInsightWatchlist() {
  const { schoolUser: user } = useSchoolAuth();
  const [allInsights, setAllInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

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

        // Newest first for history view
        filtered.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));

        if (active) setAllInsights(filtered);
      } catch {
        if (active) setAllInsights([]);
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

  if (allInsights.length === 0) return null;

  // Collapsed view: latest insight per student/subject pair (deduped) — a clean watchlist
  const latestByPair = {};
  allInsights.forEach((i) => {
    const key = `${i.studentId}|${i.subjectId}`;
    if (!latestByPair[key] || new Date(i.updated_date) > new Date(latestByPair[key].updated_date)) {
      latestByPair[key] = i;
    }
  });
  const watchlist = Object.values(latestByPair).sort(
    (a, b) =>
      (PRIORITY[a.insightType] ?? 9) - (PRIORITY[b.insightType] ?? 9) ||
      new Date(b.updated_date) - new Date(a.updated_date)
  );

  const displayed = showAll ? allInsights : watchlist.slice(0, 5);
  const hiddenCount = allInsights.length - watchlist.slice(0, 5).length;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <CardTitle className="text-base">Kairos Insight {showAll ? 'History' : 'Watchlist'}</CardTitle>
            <CardDescription className="text-xs">
              {showAll
                ? `All ${allInsights.length} insights from your students this term`
                : 'Recent performance insights from your students\u2019 grades'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={showAll ? 'max-h-[480px] overflow-y-auto space-y-3 pr-1' : 'space-y-3'}>
          {displayed.map((i) => (
            <InsightCard key={i.id} insight={i} showSubject={true} />
          ))}
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" /> Show watchlist
              </>
            ) : (
              <>
                <History className="w-4 h-4 mr-1" /> View all {allInsights.length} insights
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}