import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Calendar, Bell, GraduationCap } from 'lucide-react';

const teacherTabs = [
  { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
  { label: "Assignments", path: "/teacher/assignments", icon: FileText },
  { label: "Timetable", path: "/teacher/timetable", icon: Calendar },
  { label: "Notifications", path: "/teacher/notifications", icon: Bell },
];

const studentTabs = [
  { label: "Dashboard", path: "/student", icon: LayoutDashboard },
  { label: "Assignments", path: "/student/assignments", icon: FileText },
  { label: "Timetable", path: "/student/timetable", icon: Calendar },
  { label: "Grades", path: "/student/grades", icon: GraduationCap },
  { label: "More", path: "/student/profile", icon: Bell },
];

const parentTabs = [
  { label: "Dashboard", path: "/parent", icon: LayoutDashboard },
  { label: "Assignments", path: "/parent/assignments", icon: FileText },
  { label: "Timetable", path: "/parent/timetable", icon: Calendar },
  { label: "Grades", path: "/parent/grades", icon: GraduationCap },
];

export default function MobileBottomNav({ role }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = role === 'teacher' ? teacherTabs : role === 'student' ? studentTabs : parentTabs;

  const isActive = (tab) =>
    tab.path === `/${role}` ? location.pathname === `/${role}` : location.pathname.startsWith(tab.path);

  function handleTabPress(tab) {
    if (isActive(tab)) {
      // Already on this tab — reset to root
      navigate(tab.path, { replace: true });
    } else {
      navigate(tab.path);
    }
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 select-none transition-colors `}
            style={{ minHeight: '56px' }}
            aria-current={active ? "page" : undefined}
          >
            <tab.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
            <span className={`text-[11px] font-medium leading-tight ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}