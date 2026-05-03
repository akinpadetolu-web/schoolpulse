import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import StudentSidebar from './StudentSidebar';
import HeaderUserMenu from '@/components/common/HeaderUserMenu';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolUser: user, isLoadingSchoolAuth } = useSchoolAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isRootScreen = location.pathname === '/student';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoadingSchoolAuth && (!user || user.role !== "student")) navigate("/");
  }, [user, isLoadingSchoolAuth, navigate]);

  if (isLoadingSchoolAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  if (!user || user.role !== "student") return null;

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:block">
        <StudentSidebar isOpen={true} onClose={() => {}} />
      </div>
      <div className="md:hidden">
        <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header
          className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2">
            {!isRootScreen ? (
              <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-sm font-medium text-muted-foreground md:block hidden">Student Portal</h2>
          </div>
          <HeaderUserMenu />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}