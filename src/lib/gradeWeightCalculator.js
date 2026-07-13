import { base44 } from '@/api/base44Client';

/**
 * Grade Weight Calculation Engine
 *
 * Formula (missing assessments = 0, no weight rescaling):
 *   For each category (e.g. Exam 60%, Quiz 20%, Assignment 20%):
 *     1. Collect all Grade records for this student/subject/term matching that assessmentType
 *     2. Compute the average percentage for that category: avg(score/maxScore * 100)
 *        (If no records: category score = 0, contribution = 0)
 *     3. Contribution = categoryAvg * (weight / 100)
 *   Overall = sum of all category contributions
 *   Example: Quiz 100% (20% weight) + Assignment 0% (20% weight) + Exam 0% (60% weight) = 20%
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

  // Missing categories count as 0 — no weight rescaling
  const finalBreakdown = breakdown.map(b => {
    const contribution = b.categoryAvg !== null ? b.categoryAvg * (b.weight / 100) : 0;
    return { ...b, contribution: Math.round(contribution * 100) / 100 };
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
  const parts = breakdown.map(b =>
    `${b.categoryName} ${b.weight}% (${b.categoryAvg !== null ? b.categoryAvg.toFixed(0) : '—'}) → ${b.contribution.toFixed(0)}`
  );
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