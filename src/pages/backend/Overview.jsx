import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  School, UserCog, Users, GraduationCap, BookOpen, Loader2,
  ChevronRight, UserCircle, Building2, Activity, ArrowUpRight
} from 'lucide-react';

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ schools: 0, admins: 0, teachers: 0, students: 0, classes: 0, parents: 0 });
  const [recentSchools, setRecentSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [schools, admins, teachers, students, classes, parents] = await Promise.all([
          base44.entities.School.filter({ isActive: true }),
          base44.entities.SchoolUser.filter({ role: "admin", isArchived: false }),
          base44.entities.SchoolUser.filter({ role: "teacher", isArchived: false }),
          base44.entities.SchoolUser.filter({ role: "student", isArchived: false }),
          base44.entities.SchoolClass.filter({ isArchived: false }),
          base44.entities.SchoolUser.filter({ role: "parent", isArchived: false }),
        ]);
        setStats({
          schools: (schools || []).length,
          admins: (admins || []).length,
          teachers: (teachers || []).length,
          students: (students || []).length,
          classes: (classes || []).length,
          parents: (parents || []).length,
        });
        setRecentSchools((schools || []).slice(-5).reverse());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Schools", value: stats.schools, icon: School, color: "text-blue-600 bg-blue-100", path: "/backend/schools" },
    { label: "School Admins", value: stats.admins, icon: UserCog, color: "text-purple-600 bg-purple-100", path: "/backend/school-admins" },
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600 bg-emerald-100", path: "/backend/teachers" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-amber-600 bg-amber-100", path: "/backend/students" },
    { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-red-600 bg-red-100", path: "/backend/classes" },
    { label: "Parents", value: stats.parents, icon: UserCircle, color: "text-indigo-600 bg-indigo-100", path: "/backend/students" },
  ];

  const quickActions = [
    { label: "Add School", icon: Building2, path: "/backend/schools" },
    { label: "Feature Toggles", icon: Activity, path: "/backend/feature-toggles" },
    { label: "Audit Logs", icon: ChevronRight, path: "/backend/audit-logs" },
    { label: "Support Tools", icon: ArrowUpRight, path: "/backend/support" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide statistics and quick actions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(c.path)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold mt-1">{c.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>
                  <c.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Schools</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/backend/schools")}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSchools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No schools yet</p>
            ) : recentSchools.map(school => (
              <div
                key={school.id}
                onClick={() => navigate(`/backend/schools/${school.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{school.schoolName}</p>
                    <p className="text-xs text-muted-foreground truncate">{school.schoolCode} • {school.address || 'No address'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <action.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}