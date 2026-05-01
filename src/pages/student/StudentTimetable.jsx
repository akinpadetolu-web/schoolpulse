import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import GridTimetable from '@/components/timetable/GridTimetable';

export default function StudentTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId, classId: user?.classId });
        setEntries(data || []);
      } catch { setEntries([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Timetable</h1>
      <GridTimetable entries={entries} title="Weekly Timetable" />
    </div>
  );
}