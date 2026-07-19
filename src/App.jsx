import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, Suspense, lazy } from 'react';
import React from 'react';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

import { SchoolAuthProvider } from '@/lib/SchoolAuthContext';
import FeatureGuard from '@/components/school/FeatureGuard';

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
const FeatureToggles = lazy(() => import('./pages/backend/FeatureToggles'));

// School Admin
const AdminDashboard = lazy(() => import('./pages/school-admin/AdminDashboard.jsx'));
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
const AdminSubjectWeights = lazy(() => import('./pages/school-admin/AdminSubjectWeights'));
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
const AdminStaff = lazy(() => import('./pages/school-admin/AdminStaff'));
const StaffDashboard = lazy(() => import('./pages/school-admin/StaffDashboard'));
const AdminSessions = lazy(() => import('./pages/school-admin/AdminSessions'));
const AdminFeeManagement = lazy(() => import('./pages/school-admin/AdminFeeManagement'));
const AdminInvoices = lazy(() => import('./pages/school-admin/AdminInvoices'));
const AdminPayments = lazy(() => import('./pages/school-admin/AdminPayments'));
const AdminFinancialReports = lazy(() => import('./pages/school-admin/AdminFinancialReports'));
const AdminPaymentSettings = lazy(() => import('./pages/school-admin/AdminPaymentSettings'));
const ParentFeesPayments = lazy(() => import('./pages/parent/ParentFeesPayments'));
const ParentHealth = lazy(() => import('./pages/parent/ParentHealth'));
const ParentHostel = lazy(() => import('./pages/parent/ParentHostel'));
const AdminStaffAttendance = lazy(() => import('./pages/school-admin/AdminStaffAttendance'));
const AdminLeaveRequests = lazy(() => import('./pages/school-admin/AdminLeaveRequests'));
const AdminEmailCampaign = lazy(() => import('./pages/school-admin/AdminEmailCampaign'));
const AdminExamTimetable = lazy(() => import('./pages/school-admin/AdminExamTimetable'));
const AdminReportCardTemplates = lazy(() => import('./pages/school-admin/AdminReportCardTemplates'));
const AdminInventory = lazy(() => import('./pages/school-admin/AdminInventory'));
const AdminLibrary = lazy(() => import('./pages/school-admin/AdminLibrary'));
const AdminHealth = lazy(() => import('./pages/school-admin/AdminHealth'));
const HealthRecordsPage = lazy(() => import('./pages/school-admin/health/MedicalRecordsPage'));
const NurseVisitsPage = lazy(() => import('./pages/school-admin/health/NurseVisitsPage'));
const IncidentsPage = lazy(() => import('./pages/school-admin/health/IncidentsPage'));
const VaccinationsPage = lazy(() => import('./pages/school-admin/health/VaccinationsPage'));
const SpecialNeedsPage = lazy(() => import('./pages/school-admin/health/SpecialNeedsPage'));
const HealthAnalyticsPage = lazy(() => import('./pages/school-admin/health/AnalyticsPage'));
const AdminHostel = lazy(() => import('./pages/school-admin/AdminHostel'));
const HostelDashboardPage = lazy(() => import('./pages/school-admin/hostel/HostelDashboardPage'));
const HostelHostelsPage = lazy(() => import('./pages/school-admin/hostel/HostelHostelsPage'));
const HostelAllocationsPage = lazy(() => import('./pages/school-admin/hostel/HostelAllocationsPage'));
const HostelTakeAttendancePage = lazy(() => import('./pages/school-admin/hostel/HostelTakeAttendancePage'));
const HostelAttendanceReportPage = lazy(() => import('./pages/school-admin/hostel/HostelAttendanceReportPage'));
const StudentReportCards = lazy(() => import('./pages/student/StudentReportCards'));
const StudentExamTimetable = lazy(() => import('./pages/student/StudentExamTimetable'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherClockInOut = lazy(() => import('./pages/teacher/TeacherClockInOut'));
const TeacherStudents = lazy(() => import('./pages/teacher/TeacherStudents'));
const TeacherTimetable = lazy(() => import('./pages/teacher/TeacherTimetable'));
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'));
const TeacherGrades = lazy(() => import('./pages/teacher/TeacherGrades'));
const TeacherMaterials = lazy(() => import('./pages/teacher/TeacherMaterials'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherLessonPlans = lazy(() => import('./pages/teacher/TeacherLessonPlans'));
const TeacherAnnouncements = lazy(() => import('./pages/teacher/TeacherAnnouncements'));
const TeacherQuizzes = lazy(() => import('./pages/teacher/TeacherQuizzes'));
const TeacherLibrary = lazy(() => import('./pages/teacher/TeacherLibrary'));
const TeacherQuizRemarks = lazy(() => import('./pages/teacher/TeacherQuizRemarks'));
const TeacherSubmissions = lazy(() => import('./pages/teacher/TeacherSubmissions'));
const TeacherNotifications = lazy(() => import('./pages/teacher/TeacherNotifications'));
const TeacherProgressDashboard = lazy(() => import('./pages/teacher/TeacherProgressDashboard'));
const TeacherExamResults = lazy(() => import('./pages/teacher/TeacherExamResults'));
const TeacherExamTimetable = lazy(() => import('./pages/teacher/TeacherExamTimetable'));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile'));
const TeacherSharedNotes = lazy(() => import('./pages/teacher/TeacherSharedNotes'));
const TeacherSettings = lazy(() => import('./pages/teacher/TeacherSettings'));
const SchoolCalendar = lazy(() => import('./pages/shared/SchoolCalendar'));
const PerformanceDashboard = lazy(() => import('./pages/shared/PerformanceDashboard'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentTimetable = lazy(() => import('./pages/student/StudentTimetable'));
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'));
const StudentGrades = lazy(() => import('./pages/student/StudentGrades'));
const StudentSubjects = lazy(() => import('./pages/student/StudentSubjects'));
const StudentGradeTrends = lazy(() => import('./pages/student/StudentGradeTrends'));
const StudentMaterials = lazy(() => import('./pages/student/StudentMaterials'));
const StudentAssignmentSummary = lazy(() => import('./pages/student/StudentAssignmentSummary'));
const StudentLessonPlans = lazy(() => import('./pages/student/StudentLessonPlans'));
const StudentAnnouncements = lazy(() => import('./pages/student/StudentAnnouncements'));
const StudentQuizzes = lazy(() => import('./pages/student/StudentQuizzes'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'));
const StudentNotes = lazy(() => import('./pages/student/StudentNotes'));
const StudentLibrary = lazy(() => import('./pages/student/StudentLibrary'));
const StudentGames = lazy(() => import('./pages/student/StudentGames'));
const StudentHostel = lazy(() => import('./pages/student/StudentHostel'));

// Parent
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentTimetable = lazy(() => import('./pages/parent/ParentTimetable'));
const ParentAssignments = lazy(() => import('./pages/parent/ParentAssignments'));
const ParentGrades = lazy(() => import('./pages/parent/ParentGrades'));
const ParentNotifications = lazy(() => import('./pages/parent/ParentNotifications'));
const ParentProfile = lazy(() => import('./pages/parent/ParentProfile'));
const ParentMessaging = lazy(() => import('./pages/parent/ParentMessaging'));
const ParentReportCards = lazy(() => import('./pages/parent/ParentReportCards'));
const ParentExamTimetable = lazy(() => import('./pages/parent/ParentExamTimetable'));
const ParentAttendance = lazy(() => import('./pages/parent/ParentAttendance'));
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
          <Route path="feature-toggles" element={<FeatureToggles />} />
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
          <Route path="timetable" element={<FeatureGuard path="/school-admin/timetable"><AdminTimetable /></FeatureGuard>} />
          <Route path="teacher-workload" element={<FeatureGuard path="/school-admin/teacher-workload"><AdminTeacherWorkload /></FeatureGuard>} />
          <Route path="assignments" element={<FeatureGuard path="/school-admin/assignments"><AdminAssignments /></FeatureGuard>} />
          <Route path="attendance" element={<FeatureGuard path="/school-admin/attendance"><AdminAttendance /></FeatureGuard>} />
          <Route path="student-reports" element={<FeatureGuard path="/school-admin/student-reports"><AdminStudentReports /></FeatureGuard>} />
          <Route path="announcements" element={<FeatureGuard path="/school-admin/announcements"><AdminAnnouncements /></FeatureGuard>} />
          <Route path="grade-weighting" element={<FeatureGuard path="/school-admin/grade-weighting"><AdminGradeWeighting /></FeatureGuard>} />
          <Route path="subject-weights" element={<AdminSubjectWeights />} />
          <Route path="report-cards" element={<FeatureGuard path="/school-admin/report-cards"><AdminReportCards /></FeatureGuard>} />
          <Route path="report-card-templates" element={<AdminReportCardTemplates />} />
          <Route path="school-report" element={<AdminSchoolReport />} />
          <Route path="approvals" element={<FeatureGuard path="/school-admin/approvals"><AdminApprovals /></FeatureGuard>} />
          <Route path="academic-terms" element={<AdminAcademicTerms />} />
          <Route path="calendar" element={<SchoolCalendar />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="grading-system" element={<AdminGradingSystem />} />
          <Route path="promotion" element={<AdminPromotion />} />
          <Route path="hr" element={<AdminHR />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="staff-dashboard" element={<StaffDashboard />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="fee-management" element={<AdminFeeManagement />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="financial-reports" element={<AdminFinancialReports />} />
          <Route path="payment-settings" element={<AdminPaymentSettings />} />
          <Route path="staff-attendance" element={<AdminStaffAttendance />} />
          <Route path="leave-requests" element={<AdminLeaveRequests />} />
          <Route path="email-campaign" element={<FeatureGuard path="/school-admin/email-campaign"><AdminEmailCampaign /></FeatureGuard>} />
          <Route path="exam-timetable" element={<AdminExamTimetable />} />
          <Route path="e-class" element={<FeatureGuard path="/school-admin/e-class"><AdminEClass /></FeatureGuard>} />
          <Route path="messages" element={<FeatureGuard path="/school-admin/messages"><AdminMessaging /></FeatureGuard>} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="library" element={<AdminLibrary />} />
          <Route path="health" element={<AdminHealth />} />
          <Route path="health-records" element={<HealthRecordsPage />} />
          <Route path="health-nurse-visits" element={<NurseVisitsPage />} />
          <Route path="health-incidents" element={<IncidentsPage />} />
          <Route path="health-vaccinations" element={<VaccinationsPage />} />
          <Route path="health-special-needs" element={<SpecialNeedsPage />} />
          <Route path="health-analytics" element={<HealthAnalyticsPage />} />
          <Route path="hostel" element={<AdminHostel />} />
          <Route path="hostel-dashboard" element={<HostelDashboardPage />} />
          <Route path="hostel-hostels" element={<HostelHostelsPage />} />
          <Route path="hostel-allocations" element={<HostelAllocationsPage />} />
          <Route path="hostel-take-attendance" element={<HostelTakeAttendancePage />} />
          <Route path="hostel-attendance-report" element={<HostelAttendanceReportPage />} />
          <Route path="events" element={<AdminCalendar />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="clock-in-out" element={<TeacherClockInOut />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="grades" element={<TeacherGrades />} />
          <Route path="materials" element={<TeacherMaterials />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="lesson-plans" element={<TeacherLessonPlans />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="quiz-remarks" element={<TeacherQuizRemarks />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
          <Route path="e-class" element={<TeacherEClass />} />
          <Route path="library" element={<TeacherLibrary />} />
          <Route path="notifications" element={<TeacherNotifications />} />
          <Route path="progress" element={<TeacherProgressDashboard />} />
          <Route path="exam-results" element={<TeacherExamResults />} />
          <Route path="exam-timetable" element={<TeacherExamTimetable />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="settings" element={<TeacherSettings />} />
          <Route path="shared-notes" element={<TeacherSharedNotes />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="assignment-summary" element={<StudentAssignmentSummary />} />
          <Route path="grades" element={<StudentGrades />} />
          <Route path="subjects" element={<StudentSubjects />} />
          <Route path="grade-trends" element={<StudentGradeTrends />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="lesson-plans" element={<StudentLessonPlans />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
          <Route path="e-class" element={<StudentEClass />} />
          <Route path="calendar" element={<StudentCalendar />} />
          <Route path="report-cards" element={<StudentReportCards />} />
          <Route path="exam-timetable" element={<StudentExamTimetable />} />
          <Route path="notes" element={<StudentNotes />} />
          <Route path="library" element={<StudentLibrary />} />
          <Route path="games" element={<StudentGames />} />
          <Route path="hostel" element={<StudentHostel />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        {/* Parent */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="timetable" element={<ParentTimetable />} />
          <Route path="assignments" element={<ParentAssignments />} />
          <Route path="grades" element={<ParentGrades />} />
          <Route path="notifications" element={<ParentNotifications />} />
          <Route path="messages" element={<ParentMessaging />} />
          <Route path="report-cards" element={<ParentReportCards />} />
          <Route path="exam-timetable" element={<ParentExamTimetable />} />
          <Route path="attendance" element={<ParentAttendance />} />
          <Route path="lesson-plans" element={<ParentLessonPlans />} />
          <Route path="e-class" element={<ParentEClass />} />
          <Route path="fees-payments" element={<ParentFeesPayments />} />
          <Route path="health" element={<ParentHealth />} />
          <Route path="hostel" element={<ParentHostel />} />
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