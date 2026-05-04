import React from 'react';
import { BookOpen, Users, GraduationCap, ClipboardList, Calendar, FileText, ClipboardList as ClipboardListIcon, Megaphone, UserCog, Zap, Tag, ArrowUpCircle, MessageSquare, Mail, CheckSquare, TrendingUp, Clock, AlertCircle, Briefcase, Settings, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/card';

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", path: "/school-admin", feature: "adminDashboard" },
  { label: "Students", path: "/school-admin/students", feature: "adminStudents" },
  { label: "Teachers", path: "/school-admin/teachers", feature: "adminTeachers" },
  { label: "Classes", path: "/school-admin/classes", feature: "adminClasses" },
  { label: "Subjects", path: "/school-admin/subjects", feature: "adminSubjects" },
  { label: "Timetable", path: "/school-admin/timetable", feature: "timetable" },
  { label: "Calendar & Events", path: "/school-admin/events", feature: "adminEvents" },
  { label: "Assignments", path: "/school-admin/assignments", feature: "assignments" },
  { label: "Grades", path: "/school-admin/grade-weighting", feature: "grades" },
  { label: "Attendance", path: "/school-admin/attendance", feature: "attendance" },
  { label: "Examinations", path: "/school-admin/school-report", feature: "adminExaminations" },
  { label: "Report Cards", path: "/school-admin/report-cards", feature: "reportCards" },
  { label: "RC Templates", path: "/school-admin/report-card-templates", feature: "adminReportCardTemplates" },
  { label: "Teacher Assignments", path: "/school-admin/teacher-assignments", feature: "adminTeacherAssignments" },
  { label: "Bulk Assign", path: "/school-admin/bulk-assign", feature: "adminBulkAssign" },
  { label: "Categories", path: "/school-admin/categories", feature: "adminCategories" },
  { label: "E-Class", path: "/school-admin/e-class", feature: "eClass" },
  { label: "Announcements", path: "/school-admin/announcements", feature: "announcements" },
  { label: "Messages", path: "/school-admin/messages", feature: "messages" },
  { label: "Email Campaign", path: "/school-admin/email-campaign", feature: "adminEmailCampaign" },
  { label: "Approvals", path: "/school-admin/approvals", feature: "adminApprovals" },
  { label: "Teacher Workload", path: "/school-admin/teacher-workload", feature: "teacherWorkload" },
  { label: "Clock In/Out", path: "/school-admin/staff-attendance", feature: "staffAttendance" },
  { label: "Leave Requests", path: "/school-admin/leave-requests", feature: "leaveRequests" },
  { label: "HR", path: "/school-admin/hr", feature: "adminHR" },
  { label: "School Settings", path: "/school-admin/settings", feature: "adminSettings" },
  { label: "Grading System", path: "/school-admin/grading-system", feature: "gradingSystem" },
  { label: "Promotion", path: "/school-admin/promotion", feature: "promotion" },
  { label: "Academic Terms", path: "/school-admin/academic-terms", feature: "academicTerms" },
];

export default function SidebarPreview({ features }) {
  const visibleItems = ADMIN_NAV_ITEMS.filter(item => features[item.feature] !== false);
  const hiddenItems = ADMIN_NAV_ITEMS.filter(item => features[item.feature] === false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visible Items */}
        <Card className="border-0 shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-emerald-700">Visible Menu Items ({visibleItems.length})</h3>
          </div>
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto">
            {visibleItems.map(item => (
              <div key={item.feature} className="px-3 py-2 text-sm rounded-md bg-emerald-50 text-emerald-900">
                {item.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Hidden Items */}
        <Card className="border-0 shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-red-700">Hidden Menu Items ({hiddenItems.length})</h3>
          </div>
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto">
            {hiddenItems.map(item => (
              <div key={item.feature} className="px-3 py-2 text-sm rounded-md bg-red-50 text-red-900 line-through">
                {item.label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <div className="p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{visibleItems.length} of {ADMIN_NAV_ITEMS.length}</span> menu items will be visible with this feature configuration.
          </p>
        </div>
      </Card>
    </div>
  );
}