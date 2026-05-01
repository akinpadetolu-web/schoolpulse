import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import StudentSidebar from './StudentSidebar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROOT_PATHS = ['/student', '/student/assignments', '/student/timetable', '/student/grades'];

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolUser: user, isLoadingSchoolAuth } = useSchoolAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isRootScreen = ROOT_PATHS.includes(location.pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoadingSchoolAuth && (!user || user.role !== "student")) navigate("/");
  }, [user, isLoadingSchoolAuth, navigate]);

  if (isLoadingSchoolAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  if (!user || user.role !== "student") return null;

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col md:flex-row">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 md:h-16 flex items-center justify-between px-3 md:px-6 shrink-0 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {!isRootScreen ? (
              <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-xs md:text-sm font-medium text-muted-foreground md:block hidden">Student Portal</h2>
          </div>
          <NotificationCenter />
        </header>
        <main className="flex-1 overflow-y-auto md:pb-0 pb-16 md:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="w-full h-full"
              style={{
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileBottomNav role="student" />
    </div>
  );
}