import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText, BookOpen, Loader2 } from 'lucide-react';
import TeacherLiveAnalytics from '@/components/teacher/TeacherLiveAnalytics';

export default function TeacherDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [stats, setStats] = useState({ timetable: 0, assignments: 0, materials: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [tt, asgn, mat] = await Promise.all([
        base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.Assignment.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.LessonMaterial.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
      ]);
      setStats({ timetable: (tt || []).length, assignments: (asgn || []).length, materials: (mat || []).length });
    } catch { /* ignore */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Welcome, {user?.fullName}</h1>
        <p className="text-muted-foreground">{user?.schoolName}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Timetable Entries", value: stats.timetable, icon: Calendar, color: "text-blue-600 bg-blue-100" },
          { label: "Assignments", value: stats.assignments, icon: FileText, color: "text-emerald-600 bg-emerald-100" },
          { label: "Materials", value: stats.materials, icon: BookOpen, color: "text-purple-600 bg-purple-100" },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-3xl font-bold mt-1">{c.value}</p></div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}><c.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeacherLiveAnalytics />
    </div>
  );
}