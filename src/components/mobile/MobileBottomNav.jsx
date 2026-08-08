import React, { useEffect } from 'react';
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

// sessionStorage key prefix for per-tab deep-route history
const STORAGE_PREFIX = 'mbn_history_';

export default function MobileBottomNav({ role }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = role === 'teacher' ? teacherTabs : role === 'student' ? studentTabs : parentTabs;

  const isActive = (tab) =>
    tab.path === `/${role}` ? location.pathname === `/${role}` : location.pathname.startsWith(tab.path);

  // The tab that owns the current route (null when on a route outside any tab)
  const activeTab = tabs.find(t => isActive(t)) || null;

  // Persist the current deep route under the active tab so we can restore it later
  useEffect(() => {
    if (!activeTab) return;
    try { sessionStorage.setItem(`${STORAGE_PREFIX}${activeTab.path}`, location.pathname); } catch {}
  }, [location.pathname, activeTab]);

  function handleTabPress(tab) {
    if (isActive(tab)) {
      // Already on this tab — reset to root and forget the saved deep route
      try { sessionStorage.removeItem(`${STORAGE_PREFIX}${tab.path}`); } catch {}
      navigate(tab.path, { replace: true });
      return;
    }
    // Switching tabs — restore the last deep route for this tab if we saved one
    let target = tab.path;
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${tab.path}`);
      if (saved && (saved === tab.path || saved.startsWith(tab.path + '/'))) target = saved;
    } catch {}
    navigate(target);
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-stretch"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(3.5rem + env(safe-area-inset-bottom))'
      }}
    >
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 select-none transition-colors active:bg-accent/50 touch-target ${active ? 'text-primary' : 'text-muted-foreground'}`}
            style={{ minHeight: '56px' }}
            aria-current={active ? "page" : undefined}
          >
            <tab.icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
            <span className={`text-[10px] font-semibold leading-tight ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}