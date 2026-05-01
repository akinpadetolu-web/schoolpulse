import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { LayoutDashboard, Calendar, FileText, BookOpen, ClipboardList, Megaphone, LogOut, X, GraduationCap, NotebookPen, Radio, CalendarDays, Video, Bell, Settings, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarNavGroups } from '@/components/school/SidebarWithGroups';
import UserAvatar from '@/components/common/UserAvatar';

const studentNavGroups = [
  {
    label: 'MAIN',
    items: [
      { label: "Dashboard", path: "/student", icon: LayoutDashboard },
      { label: "My Classes", path: "/student", icon: BookOpen },
    ]
  },
  {
    label: 'ACADEMIC',
    items: [
      { label: "Timetable", path: "/student/timetable", icon: Calendar },
      { label: "Assignments", path: "/student/assignments", icon: FileText },
      { label: "Grades", path: "/student/grades", icon: ClipboardList },
      { label: "Attendance", path: "/student/timetable", icon: UserCheck },
      { label: "E-Class", path: "/student/e-class", icon: Video },
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { label: "Announcements", path: "/student/announcements", icon: Megaphone },
      { label: "Notifications", path: "/student/announcements", icon: Bell },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: "Profile", path: "/student/profile", icon: GraduationCap },
      { label: "Settings", path: "/student", icon: Settings },
    ]
  },
];


export default function StudentSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolUser: user, logout } = useSchoolAuth();
  const isActive = (path) => path === "/student" ? location.pathname === "/student" : location.pathname.startsWith(path);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-sidebar-primary" />
            <div><span className="font-bold text-sm">Student Portal</span><p className="text-xs text-sidebar-foreground/60">{user?.schoolName}</p></div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose} aria-label="Close sidebar"><X className="w-5 h-5" aria-hidden="true" /></Button>
        </div>
        <SidebarNavGroups 
          groups={studentNavGroups}
          isActive={isActive}
          onItemClick={onClose}
        />
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <UserAvatar user={user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-sidebar-foreground/60">{user?.className || ""}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full"><LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out</button>
        </div>
      </aside>
    </>
  );
}