import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import ParentSidebar from './ParentSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export default function ParentLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "parent") navigate("/");
  }, [navigate]);

  const user = getCurrentUser();
  if (!user || user.role !== "parent") return null;

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b h-14 flex items-center px-4 md:px-6 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <h2 className="text-sm font-medium text-muted-foreground">Parent Portal</h2>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}