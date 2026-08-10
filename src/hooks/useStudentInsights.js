import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Fetches Kairos insights for a student, optionally filtered by subject/term.
 * Subscribes to live updates so new insights appear as grades come in.
 */
export function useStudentInsights(studentId, { subjectId, term } = {}) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    let active = true;

    async function load() {
      try {
        const all = await base44.entities.StudentInsight.filter({ studentId });
        let filtered = all || [];
        if (subjectId) filtered = filtered.filter((i) => i.subjectId === subjectId);
        if (term) filtered = filtered.filter((i) => i.term === term);
        filtered.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
        if (active) setInsights(filtered);
      } catch {
        if (active) setInsights([]);
      }
      if (active) setLoading(false);
    }

    load();

    const unsub = base44.entities.StudentInsight.subscribe((event) => {
      if (event.data?.studentId === studentId) load();
    });

    return () => {
      active = false;
      unsub();
    };
  }, [studentId, subjectId, term]);

  return { insights, loading };
}