import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  FileText, ClipboardList, Megaphone, LogOut, X, School, Tag, Zap, UserCog, UserCheck, BarChart3, CalendarDays, TrendingUp, Award, PieChart, Briefcase, ArrowUpCircle, CheckSquare, Settings, Gauge, Clock, AlertCircle, MessageSquare, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNavGroups } from './SidebarWithGroups';
import UserAvatar from '@/components/common/UserAvatar';
import { getFeatures } from '@/lib/featureToggleManager';

const adminNavGroups = [
  {
    label: 'MAIN',
    items: [
      { label: "Dashboard", path: "/school-admin", icon: LayoutDashboard },
      { label: "Students", path: "/school-admin/students", icon: GraduationCap },
      { label: "Teachers", path: "/school-admin/teachers", icon: Users },
      { label: "Classes", path: "/school-admin/classes", icon: BookOpen },
      { label: "Subjects", path: "/school-admin/subjects", icon: ClipboardList },
    ]
  },
  {
    label: 'ACADEMIC',
    items: [
      { label: "Timetable", path: "/school-admin/timetable", icon: Calendar },
      { label: "Calendar & Events", path: "/school-admin/events", icon: CalendarDays },
      { label: "Assignments", path: "/school-admin/assignments", icon: FileText },
      { label: "Grades", path: "/school-admin/grade-weighting", icon: Award },
      { label: "Subject Weights", path: "/school-admin/subject-weights", icon: PieChart },
      { label: "Attendance", path: "/school-admin/attendance", icon: UserCheck },
      { label: "Examinations", path: "/school-admin/school-report", icon: PieChart },
      { label: "Report Cards", path: "/school-admin/report-cards", icon: FileText },
      { label: "RC Templates", path: "/school-admin/report-card-templates", icon: ClipboardList },
    ]
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: "Teacher Assignments", path: "/school-admin/teacher-assignments", icon: UserCog },
      { label: "Bulk Assign", path: "/school-admin/bulk-assign", icon: Zap },
      { label: "Categories", path: "/school-admin/categories", icon: Tag },
      { label: "E-Class", path: "/school-admin/e-class", icon: ArrowUpCircle },
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { label: "Announcements", path: "/school-admin/announcements", icon: Megaphone },
      { label: "Messages", path: "/school-admin/messages", icon: MessageSquare },
      { label: "Email Campaign", path: "/school-admin/email-campaign", icon: Mail },
      { label: "Notifications", path: "/school-admin/approvals", icon: CheckSquare },
    ]
  },
  {
    label: 'STAFF',
    items: [
      { label: "Teacher Workload", path: "/school-admin/teacher-workload", icon: TrendingUp },
      { label: "Clock In/Out", path: "/school-admin/staff-attendance", icon: Clock },
      { label: "Leave Requests", path: "/school-admin/leave-requests", icon: AlertCircle },
      { label: "HR", path: "/school-admin/hr", icon: Briefcase },
    ]
  },
  {
    label: 'SETTINGS',
    items: [
      { label: "School Settings", path: "/school-admin/settings", icon: Settings },
      { label: "Feature Controls", path: "/school-admin/grading-system", icon: Gauge },
    ]
  },
];

const featureMap = {
  "/school-admin": "adminDashboard",
  "/school-admin/students": "adminStudents",
  "/school-admin/teachers": "adminTeachers",
  "/school-admin/classes": "adminClasses",
  "/school-admin/subjects": "adminSubjects",
  "/school-admin/timetable": "timetable",
  "/school-admin/events": "adminEvents",
  "/school-admin/assignments": "assignments",
  "/school-admin/grade-weighting": "grades",
  "/school-admin/grades": "grades",
  "/school-admin/subject-weights": "grades",
  "/school-admin/attendance": "attendance",
  "/school-admin/school-report": "adminExaminations",
  "/school-admin/report-cards": "reportCards",
  "/school-admin/report-card-templates": "adminReportCardTemplates",
  "/school-admin/teacher-assignments": "adminTeacherAssignments",
  "/school-admin/bulk-assign": "adminBulkAssign",
  "/school-admin/categories": "adminCategories",
  "/school-admin/e-class": "eClass",
  "/school-admin/announcements": "announcements",
  "/school-admin/messages": "messages",
  "/school-admin/email-campaign": "adminEmailCampaign",
  "/school-admin/approvals": "adminApprovals",
  "/school-admin/teacher-workload": "teacherWorkload",
  "/school-admin/staff-attendance": "staffAttendance",
  "/school-admin/leave-requests": "leaveRequests",
  "/school-admin/hr": "adminHR",
  "/school-admin/settings": "adminSettings",
  "/school-admin/grading-system": "gradingSystem",
  "/school-admin/promotion": "promotion",
  "/school-admin/academic-terms": "academicTerms",
  "/school-admin/calendar": "adminEvents",
};

export default function SchoolSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolUser: user, logout } = useSchoolAuth();
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatures() {
      const enabledFeatures = await getFeatures(user?.schoolId, user?.role, user?.id);
      setFeatures(enabledFeatures);
      setLoading(false);
    }
    if (user?.schoolId) loadFeatures();
  }, [user?.schoolId, user?.role, user?.id]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const isActive = (path) => {
    if (path === "/school-admin") return location.pathname === "/school-admin";
    return location.pathname.startsWith(path);
  };

  const filteredNavGroups = adminNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const requiredFeature = featureMap[item.path];
      if (!requiredFeature) return true;
      return features[requiredFeature] !== false;
    })
  })).filter(group => group.items.length > 0);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out z-50 md:relative md:translate-x-0 md:z-auto md:flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <School className="w-6 h-6 text-sidebar-primary" />
            <div>
              <span className="font-bold text-sm">{user?.schoolName || "School"}</span>
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="p-4 text-xs text-sidebar-foreground/60">Loading menu...</div>
          ) : (
            <SidebarNavGroups 
              groups={filteredNavGroups}
              isActive={isActive}
              onItemClick={onClose}
            />
          )}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <UserAvatar user={user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || "Admin"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ""}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}