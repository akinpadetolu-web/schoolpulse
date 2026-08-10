import React from 'react';
import { useStudentInsights } from '@/hooks/useStudentInsights';
import InsightCard from './InsightCard';

/**
 * Shows the latest Kairos insights for a student. Used on the student Grade Trends
 * page and the parent Grades page.
 */
export default function StudentInsightBanner({ studentId, limit = 3, showSubject = true }) {
  const { insights, loading } = useStudentInsights(studentId);

  if (loading || !insights || insights.length === 0) return null;
  const top = insights.slice(0, limit);

  return (
    <div className="space-y-3">
      {top.map((i) => (
        <InsightCard key={i.id} insight={i} showSubject={showSubject} />
      ))}
    </div>
  );
}