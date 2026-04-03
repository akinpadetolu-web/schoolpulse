import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ParentAssignments() {
  const user = getCurrentUser();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const students = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student" });
          const linked = (students || []).filter(s => linkedIds.includes(s.id));
          const classIds = [...new Set(linked.map(s => s.classId).filter(Boolean))];
          if (classIds.length > 0) {
            const all = await base44.entities.Assignment.filter({ schoolId: user?.schoolId, isPublished: true });
            setAssignments((all || []).filter(a => classIds.includes(a.classId)));
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Children's Assignments</h1>
      {assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assignments available.</p>
      ) : (
        <div className="grid gap-3">
          {assignments.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.subjectName} • {a.className}</p>
                {a.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}