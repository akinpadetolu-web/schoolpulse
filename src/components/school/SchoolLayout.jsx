import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import SchoolSidebar from './SchoolSidebar';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft } from 'lucide-react';

export default function SchoolLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolUser: user, isLoadingSchoolAuth } = useSchoolAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isRootScreen = location.pathname === '/school-admin';

  useEffect(() => {
    if (!isLoadingSchoolAuth && (!user || user.role !== "admin")) navigate("/");
  }, [user, isLoadingSchoolAuth, navigate]);

  if (isLoadingSchoolAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <SchoolSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 flex items-center px-4 md:px-6 shrink-0 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {!isRootScreen ? (
            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-sm font-medium text-muted-foreground">{user.schoolName || "School"} — Admin</h2>
        </header>
        <main
          className="flex-1 overflow-y-auto overscroll-none p-4 md:p-6"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}