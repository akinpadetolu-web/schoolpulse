import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import SchoolPortal from './pages/SchoolPortal';
import BackendLoginPage from './pages/BackendLogin';

// Backend Layout + Pages
import BackendLayout from './components/backend/BackendLayout';
import Overview from './pages/backend/Overview';
import Schools from './pages/backend/Schools';
import SchoolDetail from './pages/backend/SchoolDetail';
import SchoolAdmins from './pages/backend/SchoolAdmins';
import BackendTeachers from './pages/backend/Teachers';
import BackendStudents from './pages/backend/Students';
import BackendClasses from './pages/backend/Classes';
import AuditLogs from './pages/backend/AuditLogs';
import SupportTools from './pages/backend/SupportTools';
import BackendSettings from './pages/backend/BackendSettings';

// School Admin Layout + Pages
import SchoolLayout from './components/school/SchoolLayout';
import AdminDashboard from './pages/school-admin/AdminDashboard';
import AdminTeachers from './pages/school-admin/AdminTeachers';
import AdminStudents from './pages/school-admin/AdminStudents';
import AdminClasses from './pages/school-admin/AdminClasses';
import AdminCategories from './pages/school-admin/AdminCategories';
import AdminSubjects from './pages/school-admin/AdminSubjects';
import AdminTeacherAssignments from './pages/school-admin/AdminTeacherAssignments';
import AdminBulkAssign from './pages/school-admin/AdminBulkAssign';
import AdminTimetable from './pages/school-admin/AdminTimetable';
import AdminTeacherWorkload from './pages/school-admin/AdminTeacherWorkload';
import AdminAssignments from './pages/school-admin/AdminAssignments';
import AdminAttendance from './pages/school-admin/AdminAttendance';
import AdminStudentReports from './pages/school-admin/AdminStudentReports';
import AdminAnnouncements from './pages/school-admin/AdminAnnouncements';
import AdminGradeWeighting from './pages/school-admin/AdminGradeWeighting';
import AdminReportCards from './pages/school-admin/AdminReportCards';
import AdminSchoolReport from './pages/school-admin/AdminSchoolReport';
import AdminAcademicTerms from './pages/school-admin/AdminAcademicTerms';
import AdminSettings from './pages/school-admin/AdminSettings';

// Teacher Layout + Pages
import TeacherLayout from './components/teacher/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherGrades from './pages/teacher/TeacherGrades';
import TeacherMaterials from './pages/teacher/TeacherMaterials';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherLessonPlans from './pages/teacher/TeacherLessonPlans';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherSubmissions from './pages/teacher/TeacherSubmissions';
import TeacherNotifications from './pages/teacher/TeacherNotifications';
import TeacherProgressDashboard from './pages/teacher/TeacherProgressDashboard';
import TeacherExamResults from './pages/teacher/TeacherExamResults';
import SchoolCalendar from './pages/shared/SchoolCalendar';
import PerformanceDashboard from './pages/shared/PerformanceDashboard';

// Student Layout + Pages
import StudentLayout from './components/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentGrades from './pages/student/StudentGrades';
import StudentMaterials from './pages/student/StudentMaterials';
import StudentLessonPlans from './pages/student/StudentLessonPlans';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentQuizzes from './pages/student/StudentQuizzes';

// Parent Layout + Pages
import ParentLayout from './components/parent/ParentLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentTimetable from './pages/parent/ParentTimetable';
import ParentAssignments from './pages/parent/ParentAssignments';
import ParentGrades from './pages/parent/ParentGrades';
import ParentAnnouncements from './pages/parent/ParentAnnouncements';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
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
        <Route path="school-report" element={<AdminSchoolReport />} />
        <Route path="academic-terms" element={<AdminAcademicTerms />} />
        <Route path="calendar" element={<SchoolCalendar />} />
        <Route path="performance" element={<PerformanceDashboard />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Teacher */}
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="grades" element={<TeacherGrades />} />
        <Route path="materials" element={<TeacherMaterials />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="lesson-plans" element={<TeacherLessonPlans />} />
        <Route path="quizzes" element={<TeacherQuizzes />} />
        <Route path="submissions" element={<TeacherSubmissions />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="notifications" element={<TeacherNotifications />} />
        <Route path="progress" element={<TeacherProgressDashboard />} />
        <Route path="exam-results" element={<TeacherExamResults />} />
        <Route path="calendar" element={<SchoolCalendar />} />
        <Route path="performance" element={<PerformanceDashboard />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="grades" element={<StudentGrades />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="lesson-plans" element={<StudentLessonPlans />} />
        <Route path="quizzes" element={<StudentQuizzes />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="calendar" element={<SchoolCalendar />} />
      </Route>

      {/* Parent */}
      <Route path="/parent" element={<ParentLayout />}>
        <Route index element={<ParentDashboard />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="assignments" element={<ParentAssignments />} />
        <Route path="grades" element={<ParentGrades />} />
        <Route path="announcements" element={<ParentAnnouncements />} />
        <Route path="calendar" element={<SchoolCalendar />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;