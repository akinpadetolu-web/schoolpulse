import React, { useState, useEffect, useCallback } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshWrapper from '@/components/mobile/PullToRefreshWrapper';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText, BookOpen, Loader2 } from 'lucide-react';
import DashboardCalendar from '@/components/calendar/DashboardCalendar';
import TeacherClockInWidget from '@/components/teacher/TeacherClockInWidget';
import TeacherLeaveRequestWidget from '@/components/teacher/TeacherLeaveRequestWidget';
import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';

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

  const ptr = usePullToRefresh(load);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const assignments = user?.teachingAssignments || [];

  return (
    <PullToRefreshWrapper {...ptr}>
    <div className="p-4 md:p-0">
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.fullName}</h1>
      <p className="text-muted-foreground mb-6">{user?.schoolName}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
      {assignments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">My Teaching Assignments</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {assignments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{a.subjectName}</span>
                <span className="text-muted-foreground">→</span>
                <span>{a.className}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <TeacherClockInWidget />
        <TeacherLeaveRequestWidget />
      </div>
      <DashboardCalendar />
      <div className="mt-8 pt-6 border-t">
        <DeleteAccountDialog />
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}