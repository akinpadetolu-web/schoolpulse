import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  FileText, ClipboardList, Megaphone, LogOut, X, School, Tag, Zap, UserCog, UserCheck,   BarChart3, CalendarDays, TrendingUp, Award, PieChart, Briefcase, ArrowUpCircle, CheckSquare, Settings, Gauge, Clock, AlertCircle, MessageSquare, Mail, BookOpenCheck, DollarSign, Receipt, CreditCard, BarChart2, CalendarRange, Package, Heart, Home, Shield, Stethoscope, AlertTriangle, Syringe, Accessibility
} from 'lucide-react';
import { useExamTimetable } from '@/lib/examTimetableContext';
import { Button } from '@/components/ui/button';
import { SidebarNavGroups } from './SidebarWithGroups';
import UserAvatar from '@/components/common/UserAvatar';
import { getFeatures } from '@/lib/featureToggleManager';

const baseAdminNavGroups = [
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
      { label: "Sessions", path: "/school-admin/sessions", icon: CalendarRange },
      { label: "Timetable", path: "/school-admin/timetable", icon: Calendar },
      { label: "Exam Timetable", path: "/school-admin/exam-timetable", icon: BookOpenCheck },
      { label: "Calendar & Events", path: "/school-admin/events", icon: CalendarDays },
      { label: "Assignments", path: "/school-admin/assignments", icon: FileText },
      { label: "Grades", path: "/school-admin/grade-weighting", icon: Award },
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
    label: 'FINANCE',
    items: [
      { label: "Fee Management", path: "/school-admin/fee-management", icon: DollarSign },
      { label: "Invoices", path: "/school-admin/invoices", icon: Receipt },
      { label: "Payments", path: "/school-admin/payments", icon: CreditCard },
      { label: "Financial Reports", path: "/school-admin/financial-reports", icon: BarChart2 },
      { label: "Payment Settings", path: "/school-admin/payment-settings", icon: Settings },
    ]
  },
  {
    label: 'STAFF',
    items: [
      { label: "Non-Teaching Staff", path: "/school-admin/staff", icon: Users },
      { label: "Teacher Workload", path: "/school-admin/teacher-workload", icon: TrendingUp },
      { label: "Clock In/Out", path: "/school-admin/staff-attendance", icon: Clock },
      { label: "Leave Requests", path: "/school-admin/leave-requests", icon: AlertCircle },
      { label: "HR", path: "/school-admin/hr", icon: Briefcase },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: "Inventory", path: "/school-admin/inventory", icon: Package },
      { label: "Library", path: "/school-admin/library", icon: BookOpen },
      { label: "Health & Medical", path: "/school-admin/health", icon: Heart },
      { label: "Hostel Management", path: "/school-admin/hostel", icon: Home },
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
  "/school-admin/staff": "adminStaff",
  "/school-admin/settings": "adminSettings",
  "/school-admin/grading-system": "gradingSystem",
  "/school-admin/promotion": "promotion",
  "/school-admin/academic-terms": "academicTerms",
  "/school-admin/sessions": "adminSessions",
  "/school-admin/calendar": "adminEvents",
  "/school-admin/inventory": "adminInventory",
  "/school-admin/library": "adminLibrary",
  "/school-admin/health": "adminHealth",
  "/school-admin/hostel": "adminHostel",
  "/school-admin/fee-management": "adminFinance",
  "/school-admin/invoices": "adminFinance",
  "/school-admin/payments": "adminFinance",
  "/school-admin/financial-reports": "adminFinance",
  "/school-admin/payment-settings": "adminFinance",
  "/school-admin/staff-dashboard": "staffDashboard",
  };

export default function SchoolSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolUser: user, logout } = useSchoolAuth();
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const { examTimetable } = useExamTimetable(user?.schoolId);

  useEffect(() => {
    async function loadFeatures() {
      const enabledFeatures = await getFeatures(user?.schoolId, user?.role, user?.id);
      setFeatures(enabledFeatures);
      setLoading(false);
    }
    if (user?.schoolId) loadFeatures();
  }, [user?.schoolId, user?.role, user?.id]);

  // Health sub-navigation for hr_staff (nurse portal): each feature is a separate sidebar page
  const healthNavItems = [
    { label: "Health Analytics", path: "/school-admin/health-analytics", icon: BarChart3, feature: 'healthAnalytics' },
    { label: "Medical Records", path: "/school-admin/health-records", icon: Heart, feature: 'adminHealth' },
    { label: "Nurse Visits", path: "/school-admin/health-nurse-visits", icon: Stethoscope, feature: 'healthNurseVisits' },
    { label: "Incidents", path: "/school-admin/health-incidents", icon: AlertTriangle, feature: 'healthIncidents' },
    { label: "Vaccinations", path: "/school-admin/health-vaccinations", icon: Syringe, feature: 'healthVaccinations' },
    { label: "Special Needs", path: "/school-admin/health-special-needs", icon: Accessibility, feature: 'healthSpecialNeeds' },
  ];

  const adminNavGroups = user?.role === 'hr_staff'
    ? [
        ...baseAdminNavGroups.map(group => {
          const pf = user?.permittedFeatures || {};
          if (group.label === 'OPERATIONS') {
            const nonHealthItems = group.items
              .filter(item => item.path !== '/school-admin/health')
              .filter(item => {
                const requiredFeature = featureMap[item.path];
                if (!requiredFeature) return true;
                return pf[requiredFeature] === true;
              });
            const visibleHealthItems = healthNavItems.filter(item =>
              pf.adminHealth === true || pf[item.feature] === true
            );
            return { ...group, items: [...visibleHealthItems, ...nonHealthItems] };
          }
          return {
            ...group,
            items: group.items.filter(item => {
              const requiredFeature = featureMap[item.path];
              if (!requiredFeature) return item.path === '/school-admin';
              return pf[requiredFeature] === true;
            })
          };
        }).filter(g => g.items.length > 0),
        // "My Account" moved to the bottom
        { label: 'ACCOUNT', items: [{ label: 'My Account', path: '/school-admin/staff-dashboard', icon: UserCog }] }
      ]
    : baseAdminNavGroups;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const isActive = (path) => {
    if (path === "/school-admin") return location.pathname === "/school-admin";
    return location.pathname.startsWith(path);
  };

  const filteredNavGroups = user?.role === 'hr_staff'
    ? adminNavGroups // already filtered above for hr_staff
    : adminNavGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
          const requiredFeature = featureMap[item.path];
          if (!requiredFeature) return true;
          return features[requiredFeature] !== false;
        })
      })).filter(group => group.items.length > 0);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out z-50 md:relative md:translate-x-0 md:z-auto md:flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <img src="https://media.base44.com/images/public/69cf2d8364666b7e0d95357a/c559f9818_file_0000000038e0720cb05425162da2ee4d.png" alt="SEP" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <span className="font-bold text-sm">SchoolEduPulse</span>
              <p className="text-xs text-sidebar-foreground/60">{user?.role === 'hr_staff' ? (user?.jobTitle || 'Staff') : (user?.schoolName || "Admin Panel")}</p>
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