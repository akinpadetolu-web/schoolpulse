import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { getCurrentSuperAdmin } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BackendSettings() {
  const admin = getCurrentSuperAdmin();
  const [stats, setStats] = useState({ schools: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [schools, users] = await Promise.all([
          base44.entities.School.list('-created_date', 1),
          base44.entities.SchoolUser.list('-created_date', 1),
        ]);
        setStats({
          schools: schools?.length || 0,
          users: users?.length || 0,
        });
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  async function handleClearCache() {
    try {
      // Clear all feature caches
      Object.keys(localStorage).forEach(key => {
        if (key.includes('feature') || key.includes('toggle')) {
          localStorage.removeItem(key);
        }
      });
      toast.success('System caches cleared');
    } catch {
      toast.error('Failed to clear caches');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Super admin profile and system information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Super Admin Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{admin?.fullName || "Super Admin"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {admin?.email || "—"}
                </p>
                <Badge className="mt-1" variant="outline">Super Admin</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Schools</span>
                  <span className="font-semibold">{stats.schools}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="font-semibold">{stats.users}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <Badge variant="outline">Production</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleClearCache}>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Clear System Caches
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}