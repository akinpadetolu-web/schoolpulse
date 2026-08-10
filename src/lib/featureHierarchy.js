// Comprehensive feature & sub-feature hierarchy for per-school toggling.
// Each leaf `id` is the boolean key stored in the FeatureToggle `features` map.
// Reuses existing feature IDs from featureCatalog.js where they exist;
// new sub-feature IDs use a dotted convention under their parent module.

import {
  GraduationCap, Users, ClipboardList, CalendarClock,
  HeartPulse, Building2, BookOpen, Boxes, Wallet,
  Megaphone, Clock, Monitor, Settings,
} from 'lucide-react';

export const FEATURE_TREE = [
  {
    id: 'academic',
    label: 'Academic Management',
    icon: GraduationCap,
    features: [
      {
        id: 'adminClasses', label: 'Classes & Streams', description: 'Create and manage school classes',
        subFeatures: [
          { id: 'adminClasses.streams', label: 'Stream management', description: 'Science / Arts / Commercial streams' },
        ],
      },
      {
        id: 'adminSubjects', label: 'Subjects', description: 'Create and manage subjects',
        subFeatures: [
          { id: 'adminCategories', label: 'Subject categories', description: 'Manage subject categories' },
          { id: 'adminSubjects.assignment', label: 'Subject-to-class assignment', description: 'Assign subjects to applicable classes' },
        ],
      },
      { id: 'academicTerms', label: 'Academic Terms', description: 'Manage academic terms' },
      { id: 'adminSessions', label: 'Academic Sessions', description: 'Manage academic sessions' },
      { id: 'gradingSystem', label: 'Grading System', description: 'Configure grading scales and rules' },
      { id: 'promotion', label: 'Promotion', description: 'Manage student promotion rules and runs' },
    ],
  },
  {
    id: 'personnel',
    label: 'Personnel & Students',
    icon: Users,
    features: [
      {
        id: 'adminStudents', label: 'Student Management', description: 'View and manage student records',
        subFeatures: [
          { id: 'adminStudents.bulkImport', label: 'Bulk student import', description: 'Import students via CSV / Excel' },
          { id: 'adminStudents.profiles', label: 'Profiles & password reset', description: 'Edit profiles and reset passwords' },
        ],
      },
      { id: 'adminTeachers', label: 'Teacher Management', description: 'View and manage teacher records' },
      {
        id: 'adminTeacherAssignments', label: 'Teacher Assignments', description: 'Assign teachers to classes and subjects',
        subFeatures: [
          { id: 'adminBulkAssign', label: 'Bulk assign', description: 'Bulk assign teachers to classes' },
        ],
      },
      { id: 'teacherWorkload', label: 'Teacher Workload', description: 'View teacher workload distribution' },
      { id: 'adminStaff', label: 'Non-Teaching Staff', description: 'Manage non-teaching staff directory' },
      {
        id: 'adminHR', label: 'HR Management', description: 'Manage HR operations',
        subFeatures: [
          { id: 'adminHR.accessControl', label: 'Staff access control', description: 'Module-level permissions for non-teaching staff' },
        ],
      },
      { id: 'staffDashboard', label: 'Staff Dashboard', description: 'Staff self-service dashboard' },
    ],
  },
  {
    id: 'assessment',
    label: 'Assessment & Performance',
    icon: ClipboardList,
    features: [
      { id: 'assignments', label: 'Assignments', description: 'View and manage assignments' },
      { id: 'grades', label: 'Grades', description: 'View and manage grades' },
      { id: 'adminGradeWeighting', label: 'Grade Weighting', description: 'Configure assessment category weights' },
      { id: 'attendance', label: 'Attendance', description: 'View and manage attendance records' },
      {
        id: 'adminExaminations', label: 'Examinations', description: 'Manage exam results and data',
        subFeatures: [
          { id: 'adminExamTimetable', label: 'Exam timetable', description: 'Schedule exams and assign invigilators' },
          { id: 'adminExaminations.invigilators', label: 'Invigilator assignment', description: 'Assign invigilators to exam sessions' },
        ],
      },
      { id: 'reportCards', label: 'Report Cards', description: 'View and manage report cards' },
      { id: 'adminReportCardTemplates', label: 'Report Card Templates', description: 'Manage report card templates' },
      { id: 'studentReports', label: 'Student Reports', description: 'View student reports' },
      { id: 'quizzes', label: 'Quizzes', description: 'View and take quizzes' },
      { id: 'lessonPlans', label: 'Lesson Plans', description: 'View lesson plans' },
      { id: 'materials', label: 'Lesson Materials', description: 'View course materials' },
    ],
  },
  {
    id: 'timetables',
    label: 'Timetables & Events',
    icon: CalendarClock,
    features: [
      { id: 'timetable', label: 'Class Timetable', description: 'View and manage class timetables' },
      { id: 'adminEvents', label: 'School Events / Calendar', description: 'Manage school calendar and events' },
    ],
  },
  {
    id: 'health',
    label: 'Health & Medical',
    icon: HeartPulse,
    masterId: 'adminHealth',
    features: [
      { id: 'healthNurseVisits', label: 'Nurse Visits', description: 'Log and view nurse visit records' },
      { id: 'healthIncidents', label: 'Medical Incidents', description: 'Record medical incidents' },
      { id: 'healthVaccinations', label: 'Vaccinations', description: 'Track vaccination records' },
      { id: 'healthSpecialNeeds', label: 'Special Needs', description: 'Document special needs' },
      { id: 'healthAnalytics', label: 'Health Analytics', description: 'Health analytics dashboard' },
    ],
  },
  {
    id: 'hostel',
    label: 'Hostel Management',
    icon: Building2,
    masterId: 'adminHostel',
    features: [
      { id: 'adminHostel.dashboard', label: 'Hostel Dashboard', description: 'Overview of hostel occupancy and status' },
      { id: 'adminHostel.hostels', label: 'Hostels & Capacity', description: 'Manage hostels and bed capacity' },
      { id: 'adminHostel.allocations', label: 'Allocations', description: 'Allocate students to hostel beds' },
      { id: 'adminHostel.attendance', label: 'Hostel Attendance', description: 'Take hostel attendance' },
      { id: 'adminHostel.reports', label: 'Attendance Reports', description: 'View hostel attendance reports' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: BookOpen,
    masterId: 'adminLibrary',
    features: [
      { id: 'adminLibrary.catalog', label: 'Book Catalog', description: 'Manage library book catalog' },
      { id: 'adminLibrary.borrowing', label: 'Borrowing', description: 'Issue books to borrowers' },
      { id: 'adminLibrary.returns', label: 'Returns', description: 'Process book returns' },
      { id: 'adminLibrary.fines', label: 'Fines', description: 'Track and collect library fines' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    masterId: 'adminInventory',
    features: [
      { id: 'adminInventory.assets', label: 'Asset Tracking', description: 'Track school assets and equipment' },
      { id: 'adminInventory.purchaseRequests', label: 'Purchase Requests', description: 'Manage purchase requests' },
      { id: 'adminInventory.maintenance', label: 'Maintenance Requests', description: 'Log maintenance requests' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    masterId: 'adminFinance',
    features: [
      { id: 'adminFinance.fees', label: 'Fee Management', description: 'Configure fee structures and types' },
      { id: 'adminFinance.invoices', label: 'Invoices', description: 'Generate and track invoices' },
      { id: 'adminFinance.payments', label: 'Payments', description: 'Record and verify payments' },
      { id: 'adminFinance.reports', label: 'Financial Reports', description: 'Financial reporting dashboard' },
      { id: 'adminFinance.paymentSettings', label: 'Payment Settings', description: 'Configure payment gateways' },
      { id: 'adminFinance.subscriptions', label: 'Subscriptions', description: 'Manage school subscription tiers' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: Megaphone,
    features: [
      { id: 'announcements', label: 'Announcements', description: 'View and create announcements' },
      { id: 'messages', label: 'Messaging', description: 'Send and receive messages' },
      { id: 'adminEmailCampaign', label: 'Email Campaign', description: 'Send email campaigns' },
      { id: 'adminApprovals', label: 'Approvals', description: 'Approve content and requests' },
    ],
  },
  {
    id: 'staffOps',
    label: 'Staff Operations',
    icon: Clock,
    features: [
      { id: 'staffAttendance', label: 'Staff Attendance', description: 'Track staff clock in / out' },
      { id: 'leaveRequests', label: 'Leave Requests', description: 'Manage leave requests' },
    ],
  },
  {
    id: 'elearning',
    label: 'Virtual Learning',
    icon: Monitor,
    features: [
      { id: 'eClass', label: 'E-Class (Virtual Classes)', description: 'Access e-learning / virtual classes' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    features: [
      { id: 'adminDashboard', label: 'Admin Dashboard', description: 'Access to admin dashboard' },
      { id: 'adminSettings', label: 'School Settings', description: 'Configure school settings' },
    ],
  },
];

// Flatten every toggle key (features + sub-features + master toggles) for defaults.
export function getAllFeatureKeys() {
  const keys = [];
  for (const group of FEATURE_TREE) {
    if (group.masterId) keys.push(group.masterId);
    for (const f of group.features) {
      keys.push(f.id);
      (f.subFeatures || []).forEach(s => keys.push(s.id));
    }
  }
  return keys;
}

export function getDefaultEnabled() {
  const obj = {};
  getAllFeatureKeys().forEach(k => { obj[k] = true; });
  return obj;
}