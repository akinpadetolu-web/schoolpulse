import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2, RefreshCw, Database, Activity, AlertTriangle, School, Users, GraduationCap, BookOpen, Building2, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { clearFeatureCache } from '@/lib/featureToggleManager';

export default function SupportTools() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    setLoading(true);
    try {
      const entities = ['School', 'SchoolUser', 'SchoolClass', 'Subject', 'Grade', 'Attendance', 'Assignment', 'Quiz', 'Announcement', 'Notification'];
      const results = await Promise.all(
        entities.map(async (name) => {
          try {
            const data = await base44.entities[name].list('-created_date', 1);
            return [name, data?.length || 0];
          } catch {
            return [name, 'error'];
          }
        })
      );
      const map = {};
      results.forEach(([name, count]) => { map[name] = count; });
      setCounts(map);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleClearCache() {
    setClearing(true);
    try {
      clearFeatureCache();
      toast.success('Feature cache cleared — toggles will reload fresh');
    } catch {
      toast.error('Failed to clear cache');
    }
    setClearing(false);
  }

  const entityIcons = {
    School: Building2,
    SchoolUser: Users,
    SchoolClass: BookOpen,
    Subject: BookOpen,
    Grade: GraduationCap,
    Attendance: Users,
    Assignment: FileText,
    Quiz: Activity,
    Announcement: AlertTriangle,
    Notification: AlertTriangle,
  };

  const quickLinks = [
    { label: 'Manage Schools', path: '/backend/schools', icon: School },
    { label: 'Feature Toggles', path: '/backend/feature-toggles', icon: Activity },
    { label: 'Audit Logs', path: '/backend/audit-logs', icon: FileText },
    { label: 'Settings', path: '/backend/settings', icon: Wrench },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">System health, data overview, and maintenance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" /> Entity Record Counts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadCounts}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(counts).map(([name, count]) => {
                const Icon = entityIcons[name] || Database;
                return (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{name}</p>
                      <p className="font-semibold text-sm">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Feature Cache</p>
                  <p className="text-xs text-muted-foreground">Clear cached feature toggles</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearCache} disabled={clearing}>
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {quickLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <link.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1">{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}