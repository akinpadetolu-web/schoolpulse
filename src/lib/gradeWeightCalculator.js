import { base44 } from '@/api/base44Client';

/**
 * Grade Weight Calculation Engine — Single Source of Truth
 *
 * Formula:
 *   1. Caller filters grades to same student + subject + class + term
 *   2. Group those grades by assessmentType
 *   3. For each category, calculate the category average (avg of score/maxScore × 100)
 *   4. Multiply category average by category weight — only once per category
 *   5. Sum contributions from all categories that have grades
 *
 * Example:
 *   Weights: Assignments 20%, Quizzes 20%, Exams 60%
 *   Assignment avg = 80% → 80 × 0.20 = 16
 *   Quiz avg = 70%       → 70 × 0.20 = 14
 *   Exam avg = 90%       → 90 × 0.60 = 54
 *   Final = 16 + 14 + 54 = 84%
 *
 * Edge cases:
 *   - Missing category (no grades) → categoryAvg = null, excluded from final;
 *                                    weights are normalized so the grade reflects
 *                                    only categories that have data (no artificial zeros)
 *   - No grades at all            → finalGrade = null
 *   - Weights ≠ 100               → contributions normalized by total weight of categories with data
 *   - No category config          → falls back to simple average of all grades
 */

let _categoryCache = {};
let _cacheTTL = {};
const CACHE_MS = 30000;

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
 * Calculate the percentage of a single grade record.
 * @param {object} grade - Grade record with score and maxScore
 * @returns {number} Percentage 0–100 (0 if maxScore missing/zero)
 */
export function calculateGradePercentage(grade) {
  if (!grade || !grade.maxScore || grade.maxScore <= 0) return 0;
  return (grade.score / grade.maxScore) * 100;
}

/**
 * Group grades by assessmentType and compute the average for each group.
 * @param {object[]} grades - Grade records (pre-filtered to same student/subject/term)
 * @returns {object[]} [{ assessmentType, categoryAvg, count }] — categoryAvg is null if no grades
 */
export function calculateCategoryAverages(grades) {
  if (!grades || grades.length === 0) return [];
  const grouped = {};
  grades.forEach(g => {
    const type = g.assessmentType;
    if (!type) return;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(g);
  });
  return Object.entries(grouped).map(([assessmentType, catGrades]) => {
    const percentages = catGrades.map(g => calculateGradePercentage(g));
    const categoryAvg = percentages.length > 0
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      : null;
    return {
      assessmentType,
      categoryAvg: categoryAvg !== null ? Math.round(categoryAvg * 100) / 100 : null,
      count: catGrades.length,
    };
  });
}

/**
 * Calculate the weighted final grade using category-weighted logic.
 *
 * @param {object[]} grades          - Grade records (pre-filtered to same student + subject + term)
 * @param {object[]} gradeCategories - GradeCategory records (pre-filtered by schoolId/classId/subjectId)
 * @returns {{ finalGrade: number|null, breakdown: object[], hasWeights: boolean }}
 *   - finalGrade: null if no grades at all
 *   - breakdown: per-category detail with contribution
 *   - hasWeights: whether category config was used
 */
export function calculateWeightedFinalGrade(grades, gradeCategories) {
  const safeGrades = grades || [];
  const safeCats = gradeCategories || [];

  // No grades at all → null
  if (safeGrades.length === 0) {
    return { finalGrade: null, breakdown: [], hasWeights: safeCats.length > 0 };
  }

  // No weight config → simple average fallback
  if (safeCats.length === 0) {
    const percentages = safeGrades.map(g => calculateGradePercentage(g));
    const simpleAvg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    return {
      finalGrade: Math.round(simpleAvg * 100) / 100,
      breakdown: [],
      hasWeights: false,
    };
  }

  // Calculate category averages
  const categoryAverages = calculateCategoryAverages(safeGrades);

  // Build breakdown: one entry per configured category
  const breakdown = safeCats.map(cat => {
    const catData = categoryAverages.find(ca => ca.assessmentType === cat.assessmentType);
    const categoryAvg = catData?.categoryAvg ?? null;
    const count = catData?.count ?? 0;
    const contribution = categoryAvg !== null
      ? Math.round((categoryAvg * (cat.weight / 100)) * 100) / 100
      : 0;
    return {
      categoryName: cat.categoryName,
      assessmentType: cat.assessmentType,
      weight: cat.weight,
      categoryAvg,
      count,
      contribution,
    };
  });

  // Final = normalized weighted average — only categories that have data contribute,
  // and the weight is rescaled so missing categories don't artificially zero the grade.
  const categoriesWithData = breakdown.filter(b => b.categoryAvg !== null);
  const totalWeightWithData = categoriesWithData.reduce((sum, b) => sum + b.weight, 0);
  const finalGrade = totalWeightWithData > 0
    ? Math.round(
        (categoriesWithData.reduce((sum, b) => sum + b.contribution, 0) / (totalWeightWithData / 100)) * 100
      ) / 100
    : null;

  return { finalGrade, breakdown, hasWeights: true };
}

/**
 * Convenience wrapper returning { overall, breakdown, hasWeights }.
 * `overall` mirrors `finalGrade` (null when no grades).
 */
export function getSubjectFinalGrade(grades, gradeCategories) {
  const result = calculateWeightedFinalGrade(grades, gradeCategories);
  return {
    overall: result.finalGrade,
    breakdown: result.breakdown,
    hasWeights: result.hasWeights,
  };
}

/**
 * Build a human-readable breakdown string.
 */
export function formatBreakdown(breakdown, overall) {
  if (!breakdown || breakdown.length === 0) return '';
  const parts = breakdown.map(b => {
    const avg = b.categoryAvg !== null ? b.categoryAvg.toFixed(0) : 'N/A';
    return `${b.categoryName} ${b.weight}% (${avg}) → ${(b.contribution ?? 0).toFixed(0)}`;
  });
  const total = overall != null ? overall.toFixed(0) : 'N/A';
  return `${parts.join(' | ')} | Total: ${total}%`;
}

/**
 * Validate that categories sum to 100%.
 */
export function validateWeightTotal(categories) {
  const total = categories.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  return { valid: Math.abs(total - 100) < 0.01, total: Math.round(total * 100) / 100 };
}