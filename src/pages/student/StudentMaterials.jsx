import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen } from 'lucide-react';

export default function StudentMaterials() {
  const { schoolUser: user } = useSchoolAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.LessonMaterial.filter({ 
          schoolId: user?.schoolId, 
          classId: user?.classId, 
          isPublished: true,
          status: 'approved',
        });
        setMaterials(data || []);
      } catch { setMaterials([]); }
      setLoading(false);
    }
    load();

    // Subscribe to approved material updates
    const unsubscribe = base44.entities.LessonMaterial.subscribe((event) => {
      if (event.data?.classId === user?.classId && event.data?.status === 'approved') {
        load();
      }
    });
    return () => unsubscribe();
  }, [user?.classId, user?.schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Lesson Materials</h1>
      {materials.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No materials available yet.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {materials.map(m => (
            <Card key={m.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold">{m.title}</p>
                <p className="text-sm text-muted-foreground">{m.subjectName} • by {m.teacherName} {m.topic ? `• ${m.topic}` : ""}</p>
                {m.description && <p className="text-sm mt-2">{m.description}</p>}
                {m.content && <div className="mt-3 p-3 bg-secondary/50 rounded-lg text-sm">{m.content}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}