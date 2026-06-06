import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Heart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UnifiedTimetable from '@/components/parent/UnifiedTimetable';
import AIParentInsights from '@/components/timetable/AIParentInsights';
import { AITimetableChatbot } from '@/components/timetable/AITimetableAssistant';

export default function ParentTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [grades, setGrades] = useState([]);
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

          const classIds = [...new Set(linked.map(s => s.classId).filter(Boolean))];
          const studentIds = linked.map(s => s.id);

          const [timetableResults, gradeResults] = await Promise.all([
            classIds.length > 0
              ? Promise.all(classIds.map(classId => base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId, classId }).catch(() => [])))
              : Promise.resolve([[]]),
            studentIds.length > 0
              ? base44.entities.Grade.filter({ schoolId: user?.schoolId }).catch(() => [])
              : Promise.resolve([]),
          ]);

          setTimetable(timetableResults.flat().filter(Boolean));
          setGrades((gradeResults || []).filter(g => studentIds.includes(g.studentId)));
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Children's Timetable</h1>

      {children.length > 1 && (
        <div className="space-y-1">
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

      <Tabs defaultValue="timetable">
        <TabsList className="mb-4">
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="ai-insights"><Heart className="w-4 h-4 mr-1.5" />AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable">
          <UnifiedTimetable children={filteredChildren} timetable={filteredTimetable} loading={false} />
        </TabsContent>

        <TabsContent value="ai-insights">
          <AIParentInsights children={filteredChildren} timetable={filteredTimetable} grades={grades} />
        </TabsContent>
      </Tabs>

      <AITimetableChatbot entries={filteredTimetable} userRole="parent" userName={user?.fullName} />
    </div>
  );
}