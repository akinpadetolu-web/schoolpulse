import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, Suspense, lazy } from 'react';
import React from 'react';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

import { SchoolAuthProvider } from '@/lib/SchoolAuthContext';

import InstallPrompt from '@/components/pwa/InstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import UpdatePrompt from '@/components/pwa/UpdatePrompt';
import { initializePWA } from '@/lib/pwaManager';

// Eagerly loaded layouts (small, needed immediately)
import BackendLayout from './components/backend/BackendLayout';
import SchoolLayout from './components/school/SchoolLayout';
import TeacherLayout from './components/teacher/TeacherLayout';
import StudentLayout from './components/student/StudentLayout';
import ParentLayout from './components/parent/ParentLayout';

// Lazily loaded pages
const SchoolPortal = lazy(() => import('./pages/SchoolPortal'));
const BackendLoginPage = lazy(() => import('./pages/BackendLogin'));

// Backend
const Overview = lazy(() => import('./pages/backend/Overview'));
const Schools = lazy(() => import('./pages/backend/Schools'));
const SchoolDetail = lazy(() => import('./pages/backend/SchoolDetail'));
const SchoolAdmins = lazy(() => import('./pages/backend/SchoolAdmins'));
const BackendTeachers = lazy(() => import('./pages/backend/Teachers'));
const BackendStudents = lazy(() => import('./pages/backend/Students'));
const BackendClasses = lazy(() => import('./pages/backend/Classes'));
const AuditLogs = lazy(() => import('./pages/backend/AuditLogs'));
const SupportTools = lazy(() => import('./pages/backend/SupportTools'));
const BackendSettings = lazy(() => import('./pages/backend/BackendSettings'));

// School Admin
const AdminDashboard = lazy(() => import('./pages/school-admin/AdminDashboard'));
const AdminTeachers = lazy(() => import('./pages/school-admin/AdminTeachers'));
const AdminStudents = lazy(() => import('./pages/school-admin/AdminStudents'));
const AdminBulkStudentImport = lazy(() => import('./pages/school-admin/AdminBulkStudentImport'));
const AdminClasses = lazy(() => import('./pages/school-admin/AdminClasses'));
const AdminCategories = lazy(() => import('./pages/school-admin/AdminCategories'));
const AdminSubjects = lazy(() => import('./pages/school-admin/AdminSubjects'));
const AdminTeacherAssignments = lazy(() => import('./pages/school-admin/AdminTeacherAssignments'));
const AdminBulkAssign = lazy(() => import('./pages/school-admin/AdminBulkAssign'));
const AdminTimetable = lazy(() => import('./pages/school-admin/AdminTimetable'));
const AdminTeacherWorkload = lazy(() => import('./pages/school-admin/AdminTeacherWorkload'));
const AdminAssignments = lazy(() => import('./pages/school-admin/AdminAssignments'));
const AdminAttendance = lazy(() => import('./pages/school-admin/AdminAttendance'));
const AdminStudentReports = lazy(() => import('./pages/school-admin/AdminStudentReports'));
const AdminAnnouncements = lazy(() => import('./pages/school-admin/AdminAnnouncements'));
const AdminGradeWeighting = lazy(() => import('./pages/school-admin/AdminGradeWeighting'));
const AdminReportCards = lazy(() => import('./pages/school-admin/AdminReportCards'));
const AdminSchoolReport = lazy(() => import('./pages/school-admin/AdminSchoolReport'));
const AdminApprovals = lazy(() => import('./pages/school-admin/AdminApprovals'));
const AdminEClass = lazy(() => import('./pages/school-admin/AdminEClass'));
const TeacherEClass = lazy(() => import('./pages/teacher/TeacherEClass'));
const StudentEClass = lazy(() => import('./pages/student/StudentEClass'));
const ParentEClass = lazy(() => import('./pages/parent/ParentEClass'));
const AdminAcademicTerms = lazy(() => import('./pages/school-admin/AdminAcademicTerms'));
const AdminSettings = lazy(() => import('./pages/school-admin/AdminSettings'));
const AdminGradingSystem = lazy(() => import('./pages/school-admin/AdminGradingSystem'));
const AdminPromotion = lazy(() => import('./pages/school-admin/AdminPromotion'));
const AdminHR = lazy(() => import('./pages/school-admin/AdminHR'));
const AdminStaffAttendance = lazy(() => import('./pages/school-admin/AdminStaffAttendance'));
const AdminLeaveRequests = lazy(() => import('./pages/school-admin/AdminLeaveRequests'));
const AdminEmailCampaign = lazy(() => import('./pages/school-admin/AdminEmailCampaign'));
const AdminReportCardTemplates = lazy(() => import('./pages/school-admin/AdminReportCardTemplates'));
const StudentReportCards = lazy(() => import('./pages/student/StudentReportCards'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherStudents = lazy(() => import('./pages/teacher/TeacherStudents'));
const TeacherTimetable = lazy(() => import('./pages/teacher/TeacherTimetable'));
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'));
const TeacherGrades = lazy(() => import('./pages/teacher/TeacherGrades'));
const TeacherMaterials = lazy(() => import('./pages/teacher/TeacherMaterials'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherLessonPlans = lazy(() => import('./pages/teacher/TeacherLessonPlans'));
const TeacherAnnouncements = lazy(() => import('./pages/teacher/TeacherAnnouncements'));
const TeacherQuizzes = lazy(() => import('./pages/teacher/TeacherQuizzes'));
const TeacherSubmissions = lazy(() => import('./pages/teacher/TeacherSubmissions'));
const TeacherNotifications = lazy(() => import('./pages/teacher/TeacherNotifications'));
const TeacherProgressDashboard = lazy(() => import('./pages/teacher/TeacherProgressDashboard'));
const TeacherExamResults = lazy(() => import('./pages/teacher/TeacherExamResults'));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile'));
const TeacherSharedNotes = lazy(() => import('./pages/teacher/TeacherSharedNotes'));
const SchoolCalendar = lazy(() => import('./pages/shared/SchoolCalendar'));
const PerformanceDashboard = lazy(() => import('./pages/shared/PerformanceDashboard'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentTimetable = lazy(() => import('./pages/student/StudentTimetable'));
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'));
const StudentGrades = lazy(() => import('./pages/student/StudentGrades'));
const StudentGradeTrends = lazy(() => import('./pages/student/StudentGradeTrends'));
const StudentMaterials = lazy(() => import('./pages/student/StudentMaterials'));
const StudentAssignmentSummary = lazy(() => import('./pages/student/StudentAssignmentSummary'));
const StudentLessonPlans = lazy(() => import('./pages/student/StudentLessonPlans'));
const StudentAnnouncements = lazy(() => import('./pages/student/StudentAnnouncements'));
const StudentQuizzes = lazy(() => import('./pages/student/StudentQuizzes'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'));
const StudentNotes = lazy(() => import('./pages/student/StudentNotes'));

// Parent
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentTimetable = lazy(() => import('./pages/parent/ParentTimetable'));
const ParentAssignments = lazy(() => import('./pages/parent/ParentAssignments'));
const ParentGrades = lazy(() => import('./pages/parent/ParentGrades'));
const ParentAnnouncements = lazy(() => import('./pages/parent/ParentAnnouncements'));
const ParentProfile = lazy(() => import('./pages/parent/ParentProfile'));
const ParentMessaging = lazy(() => import('./pages/parent/ParentMessaging'));
const ParentReportCards = lazy(() => import('./pages/parent/ParentReportCards'));
const ParentLessonPlans = lazy(() => import('./pages/parent/ParentLessonPlans'));
const ParentSettings = lazy(() => import('./pages/parent/ParentSettings'));
const AdminMessaging = lazy(() => import('./pages/school-admin/AdminMessaging'));
const AdminCalendar = lazy(() => import('./pages/school-admin/AdminCalendar'));
const TeacherCalendar = lazy(() => import('./pages/teacher/TeacherCalendar'));
const StudentCalendar = lazy(() => import('./pages/student/StudentCalendar'));
const ParentCalendar = lazy(() => import('./pages/parent/ParentCalendar'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full py-20">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

const AuthenticatedApp = () => {
  return (
    <>
      <DarkModeDetector />
      <PWAInitializer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<SchoolPortal />} />
          <Route path="/sp-backend" element={<BackendLoginPage />} />

        {/* Backend Super Admin */}
        <Route path="/backend" element={<BackendLayout />}>
          <Route index element={<Overview />} />
          <Route path="schools" element={<Schools />} />
          <Route path="schools/:schoolId" element={<SchoolDetail />} />
          <Route path="school-admins" element={<SchoolAdmins />} />
          <Route path="teachers" element={<BackendTeachers />} />
          <Route path="students" element={<BackendStudents />} />
          <Route path="classes" element={<BackendClasses />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="support" element={<SupportTools />} />
          <Route path="settings" element={<BackendSettings />} />
        </Route>

        {/* School Admin */}
        <Route path="/school-admin" element={<SchoolLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="bulk-import-students" element={<AdminBulkStudentImport />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="subjects" element={<AdminSubjects />} />
          <Route path="teacher-assignments" element={<AdminTeacherAssignments />} />
          <Route path="bulk-assign" element={<AdminBulkAssign />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="teacher-workload" element={<AdminTeacherWorkload />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="student-reports" element={<AdminStudentReports />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="grade-weighting" element={<AdminGradeWeighting />} />
          <Route path="report-cards" element={<AdminReportCards />} />
          <Route path="report-card-templates" element={<AdminReportCardTemplates />} />
          <Route path="school-report" element={<AdminSchoolReport />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="academic-terms" element={<AdminAcademicTerms />} />
          <Route path="calendar" element={<SchoolCalendar />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="grading-system" element={<AdminGradingSystem />} />
          <Route path="promotion" element={<AdminPromotion />} />
          <Route path="hr" element={<AdminHR />} />
          <Route path="staff-attendance" element={<AdminStaffAttendance />} />
          <Route path="leave-requests" element={<AdminLeaveRequests />} />
          <Route path="email-campaign" element={<AdminEmailCampaign />} />
          <Route path="e-class" element={<AdminEClass />} />
          <Route path="messages" element={<AdminMessaging />} />
          <Route path="events" element={<AdminCalendar />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="grades" element={<TeacherGrades />} />
          <Route path="materials" element={<TeacherMaterials />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="lesson-plans" element={<TeacherLessonPlans />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
          <Route path="e-class" element={<TeacherEClass />} />
          <Route path="notifications" element={<TeacherNotifications />} />
          <Route path="progress" element={<TeacherProgressDashboard />} />
          <Route path="exam-results" element={<TeacherExamResults />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="shared-notes" element={<TeacherSharedNotes />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="assignment-summary" element={<StudentAssignmentSummary />} />
          <Route path="grades" element={<StudentGrades />} />
          <Route path="grade-trends" element={<StudentGradeTrends />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="lesson-plans" element={<StudentLessonPlans />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
          <Route path="e-class" element={<StudentEClass />} />
          <Route path="calendar" element={<StudentCalendar />} />
          <Route path="report-cards" element={<StudentReportCards />} />
          <Route path="notes" element={<StudentNotes />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        {/* Parent */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="timetable" element={<ParentTimetable />} />
          <Route path="assignments" element={<ParentAssignments />} />
          <Route path="grades" element={<ParentGrades />} />
          <Route path="announcements" element={<ParentAnnouncements />} />
          <Route path="messages" element={<ParentMessaging />} />
          <Route path="report-cards" element={<ParentReportCards />} />
          <Route path="lesson-plans" element={<ParentLessonPlans />} />
          <Route path="e-class" element={<ParentEClass />} />
          <Route path="calendar" element={<ParentCalendar />} />
          <Route path="profile" element={<ParentProfile />} />
          <Route path="settings" element={<ParentSettings />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

function DarkModeDetector() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return null;
}

function PWAInitializer() {
  useEffect(() => {
    initializePWA().catch(err => console.error('[PWA] Initialization failed:', err));
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <SchoolAuthProvider>
        <Router>
          <AuthenticatedApp />
          <OfflineIndicator />
          <InstallPrompt />
          <UpdatePrompt />
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </Router>
      </SchoolAuthProvider>
    </QueryClientProvider>
  );
}

export default App;