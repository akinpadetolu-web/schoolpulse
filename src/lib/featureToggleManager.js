import { base44 } from '@/api/base44Client';

const featureCache = new Map();

export async function getFeatures(schoolId, role, userId = null) {
  const cacheKey = `${schoolId}:${role}:${userId || 'all'}`;
  
  if (featureCache.has(cacheKey)) {
    return featureCache.get(cacheKey);
  }

  try {
    // Check for user-specific toggle first
    let toggle = null;
    if (userId) {
      const userToggles = await base44.entities.FeatureToggle.filter({
        schoolId,
        role,
        userId,
        isActive: true,
      });
      if (userToggles?.length > 0) {
        toggle = userToggles[0];
      }
    }

    // Fall back to role-level toggle
    if (!toggle) {
      const roleToggles = await base44.entities.FeatureToggle.filter({
        schoolId,
        role,
        isActive: true,
      });
      const roleToggle = roleToggles?.find(t => !t.userId);
      if (roleToggle) {
        toggle = roleToggle;
      }
    }

    // Fall back to global defaults
    if (!toggle) {
      const globalToggles = await base44.entities.FeatureToggle.filter({
        schoolId: { $eq: '' },
        role,
        isActive: true,
      });
      const globalToggle = globalToggles?.find(t => !t.userId);
      if (globalToggle) {
        toggle = globalToggle;
      }
    }

    const features = toggle?.features || getDefaultFeatures(role);
    featureCache.set(cacheKey, features);
    return features;
  } catch (error) {
    console.error('Failed to fetch feature toggles:', error);
    return getDefaultFeatures(role);
  }
}

export function getDefaultFeatures(role) {
  const defaults = {
    assignments: true,
    grades: true,
    attendance: true,
    announcements: true,
    lessonPlans: true,
    materials: true,
    messaging: true,
    quizzes: true,
    timetable: true,
    reportCards: true,
    eClass: false,
    studentReports: true,
    teacherWorkload: true,
  };

  // Role-specific defaults
  if (role === 'parent') {
    defaults.quizzes = false;
    defaults.lessonPlans = true;
    defaults.studentReports = true;
    defaults.attendance = true;
  }

  if (role === 'student') {
    defaults.studentReports = false;
    defaults.teacherWorkload = false;
  }

  return defaults;
}

export function isFeatureEnabled(features, featureName) {
  return features?.[featureName] === true;
}

export function clearFeatureCache() {
  featureCache.clear();
}