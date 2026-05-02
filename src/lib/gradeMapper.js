import { base44 } from '@/api/base44Client';

let gradingSystemCache = {};

/**
 * Get the grading system for a school (cached)
 */
async function getGradingSystem(schoolId) {
  if (!schoolId) return null;
  if (gradingSystemCache[schoolId]) return gradingSystemCache[schoolId];
  
  const systems = await base44.entities.GradingSystem.filter({ schoolId, isDefault: true });
  const system = systems?.[0] || null;
  if (system) gradingSystemCache[schoolId] = system;
  return system;
}

/**
 * Map a percentage to a letter grade using the school's rubric
 * Falls back to a default rubric if no school rubric exists
 */
export async function getGradeLabel(percentage, schoolId) {
  const system = await getGradingSystem(schoolId);
  
  // Use school rubric if available
  if (system?.grades && Array.isArray(system.grades)) {
    const grade = system.grades.find(g => 
      percentage >= (g.minScore || 0) && percentage <= (g.maxScore || 100)
    );
    if (grade) {
      return {
        label: grade.letter || grade.label || '?',
        color: getGradeColor(grade.letter || grade.label),
        bg: getGradeBg(grade.letter || grade.label),
      };
    }
  }

  // Default fallback rubric
  if (percentage >= 90) return { label: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (percentage >= 80) return { label: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (percentage >= 70) return { label: 'C', color: 'text-amber-600', bg: 'bg-amber-50' };
  if (percentage >= 60) return { label: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { label: 'F', color: 'text-red-600', bg: 'bg-red-50' };
}

/**
 * Get color for a letter grade
 */
function getGradeColor(letter) {
  if (!letter) return 'text-muted-foreground';
  const first = letter.toUpperCase()[0];
  switch (first) {
    case 'A': return 'text-emerald-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-amber-600';
    case 'D': return 'text-orange-600';
    case 'F': return 'text-red-600';
    default: return 'text-muted-foreground';
  }
}

/**
 * Get background for a letter grade
 */
function getGradeBg(letter) {
  if (!letter) return '';
  const first = letter.toUpperCase()[0];
  switch (first) {
    case 'A': return 'bg-emerald-50';
    case 'B': return 'bg-blue-50';
    case 'C': return 'bg-amber-50';
    case 'D': return 'bg-orange-50';
    case 'F': return 'bg-red-50';
    default: return '';
  }
}

/**
 * Get bar chart color for a percentage
 */
export function getBarColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#3b82f6';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

/**
 * Clear cache (useful for testing)
 */
export function clearGradingSystemCache() {
  gradingSystemCache = {};
}