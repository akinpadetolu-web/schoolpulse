import { base44 } from '@/api/base44Client';

/**
 * Get the currently active academic term based on the system date
 */
export async function getActiveTerm(schoolId) {
  const terms = await base44.entities.AcademicTerm.filter({ schoolId });
  if (!terms || terms.length === 0) return null;

  const today = new Date().toISOString().split('T')[0];
  const activeTerm = terms.find(
    t => t.startDate <= today && t.endDate >= today
  );
  
  return activeTerm || null;
}

/**
 * Get all academic terms for a school, sorted by start date
 */
export async function getTerms(schoolId) {
  const terms = await base44.entities.AcademicTerm.filter({ schoolId });
  if (!terms) return [];
  return terms.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/**
 * Check if a date range overlaps with existing terms for a school
 */
export async function checkTermOverlap(schoolId, startDate, endDate, excludeTermId = null) {
  const terms = await getTerms(schoolId);
  return terms.some(t => {
    if (excludeTermId && t.id === excludeTermId) return false;
    return !(endDate < t.startDate || startDate > t.endDate);
  });
}