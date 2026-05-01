import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, User } from 'lucide-react';
import { format, isFuture } from 'date-fns';

export default function ParentEClass() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const allStudents = await base44.entities.SchoolUser.filter({
          schoolId: user?.schoolId,
          id: { $in: linkedIds },
          role: 'student',
        });

        const classIds = allStudents.map(s => s.classId).filter(Boolean);
        const data = await base44.entities.VirtualClass.filter({
          schoolId: user?.schoolId,
          classId: { $in: classIds },
        });

        setClasses((data || []).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime)));
      } catch {
        setClasses([]);
      }
      setLoading(false);
    }
    load();

    const unsubscribe = base44.entities.VirtualClass.subscribe(() => load());
    return () => unsubscribe();
  }, [user?.schoolId, user?.linkedStudentIds]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const upcoming = classes.filter(c => isFuture(new Date(c.startDateTime)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Children's E-Class Schedule</h1>
        <p className="text-muted-foreground">Upcoming virtual classes</p>
      </div>

      {upcoming.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No upcoming e-classes scheduled.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map(cls => (
            <Card key={cls.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">{cls.title}</h3>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {cls.teacherName}</span>
                      <span>{cls.subjectName}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                    </div>
                    {cls.description && <p className="text-sm mt-2">{cls.description}</p>}
                  </div>
                  <Badge variant="outline">View Only</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}