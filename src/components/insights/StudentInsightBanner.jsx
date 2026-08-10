import React, { useState } from 'react';
import { useStudentInsights } from '@/hooks/useStudentInsights';
import { Button } from '@/components/ui/button';
import { History, ChevronUp } from 'lucide-react';
import InsightCard from './InsightCard';

/**
 * Shows the latest Kairos insights for a student, with an expandable history of
 * all past insights from the term. Used on the student Grade Trends page and the
 * parent Grades page.
 */
export default function StudentInsightBanner({ studentId, limit = 3, showSubject = true }) {
  const { insights, loading } = useStudentInsights(studentId);
  const [showAll, setShowAll] = useState(false);

  if (loading || !insights || insights.length === 0) return null;

  const recent = insights.slice(0, limit);
  const pastCount = Math.max(0, insights.length - limit);
  const displayed = showAll ? insights : recent;

  return (
    <div className="space-y-3">
      <div className={showAll && insights.length > limit ? 'max-h-[480px] overflow-y-auto space-y-3 pr-1' : 'space-y-3'}>
        {displayed.map((i) => (
          <InsightCard key={i.id} insight={i} showSubject={showSubject} />
        ))}
      </div>
      {pastCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" /> Show less
            </>
          ) : (
            <>
              <History className="w-4 h-4 mr-1" /> View {pastCount} past insight{pastCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
}