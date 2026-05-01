import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { LayoutDashboard, Calendar, FileText, BookOpen, ClipboardList, Megaphone, LogOut, X, GraduationCap, UserCheck, NotebookPen, Radio, Inbox, CalendarDays, Bell, BarChart3, Award, Video, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNavGroups } from '@/components/school/SidebarWithGroups';
import UserAvatar from '@/components/common/UserAvatar';

const teacherNavGroups = [
  {
    label: 'MAIN',
    items: [
      { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
      { label: "My Classes", path: "/teacher", icon: BookOpen },
      { label: "My Students", path: "/teacher", icon: Users },
    ]
  },
  {
    label: 'ACADEMIC',
    items: [
      { label: "Timetable", path: "/teacher/timetable", icon: Calendar },
      { label: "Assignments", path: "/teacher/assignments", icon: FileText },
      { label: "Grades", path: "/teacher/grades", icon: ClipboardList },
      { label: "Attendance", path: "/teacher/attendance", icon: UserCheck },
      { label: "E-Class", path: "/teacher/e-class", icon: Video },
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { label: "Announcements", path: "/teacher/announcements", icon: Megaphone },
      { label: "Notifications", path: "/teacher/notifications", icon: Bell },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: "Profile", path: "/teacher/profile", icon: GraduationCap },
      { label: "Settings", path: "/teacher", icon: Settings },
    ]
  },
];

export default function TeacherSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolUser: user, logout } = useSchoolAuth();

  const isActive = (path) => path === "/teacher" ? location.pathname === "/teacher" : location.pathname.startsWith(path);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />}
      <aside className={`fixed top-0 left-0 h-screen w-[80vw] max-w-xs bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:translate-x-0 md:relative md:w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-sidebar-primary" />
            <div>
              <span className="font-bold text-sm">Teacher Panel</span>
              <p className="text-xs text-sidebar-foreground/60">{user?.schoolName || ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose} aria-label="Close sidebar"><X className="w-5 h-5" aria-hidden="true" /></Button>
        </div>
        <SidebarNavGroups 
          groups={teacherNavGroups}
          isActive={isActive}
          onItemClick={onClose}
        />
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <UserAvatar user={user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full"><LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out</button>
        </div>
      </aside>
    </>
  );
}