import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import TeacherSidebar from './TeacherSidebar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export default function TeacherLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") navigate("/");
  }, [navigate]);

  const user = getCurrentUser();
  if (!user || user.role !== "teacher") return null;

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <TeacherSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
            <h2 className="text-sm font-medium text-muted-foreground">Teacher Dashboard</h2>
          </div>
          <NotificationCenter />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}