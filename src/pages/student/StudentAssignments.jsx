import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentAssignments() {
  const user = getCurrentUser();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Assignment.filter({ schoolId: user?.schoolId, classId: user?.classId, isPublished: true });
        setAssignments(data || []);
      } catch { setAssignments([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>
      {assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assignments yet.</p>
      ) : (
        <div className="grid gap-3">
          {assignments.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.subjectName} • by {a.teacherName}</p>
                    {a.description && <p className="text-sm mt-2">{a.description}</p>}
                    {a.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</p>}
                  </div>
                  <Badge variant="outline">Max: {a.maxScore || 100}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}