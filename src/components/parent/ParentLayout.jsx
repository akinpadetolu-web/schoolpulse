import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import ParentSidebar from './ParentSidebar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROOT_PATHS = ['/parent', '/parent/assignments', '/parent/timetable', '/parent/grades'];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolUser: user, isLoadingSchoolAuth } = useSchoolAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isRootScreen = ROOT_PATHS.includes(location.pathname);

  useEffect(() => {
    if (!isLoadingSchoolAuth && (!user || user.role !== "parent")) navigate("/");
  }, [user, isLoadingSchoolAuth, navigate]);

  if (isLoadingSchoolAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  if (!user || user.role !== "parent") return null;

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2">
            {!isRootScreen ? (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-sm font-medium text-muted-foreground">Parent Portal</h2>
          </div>
          <NotificationCenter />
        </header>
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ x: isRootScreen ? -16 : 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRootScreen ? 16 : -16, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="absolute inset-0 overflow-y-auto overscroll-none"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 4rem)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileBottomNav role="parent" />
    </div>
  );
}