import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { LayoutDashboard, Calendar, FileText, BookOpen, ClipboardList, Megaphone, LogOut, X, GraduationCap, UserCheck, NotebookPen, Radio, Inbox, CalendarDays, Bell, BarChart3, Award, Video, Users, Settings, HelpCircle, Share2, BookOpenCheck, MessageSquare } from 'lucide-react';
import { useExamTimetable } from '@/lib/examTimetableContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SidebarNavGroups } from '@/components/school/SidebarWithGroups';
import UserAvatar from '@/components/common/UserAvatar';

const baseTeacherNavGroups = [
  {
    label: 'MAIN',
    items: [
      { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
      { label: "My Students", path: "/teacher/students", icon: Users },
    ]
  },
  {
    label: 'ACADEMIC',
    items: [
      { label: "Timetable", path: "/teacher/timetable", icon: Calendar },
      { label: "Exam Timetable", path: "/teacher/exam-timetable", icon: Calendar, examOnly: true },
      { label: "School Calendar", path: "/teacher/calendar", icon: CalendarDays },
      { label: "Lesson Plans", path: "/teacher/lesson-plans", icon: BookOpen },
      { label: "Assignments", path: "/teacher/assignments", icon: FileText },
      { label: "Grades", path: "/teacher/grades", icon: ClipboardList },
      { label: "Submissions", path: "/teacher/submissions", icon: NotebookPen },
      { label: "Attendance", path: "/teacher/attendance", icon: UserCheck },
      { label: "Quizzes", path: "/teacher/quizzes", icon: HelpCircle },
      { label: "Quiz Remarks", path: "/teacher/quiz-remarks", icon: MessageSquare },
      { label: "E-Class", path: "/teacher/e-class", icon: Video },
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { label: "Announcements", path: "/teacher/announcements", icon: Megaphone },
      { label: "Notifications", path: "/teacher/notifications", icon: Bell },
      { label: "Shared Notes", path: "/teacher/shared-notes", icon: Share2 },
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
  const { examTimetable } = useExamTimetable(user?.schoolId);

  const teacherNavGroups = baseTeacherNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.examOnly || !!examTimetable),
  }));

  const isActive = (path) => path === "/teacher" ? location.pathname === "/teacher" : location.pathname.startsWith(path);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0 md:z-auto md:flex-shrink-0"
      )}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <img src="https://media.base44.com/images/public/69cf2d8364666b7e0d95357a/c559f9818_file_0000000038e0720cb05425162da2ee4d.png" alt="SEP" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <span className="font-bold text-sm">SchoolEduPulse</span>
              <p className="text-xs text-sidebar-foreground/60">{user?.schoolName || ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose} aria-label="Close sidebar"><X className="w-5 h-5" aria-hidden="true" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <SidebarNavGroups 
            groups={teacherNavGroups}
            isActive={isActive}
            onItemClick={onClose}
          />
        </div>
        <div className="p-3 border-t border-sidebar-border shrink-0">
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