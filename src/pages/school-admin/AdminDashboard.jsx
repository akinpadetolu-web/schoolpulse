import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, GraduationCap, BookOpen, ClipboardList, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const user = getCurrentUser();
  const schoolId = user?.schoolId;
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0, subjects: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      try {
        const [teachers, students, classes, subjects] = await Promise.all([
          base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
          base44.entities.SchoolUser.filter({ schoolId, role: "student", isArchived: false }),
          base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
          base44.entities.Subject.filter({ schoolId, isArchived: false }),
        ]);
        setStats({
          teachers: (teachers || []).length,
          students: (students || []).length,
          classes: (classes || []).length,
          subjects: (subjects || []).length,
        });
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const cards = [
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-amber-600 bg-amber-100" },
    { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-blue-600 bg-blue-100" },
    { label: "Subjects", value: stats.subjects, icon: ClipboardList, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.fullName || "Admin"}</h1>
      <p className="text-muted-foreground mb-6">{user?.schoolName || "Your School"}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
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
    </div>
  );
}