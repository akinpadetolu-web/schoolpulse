import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import ParentSidebar from './ParentSidebar';
import HeaderUserMenu from '@/components/common/HeaderUserMenu';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PullToRefreshWrapper from '@/components/mobile/PullToRefreshWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import StudentProgressAgentChat from '@/components/agents/StudentProgressAgentChat';

const ROOT_PATHS = ['/parent', '/parent/timetable', '/parent/assignments', '/parent/grades', '/parent/fees-payments', '/parent/health', '/parent/hostel', '/parent/notifications'];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolUser: user, isLoadingSchoolAuth } = useSchoolAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const queryClient = useQueryClient();
  const ptr = usePullToRefresh(async () => { await queryClient.refetchQueries(); });

  const isRootScreen = ROOT_PATHS.includes(location.pathname);

  // Track navigation direction for iOS-style slide transitions
  const navStackRef = useRef([location.pathname]);
  const directionRef = useRef(1);
  const navStack = navStackRef.current;
  if (location.pathname !== navStack[navStack.length - 1]) {
    const idx = navStack.indexOf(location.pathname);
    if (idx === -1) { navStack.push(location.pathname); directionRef.current = 1; }
    else { navStack.length = idx + 1; directionRef.current = -1; }
  }
  const direction = directionRef.current;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoadingSchoolAuth && (!user || user.role !== "parent")) navigate("/");
  }, [user, isLoadingSchoolAuth, navigate]);

  if (isLoadingSchoolAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  if (!user || user.role !== "parent") return null;

  return (
    <div className="flex flex-col md:flex-row bg-background" style={{ height: '100dvh', overflow: 'hidden' }}>
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="sticky top-0 z-30 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--topbar-bg, hsl(var(--card)))', color: 'var(--topbar-text, hsl(var(--foreground)))' }}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            {!isRootScreen && (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-sm font-medium text-muted-foreground md:block hidden">Parent Portal</h2>
          </div>
          <HeaderUserMenu />
        </header>
        <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
          <PullToRefreshWrapper {...ptr}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={location.pathname}
                custom={direction}
                initial={(d) => ({ x: d >= 0 ? '100%' : '-100%', opacity: 0 })}
                animate={{ x: 0, opacity: 1 }}
                exit={(d) => ({ x: d >= 0 ? '-30%' : '30%', opacity: 0 })}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="p-4 md:p-6 w-full"
                style={{
                  touchAction: 'pan-y',
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
                  paddingLeft: 'env(safe-area-inset-left)',
                  paddingRight: 'env(safe-area-inset-right)',
                }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </PullToRefreshWrapper>
        </main>
      </div>
      {isRootScreen && <MobileBottomNav role="parent" />}
      <StudentProgressAgentChat subtitle="Ask about your child's academic progress, strengths, and support needs" />
    </div>
  );
}