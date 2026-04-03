import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ParentTimetable() {
  const user = getCurrentUser();
  const [entries, setEntries] = useState([]);
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
            const allEntries = await base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId });
            setEntries((allEntries || []).filter(e => classIds.includes(e.classId)));
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
      <h1 className="text-2xl font-bold mb-6">Children's Timetable</h1>
      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No timetable entries available.</p>
      ) : (
        <div className="grid gap-4">
          {DAYS.map(day => {
            const items = entries.filter(e => e.dayOfWeek === day).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
            return (
              <Card key={day} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">{day}</h3>
                  {items.length === 0 ? <p className="text-xs text-muted-foreground">No classes</p> : (
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-secondary/50 rounded-lg p-3">
                          <div className="text-sm font-medium w-24">{item.startTime} - {item.endTime}</div>
                          <div><p className="font-medium text-sm">{item.subjectName}</p><p className="text-xs text-muted-foreground">{item.className} • {item.teacherName}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}