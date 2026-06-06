/**
 * Shared hook: fetches the active published+visible exam timetable for a school.
 * Returns { examTimetable, loading } — examTimetable is null if none exists/visible.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useExamTimetable(schoolId) {
  const [examTimetable, setExamTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!schoolId) { setLoading(false); return; }
    const list = await base44.entities.ExamTimetable.filter({ schoolId, status: 'published', isVisible: true });
    const sorted = (list || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setExamTimetable(sorted[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Real-time subscription
    const unsub = base44.entities.ExamTimetable.subscribe((event) => {
      load();
    });
    return unsub;
  }, [schoolId]);

  return { examTimetable, loading, reload: load };
}