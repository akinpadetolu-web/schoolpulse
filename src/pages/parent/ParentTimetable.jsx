import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import UnifiedTimetable from '@/components/parent/UnifiedTimetable';

export default function ParentTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
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
          if (linked.length > 0) {
            setSelectedChildId('');
          }

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
  }, [user?.id, user?.linkedStudentIds, user?.schoolId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filteredChildren = selectedChildId ? children.filter(c => c.id === selectedChildId) : children;
  const filteredTimetable = selectedChildId 
    ? timetable.filter(t => {
        const child = children.find(c => c.id === selectedChildId);
        return child && t.classId === child.classId;
      })
    : timetable;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Children's Timetable</h1>
      
      {children.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by child</label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All Children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Children</SelectItem>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id}>{child.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <UnifiedTimetable children={filteredChildren} timetable={filteredTimetable} loading={false} />
    </div>
  );
}