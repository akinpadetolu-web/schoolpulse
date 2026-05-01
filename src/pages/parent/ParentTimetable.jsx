import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import UnifiedTimetable from '@/components/parent/UnifiedTimetable';

export default function ParentTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
          const linked = (allStudents || []).filter(s => linkedIds.includes(s.id));
          setChildren(linked);

          const classIds = [...new Set(linked.map(s => s.classId).filter(Boolean))];
          if (classIds.length > 0) {
            const promises = classIds.map(classId =>
              base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId, classId }).catch(() => [])
            );
            const results = await Promise.all(promises);
            setTimetable(results.flat().filter(Boolean));
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [user?.id, user?.linkedStudentIds]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Children's Timetable</h1>
      <UnifiedTimetable children={children} timetable={timetable} loading={false} />
    </div>
  );
}