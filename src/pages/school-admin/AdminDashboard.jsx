import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, ClipboardList, Loader2, AlertTriangle, Plus, Tag, Zap, Calendar, Wand2 } from 'lucide-react';

export default function AdminDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0, subjects: 0, categories: 0 });
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      try {
        const [teachers, students, classes, subjects, categories, timetableEntries] = await Promise.all([
          base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
          base44.entities.SchoolUser.filter({ schoolId, role: "student", isArchived: false }),
          base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
          base44.entities.Subject.filter({ schoolId, isArchived: false }),
          base44.entities.SubjectCategory.filter({ schoolId, isArchived: false }),
          base44.entities.TimetableEntry.filter({ schoolId }),
        ]);
        setStats({
          teachers: (teachers || []).length,
          students: (students || []).length,
          classes: (classes || []).length,
          subjects: (subjects || []).length,
          categories: (categories || []).length,
        });

        // Build smart warnings
        const warns = [];
        const classIds = (classes || []).map(c => c.id);
        const classesWithNoSubjects = (classes || []).filter(c =>
          !(subjects || []).some(s => (s.applicableClasses || []).includes(c.id))
        );
        if (classesWithNoSubjects.length > 0) warns.push(`${classesWithNoSubjects.length} class${classesWithNoSubjects.length > 1 ? "es" : ""} have no subjects mapped`);

        const timetabledClasses = [...new Set((timetableEntries || []).map(e => e.classId))];
        const noTimetable = (classes || []).filter(c => !timetabledClasses.includes(c.id));
        if (noTimetable.length > 0) warns.push(`${noTimetable.length} class${noTimetable.length > 1 ? "es" : ""} have no timetable`);

        const noTeacherEntries = (timetableEntries || []).filter(e => !e.teacherId).length;
        if (noTeacherEntries > 0) warns.push(`${noTeacherEntries} timetable entries have no teacher`);

        const teachersNoAssignment = (teachers || []).filter(t => !(t.teachingAssignments || []).length).length;
        if (teachersNoAssignment > 0) warns.push(`${teachersNoAssignment} teacher${teachersNoAssignment > 1 ? "s" : ""} have no class assignment`);

        setWarnings(warns);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const statCards = [
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-amber-600 bg-amber-100" },
    { label: "Classes", value: stats.classes, icon: BookOpen, color: "text-blue-600 bg-blue-100" },
    { label: "Subjects", value: stats.subjects, icon: ClipboardList, color: "text-purple-600 bg-purple-100" },
    { label: "Categories", value: stats.categories, icon: Tag, color: "text-rose-600 bg-rose-100" },
  ];

  const quickActions = [
    { label: "Add Subject", icon: Plus, to: "/school-admin/subjects" },
    { label: "Add Class", icon: BookOpen, to: "/school-admin/classes" },
    { label: "Add Category", icon: Tag, to: "/school-admin/categories" },
    { label: "Generate Timetable", icon: Wand2, to: "/school-admin/timetable" },
    { label: "Bulk Assign Subjects", icon: Zap, to: "/school-admin/bulk-assign" },
    { label: "Teacher Assignments", icon: Users, to: "/school-admin/teacher-assignments" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.fullName || "Admin"}</h1>
      <p className="text-muted-foreground mb-6">{user?.schoolName || "Your School"}</p>

      {/* Smart warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-sm"><AlertTriangle className="w-4 h-4" /> Action Required</div>
          <ul className="space-y-1">
            {warnings.map((w, i) => <li key={i} className="text-sm text-amber-700 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{w}</li>)}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {statCards.map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{c.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
                  <c.icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickActions.map(a => (
          <Link key={a.to} to={a.to}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <a.icon className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium">{a.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}