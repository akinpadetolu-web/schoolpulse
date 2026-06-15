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
    adminDashboard: true,
    adminStudents: true,
    adminTeachers: true,
    adminClasses: true,
    adminSubjects: true,
    timetable: true,
    adminEvents: true,
    assignments: true,
    grades: true,
    attendance: true,
    adminExaminations: true,
    reportCards: true,
    adminReportCardTemplates: true,
    adminTeacherAssignments: true,
    adminBulkAssign: true,
    adminCategories: true,
    eClass: false,
    announcements: true,
    messages: true,
    adminEmailCampaign: true,
    adminApprovals: true,
    teacherWorkload: true,
    staffAttendance: true,
    leaveRequests: true,
    adminHR: true,
    adminSettings: true,
    gradingSystem: true,
    promotion: true,
    academicTerms: true,
    lessonPlans: true,
    materials: true,
    quizzes: true,
    studentReports: true,
  };

  // Role-specific defaults - only admin gets all features
  if (role === 'teacher') {
    defaults.adminDashboard = false;
    defaults.adminStudents = false;
    defaults.adminTeachers = false;
    defaults.adminClasses = false;
    defaults.adminSubjects = false;
    defaults.adminEvents = false;
    defaults.adminExaminations = false;
    defaults.adminReportCardTemplates = false;
    defaults.adminTeacherAssignments = false;
    defaults.adminBulkAssign = false;
    defaults.adminCategories = false;
    defaults.messages = true;
    defaults.adminEmailCampaign = false;
    defaults.adminApprovals = false;
    defaults.staffAttendance = false;
    defaults.leaveRequests = true;
    defaults.adminHR = false;
    defaults.adminSettings = false;
    defaults.gradingSystem = false;
    defaults.promotion = false;
    defaults.academicTerms = false;
    defaults.studentReports = false;
  }

  if (role === 'student') {
    defaults.adminDashboard = false;
    defaults.adminStudents = false;
    defaults.adminTeachers = false;
    defaults.adminClasses = false;
    defaults.adminSubjects = false;
    defaults.adminEvents = false;
    defaults.adminExaminations = false;
    defaults.adminReportCardTemplates = false;
    defaults.adminTeacherAssignments = false;
    defaults.adminBulkAssign = false;
    defaults.adminCategories = false;
    defaults.messages = true;
    defaults.adminEmailCampaign = false;
    defaults.adminApprovals = false;
    defaults.teacherWorkload = false;
    defaults.staffAttendance = false;
    defaults.leaveRequests = false;
    defaults.adminHR = false;
    defaults.adminSettings = false;
    defaults.gradingSystem = false;
    defaults.promotion = false;
    defaults.academicTerms = false;
    defaults.studentReports = false;
  }

  if (role === 'hr_staff') {
    // HR staff get no features by default — only what admin explicitly grants via permittedFeatures
    Object.keys(defaults).forEach(k => { defaults[k] = false; });
    defaults.adminDashboard = true; // always show dashboard so they can navigate
  }

  if (role === 'parent') {
    defaults.adminDashboard = false;
    defaults.adminStudents = false;
    defaults.adminTeachers = false;
    defaults.adminClasses = false;
    defaults.adminSubjects = false;
    defaults.timetable = true;
    defaults.adminEvents = false;
    defaults.assignments = true;
    defaults.grades = true;
    defaults.attendance = true;
    defaults.adminExaminations = false;
    defaults.adminReportCardTemplates = false;
    defaults.adminTeacherAssignments = false;
    defaults.adminBulkAssign = false;
    defaults.adminCategories = false;
    defaults.announcements = true;
    defaults.messages = true;
    defaults.adminEmailCampaign = false;
    defaults.adminApprovals = false;
    defaults.teacherWorkload = false;
    defaults.staffAttendance = false;
    defaults.leaveRequests = false;
    defaults.adminHR = false;
    defaults.adminSettings = false;
    defaults.gradingSystem = false;
    defaults.promotion = false;
    defaults.academicTerms = false;
    defaults.lessonPlans = true;
    defaults.studentReports = true;
  }

  return defaults;
}

export function isFeatureEnabled(features, featureName) {
  return features?.[featureName] === true;
}

export function clearFeatureCache() {
  featureCache.clear();
}