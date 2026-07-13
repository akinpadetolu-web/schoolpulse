import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearCurrentSuperAdmin, getCurrentSuperAdmin } from '@/lib/auth';
import {
  LayoutDashboard, School, UserCog, Users, GraduationCap,
  BookOpen, Wrench, FileText, Settings, LogOut, X, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { label: "Overview", path: "/backend", icon: LayoutDashboard },
    ]
  },
  {
    label: 'SCHOOLS',
    items: [
      { label: "Schools", path: "/backend/schools", icon: School },
      { label: "School Admins", path: "/backend/school-admins", icon: UserCog },
    ]
  },
  {
    label: 'DIRECTORY',
    items: [
      { label: "Teachers", path: "/backend/teachers", icon: Users },
      { label: "Students", path: "/backend/students", icon: GraduationCap },
      { label: "Classes", path: "/backend/classes", icon: BookOpen },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: "Feature Toggles", path: "/backend/feature-toggles", icon: Zap },
      { label: "Support Tools", path: "/backend/support", icon: Wrench },
      { label: "Audit Logs", path: "/backend/audit-logs", icon: FileText },
      { label: "Settings", path: "/backend/settings", icon: Settings },
    ]
  },
];

export default function BackendSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const admin = getCurrentSuperAdmin();

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
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 md:z-auto md:flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm">SchoolPulse</span>
              <p className="text-xs text-sidebar-foreground/50">Super Admin</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto touch-pan-y py-4 px-3" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin?.fullName || admin?.email || "Super Admin"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{admin?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}