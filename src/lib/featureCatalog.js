// Centralized feature catalog and portal groupings

export const ALL_FEATURES = [
  { id: 'adminDashboard', label: 'Admin Dashboard', description: 'Access to admin dashboard' },
  { id: 'adminStudents', label: 'Manage Students', description: 'View and manage student records' },
  { id: 'adminTeachers', label: 'Manage Teachers', description: 'View and manage teacher records' },
  { id: 'adminClasses', label: 'Manage Classes', description: 'Create and manage school classes' },
  { id: 'adminSubjects', label: 'Manage Subjects', description: 'Create and manage subjects' },
  { id: 'timetable', label: 'Timetable', description: 'View and manage class timetable' },
  { id: 'adminEvents', label: 'School Events', description: 'Manage school calendar and events' },
  { id: 'assignments', label: 'Assignments', description: 'View and manage assignments' },
  { id: 'grades', label: 'Grades', description: 'View and manage grades' },
  { id: 'attendance', label: 'Attendance', description: 'View and manage attendance records' },
  { id: 'adminExaminations', label: 'Examinations', description: 'Manage exam results and data' },
  { id: 'reportCards', label: 'Report Cards', description: 'View and manage report cards' },
  { id: 'adminReportCardTemplates', label: 'RC Templates', description: 'Manage report card templates' },
  { id: 'adminTeacherAssignments', label: 'Teacher Assignments', description: 'Assign teachers to classes' },
  { id: 'adminBulkAssign', label: 'Bulk Assign', description: 'Bulk assign teachers to classes' },
  { id: 'adminCategories', label: 'Subject Categories', description: 'Manage subject categories' },
  { id: 'eClass', label: 'Virtual Classes', description: 'Access e-learning classes' },
  { id: 'announcements', label: 'Announcements', description: 'View and create announcements' },
  { id: 'messages', label: 'Messaging', description: 'Send and receive messages' },
  { id: 'adminEmailCampaign', label: 'Email Campaign', description: 'Send email campaigns' },
  { id: 'adminApprovals', label: 'Approvals', description: 'Approve content and requests' },
  { id: 'teacherWorkload', label: 'Teacher Workload', description: 'View teacher workload' },
  { id: 'staffAttendance', label: 'Staff Attendance', description: 'Track staff clock in/out' },
  { id: 'leaveRequests', label: 'Leave Requests', description: 'Manage leave requests' },
  { id: 'adminHR', label: 'HR Management', description: 'Manage HR operations' },
  { id: 'adminSettings', label: 'School Settings', description: 'Configure school settings' },
  { id: 'gradingSystem', label: 'Grading System', description: 'Configure grading system' },
  { id: 'promotion', label: 'Promotion', description: 'Manage student promotion' },
  { id: 'academicTerms', label: 'Academic Terms', description: 'Manage academic terms' },
  { id: 'adminSessions', label: 'Academic Sessions', description: 'Manage academic sessions' },
  { id: 'adminStaff', label: 'Non-Teaching Staff', description: 'Manage non-teaching staff' },
  { id: 'staffDashboard', label: 'Staff Dashboard', description: 'Staff self-service dashboard' },
  { id: 'adminFinance', label: 'Finance Management', description: 'Manage fees, invoices, and payments' },
  { id: 'adminInventory', label: 'Inventory', description: 'Manage school inventory and assets' },
  { id: 'adminLibrary', label: 'Library', description: 'Manage library books and circulation' },
  { id: 'adminHostel', label: 'Hostel Management', description: 'Manage hostels and allocations' },
  { id: 'adminHealth', label: 'Health & Medical', description: 'Master toggle for all health features' },
  { id: 'healthNurseVisits', label: 'Nurse Visits', description: 'Access to nurse visit logs' },
  { id: 'healthIncidents', label: 'Medical Incidents', description: 'Access to medical incidents' },
  { id: 'healthVaccinations', label: 'Vaccinations', description: 'Access to vaccination records' },
  { id: 'healthSpecialNeeds', label: 'Special Needs', description: 'Access to special needs records' },
  { id: 'healthAnalytics', label: 'Health Analytics', description: 'Access to health analytics dashboard' },
  { id: 'lessonPlans', label: 'Lesson Plans', description: 'View lesson plans' },
  { id: 'materials', label: 'Lesson Materials', description: 'View course materials' },
  { id: 'quizzes', label: 'Quizzes', description: 'View and take quizzes' },
  { id: 'studentReports', label: 'Student Reports', description: 'View student reports' },
];

// Features shown in each portal's customization panel
export const PORTAL_FEATURES = {
  teacher: [
    'assignments', 'grades', 'attendance', 'timetable', 'quizzes',
    'lessonPlans', 'materials', 'announcements', 'messages', 'eClass',
    'reportCards', 'studentReports', 'staffAttendance', 'leaveRequests',
  ],
  student: [
    'timetable', 'assignments', 'grades', 'quizzes', 'announcements',
    'materials', 'lessonPlans', 'messages', 'eClass', 'reportCards',
    'studentReports',
  ],
  parent: [
    'timetable', 'assignments', 'grades', 'attendance', 'announcements',
    'messages', 'reportCards', 'lessonPlans', 'studentReports', 'eClass',
  ],
};

export const PORTAL_LABELS = {
  teacher: 'Teacher Portal',
  student: 'Student Portal',
  parent: 'Parent Portal',
};