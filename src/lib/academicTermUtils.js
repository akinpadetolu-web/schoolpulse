import { base44 } from '@/api/base44Client';

/**
 * Get all academic terms for a school
 */
export async function getTerms(schoolId) {
  if (!schoolId) return [];
  const terms = await base44.entities.AcademicTerm.filter({ schoolId });
  return (terms || []).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/**
 * Get the currently active academic term based on the system date
 */
export async function getActiveTerm(schoolId) {
  const terms = await getTerms(schoolId);
  if (!terms.length) return null;
  const today = new Date().toISOString().split('T')[0];
  return terms.find(t => t.startDate <= today && t.endDate >= today) || null;
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