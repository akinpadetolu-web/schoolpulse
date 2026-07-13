import { base44 } from '@/api/base44Client';

/**
 * Grade Weight Calculation Engine
 *
 * Formula (normalize weights based only on categories with data):
 *   For each category (e.g. Exam 60%, Quiz 20%, Assignment 20%):
 *     1. Collect all Grade records for this student/subject/term matching that assessmentType
 *     2. Compute the average percentage for that category: avg(score/maxScore * 100)
 *        (If no records: category is excluded from the calculation)
 *     3. Rescale weights so only categories with data sum to 100%
 *     4. Contribution = categoryAvg * (rescaledWeight / 100)
 *   Overall = sum of contributions from categories with data only
 *   Example: Quiz 100% (20% weight), no Assignment or Exam data
 *     → Only Quiz has data → rescaled to 100% → Overall = 100%
 *   Example: Quiz 80% (20% weight) + Assignment 90% (20% weight), no Exam data
 *     → Quiz+Assignment weights = 40% → rescale to 50%/50% → Overall = 85%
 *   Rounds to 2 decimal places.
 */

let _categoryCache = {};
let _cacheTTL = {};
const CACHE_MS = 30000; // 30s

export async function getWeightCategories(schoolId, classId, subjectId) {
  const key = `${schoolId}:${classId}:${subjectId}`;
  if (_categoryCache[key] && Date.now() < _cacheTTL[key]) return _categoryCache[key];
  const cats = await base44.entities.GradeCategory.filter({ schoolId, classId, subjectId });
  _categoryCache[key] = cats || [];
  _cacheTTL[key] = Date.now() + CACHE_MS;
  return _categoryCache[key];
}

export function clearWeightCache() {
  _categoryCache = {};
  _cacheTTL = {};
}

/**
 * Calculate weighted overall score for a student in a subject/term.
 *
 * @param {object[]} grades  - Array of Grade records (pre-filtered or all)
 * @param {object[]} categories - GradeCategory records for this class/subject
 * @param {string} studentId
 * @param {string} subjectId
 * @param {string} [term]    - Optional: filter grades by term
 * @returns {{ overall: number, breakdown: object[], hasWeights: boolean }}
 */
export function calculateWeightedScore(grades, categories, studentId, subjectId, term = null) {
  // Filter grades for this student/subject/term
  const relevant = grades.filter(g =>
    g.studentId === studentId &&
    g.subjectId === subjectId &&
    (!term || g.term === term)
  );

  const relevantCategories = categories.filter(c => c.subjectId === subjectId);

  // If no weight config: fall back to simple average
  if (!relevantCategories || relevantCategories.length === 0) {
    if (relevant.length === 0) return { overall: 0, breakdown: [], hasWeights: false };
    const avg = relevant.reduce((sum, g) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / relevant.length;
    return { overall: Math.round(avg * 100) / 100, breakdown: [], hasWeights: false };
  }

  // Weighted calculation — only include categories that have actual grade records
  const breakdown = relevantCategories.map(cat => {
    const catGrades = relevant.filter(g => g.assessmentType === cat.assessmentType);
    let categoryAvg = null; // null = no data yet
    if (catGrades.length > 0) {
      const totalPct = catGrades.reduce((sum, g) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0);
      categoryAvg = totalPct / catGrades.length;
    }
    return {
      categoryName: cat.categoryName,
      assessmentType: cat.assessmentType,
      weight: cat.weight,
      categoryAvg: categoryAvg !== null ? Math.round(categoryAvg * 100) / 100 : null,
      count: catGrades.length,
    };
  });

  // Normalize: only include categories with actual grade data, rescale weights to sum to 100%
  const categoriesWithData = breakdown.filter(b => b.categoryAvg !== null);
  const totalWeightWithData = categoriesWithData.reduce((sum, b) => sum + b.weight, 0);

  const finalBreakdown = breakdown.map(b => {
    let contribution = 0;
    let rescaledWeight = null;
    if (b.categoryAvg !== null && totalWeightWithData > 0) {
      rescaledWeight = Math.round((b.weight / totalWeightWithData) * 10000) / 100;
      contribution = b.categoryAvg * (b.weight / totalWeightWithData);
    }
    return { ...b, rescaledWeight, contribution: Math.round(contribution * 100) / 100 };
  });

  const overall = Math.round(finalBreakdown.reduce((sum, b) => sum + b.contribution, 0) * 100) / 100;

  return { overall, breakdown: finalBreakdown, hasWeights: true };
}

/**
 * Build a human-readable breakdown string.
 * e.g. "Exam 60% (90) → 54 | Quiz 20% (85) → 17 | Assignment 20% (0) → 0 | Total: 71"
 */
export function formatBreakdown(breakdown, overall) {
  if (!breakdown || breakdown.length === 0) return '';
  const parts = breakdown.map(b => {
    const avg = b.categoryAvg !== null ? b.categoryAvg.toFixed(0) : '—';
    const weight = b.rescaledWeight !== null ? `${b.weight}%→${b.rescaledWeight}%` : `${b.weight}%`;
    return `${b.categoryName} ${weight} (${avg}) → ${b.contribution.toFixed(0)}`;
  });
  return `${parts.join(' | ')} | Total: ${overall.toFixed(0)}%`;
}

/**
 * Validate that categories sum to 100%.
 * @param {object[]} categories
 * @returns {{ valid: boolean, total: number }}
 */
export function validateWeightTotal(categories) {
  const total = categories.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  return { valid: Math.abs(total - 100) < 0.01, total: Math.round(total * 100) / 100 };
}