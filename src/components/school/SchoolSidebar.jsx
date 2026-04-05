import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentUser, getCurrentUser } from '@/lib/auth';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  FileText, ClipboardList, Megaphone, Settings, LogOut, X, School, Tag, Zap, UserCog, UserCheck, BarChart3, CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminNav = [
  { label: "Dashboard", path: "/school-admin", icon: LayoutDashboard },
  { label: "Teachers", path: "/school-admin/teachers", icon: Users },
  { label: "Students", path: "/school-admin/students", icon: GraduationCap },
  { label: "Classes", path: "/school-admin/classes", icon: BookOpen },
  { label: "Categories", path: "/school-admin/categories", icon: Tag },
  { label: "Subjects", path: "/school-admin/subjects", icon: ClipboardList },
  { label: "Teacher Assignments", path: "/school-admin/teacher-assignments", icon: UserCog },
  { label: "Bulk Assign", path: "/school-admin/bulk-assign", icon: Zap },
  { label: "Timetable", path: "/school-admin/timetable", icon: Calendar },
  { label: "Teacher Workload", path: "/school-admin/teacher-workload", icon: BarChart3 },
  { label: "Attendance", path: "/school-admin/attendance", icon: UserCheck },
  { label: "Student Reports", path: "/school-admin/student-reports", icon: BarChart3 },
  { label: "Assignments", path: "/school-admin/assignments", icon: FileText },
  { label: "Announcements", path: "/school-admin/announcements", icon: Megaphone },
  { label: "Calendar", path: "/school-admin/calendar", icon: CalendarDays },
  { label: "Settings", path: "/school-admin/settings", icon: Settings },
];

export default function SchoolSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  function handleLogout() {
    clearCurrentUser();
    navigate("/");
  }

  const isActive = (path) => {
    if (path === "/school-admin") return location.pathname === "/school-admin";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {adminNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user?.fullName || "Admin"}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ""}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}