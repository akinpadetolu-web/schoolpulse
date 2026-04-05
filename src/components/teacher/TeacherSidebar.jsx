import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentUser, getCurrentUser } from '@/lib/auth';
import { LayoutDashboard, Calendar, FileText, BookOpen, ClipboardList, Megaphone, LogOut, X, GraduationCap, UserCheck, NotebookPen, Radio, Inbox, CalendarDays, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
  { label: "My Timetable", path: "/teacher/timetable", icon: Calendar },
  { label: "Assignments", path: "/teacher/assignments", icon: FileText },
  { label: "Submissions", path: "/teacher/submissions", icon: Inbox },
  { label: "Quizzes", path: "/teacher/quizzes", icon: Radio },
  { label: "Grades", path: "/teacher/grades", icon: ClipboardList },
  { label: "Materials", path: "/teacher/materials", icon: BookOpen },
  { label: "Attendance", path: "/teacher/attendance", icon: UserCheck },
  { label: "Lesson Plans", path: "/teacher/lesson-plans", icon: NotebookPen },
  { label: "Announcements", path: "/teacher/announcements", icon: Megaphone },
  { label: "Calendar", path: "/teacher/calendar", icon: CalendarDays },
  { label: "Performance", path: "/teacher/performance", icon: TrendingUp },
];

export default function TeacherSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const isActive = (path) => path === "/teacher" ? location.pathname === "/teacher" : location.pathname.startsWith(path);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-sidebar-primary" />
            <div>
              <span className="font-bold text-sm">Teacher Panel</span>
              <p className="text-xs text-sidebar-foreground/60">{user?.schoolName || ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2"><p className="text-sm font-medium truncate">{user?.fullName}</p><p className="text-xs text-sidebar-foreground/60">{user?.email}</p></div>
          <button onClick={() => { clearCurrentUser(); navigate("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full"><LogOut className="w-4 h-4" /> Sign Out</button>
        </div>
      </aside>
    </>
  );
}