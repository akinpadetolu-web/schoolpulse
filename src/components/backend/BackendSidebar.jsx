import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearCurrentSuperAdmin } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, School, UserCog, Users, GraduationCap,
  BookOpen, Wrench, FileText, Settings, LogOut, X, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: "Overview", path: "/backend", icon: LayoutDashboard },
  { label: "Schools", path: "/backend/schools", icon: School },
  { label: "School Admins", path: "/backend/school-admins", icon: UserCog },
  { label: "Teachers", path: "/backend/teachers", icon: Users },
  { label: "Students", path: "/backend/students", icon: GraduationCap },
  { label: "Classes", path: "/backend/classes", icon: BookOpen },
  { label: "Support Tools", path: "/backend/support", icon: Wrench },
  { label: "Audit Logs", path: "/backend/audit-logs", icon: FileText },
  { label: "Settings", path: "/backend/settings", icon: Settings },
];

export default function BackendSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    clearCurrentSuperAdmin();
    navigate("/sp-backend");
  }

  const isActive = (path) => {
    if (path === "/backend") return location.pathname === "/backend";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-sidebar-primary" />
            <span className="font-bold text-lg">SchoolPulse</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => (
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
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent w-full transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}