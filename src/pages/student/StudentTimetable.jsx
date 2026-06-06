import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GridTimetable from '@/components/timetable/GridTimetable';
import { AIStudyPlanGenerator, AIExamPreparationTips } from '@/components/timetable/AIStudentTimetableTools';
import { AITimetableChatbot } from '@/components/timetable/AITimetableAssistant';

export default function StudentTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const [entries, setEntries] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [data, gradeData] = await Promise.all([
          base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId, classId: user?.classId }),
          base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: user?.id }).catch(() => []),
        ]);
        setEntries(data || []);
        setGrades(gradeData || []);
      } catch { setEntries([]); setGrades([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Timetable</h1>
      <Tabs defaultValue="timetable">
        <TabsList className="mb-4">
          <TabsTrigger value="timetable"><Calendar className="w-4 h-4 mr-1.5" />Timetable</TabsTrigger>
          <TabsTrigger value="study-plan"><Calendar className="w-4 h-4 mr-1.5" />AI Study Plan</TabsTrigger>
          <TabsTrigger value="tips"><Lightbulb className="w-4 h-4 mr-1.5" />AI Exam Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable">
          <GridTimetable entries={entries} title="Weekly Timetable" />
        </TabsContent>

        <TabsContent value="study-plan">
          <AIStudyPlanGenerator entries={entries} grades={grades} studentName={user?.fullName} />
        </TabsContent>

        <TabsContent value="tips">
          <AIExamPreparationTips entries={entries} />
        </TabsContent>
      </Tabs>

      <AITimetableChatbot entries={entries} userRole="student" userName={user?.fullName} grades={grades} />
    </div>
  );
}