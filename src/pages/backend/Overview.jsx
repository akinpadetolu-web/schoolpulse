import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { School, UserCog, Users, GraduationCap, BookOpen, Loader2 } from 'lucide-react';

export default function Overview() {
  const [stats, setStats] = useState({ schools: 0, admins: 0, teachers: 0, students: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [schools, admins, teachers, students, classes] = await Promise.all([
          base44.entities.School.filter({ isActive: true }),
          base44.entities.SchoolUser.filter({ role: "admin", isArchived: false }),
          base44.entities.SchoolUser.filter({ role: "teacher", isArchived: false }),
          base44.entities.SchoolUser.filter({ role: "student", isArchived: false }),
          base44.entities.SchoolClass.filter({ isArchived: false }),
        ]);
        setStats({
          schools: (schools || []).length,
          admins: (admins || []).length,
          teachers: (teachers || []).length,
          students: (students || []).length,
          classes: (classes || []).length,
        });
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Schools", value: stats.schools, icon: School, color: "text-blue-600 bg-blue-100" },
    { label: "School Admins", value: stats.admins, icon: UserCog, color: "text-purple-600 bg-purple-100" },
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-amber-600 bg-amber-100" },
    { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-red-600 bg-red-100" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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