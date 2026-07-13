import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentSuperAdmin } from '@/lib/auth';
import BackendSidebar from './BackendSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const pageTitles = {
  '/backend': 'Overview',
  '/backend/schools': 'Schools',
  '/backend/school-admins': 'School Admins',
  '/backend/teachers': 'Teachers',
  '/backend/students': 'Students',
  '/backend/classes': 'Classes',
  '/backend/feature-toggles': 'Feature Toggles',
  '/backend/support': 'Support Tools',
  '/backend/audit-logs': 'Audit Logs',
  '/backend/settings': 'Settings',
};

export default function BackendLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!getCurrentSuperAdmin()) {
      navigate("/sp-backend");
    }
  }, [navigate]);

  if (!getCurrentSuperAdmin()) return null;

  const currentTitle = (() => {
    const exact = pageTitles[location.pathname];
    if (exact) return exact;
    const match = Object.entries(pageTitles).find(([path]) =>
      path !== '/backend' && location.pathname.startsWith(path)
    );
    return match ? match[1] : 'Dashboard';
  })();

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col md:flex-row">
      <BackendSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-card/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-sm font-semibold text-foreground">{currentTitle}</h2>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-16 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}