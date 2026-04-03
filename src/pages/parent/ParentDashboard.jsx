import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function ParentDashboard() {
  const user = getCurrentUser();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student" });
          setChildren((allStudents || []).filter(s => linkedIds.includes(s.id)));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.fullName}</h1>
      <p className="text-muted-foreground mb-6">{user?.schoolName}</p>

      <h2 className="text-lg font-semibold mb-4">My Children</h2>
      {children.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            No linked children yet. Contact the school admin to link your children.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map(child => (
            <Card key={child.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{child.fullName}</p>
                  <p className="text-sm text-muted-foreground">{child.className || "No class assigned"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}