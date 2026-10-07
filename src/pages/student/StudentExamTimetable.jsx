import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { useExamTimetable } from '@/lib/examTimetableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Lightbulb, Clock, MapPin, AlertCircle, BookOpen, User } from 'lucide-react';
import { AIStudyPlanGenerator, AIExamPreparationTips } from '@/components/timetable/AIStudentTimetableTools';
import { AITimetableChatbot } from '@/components/timetable/AITimetableAssistant';
import { format, differenceInDays } from 'date-fns';

function getDaysLabel(days) {
  if (days < 0) return { label: 'Exam passed', color: 'text-muted-foreground' };
  if (days === 0) return { label: 'TODAY', color: 'text-red-600 font-bold' };
  if (days === 1) return { label: 'Tomorrow', color: 'text-red-500' };
  if (days <= 3) return { label: `${days} days`, color: 'text-orange-500' };
  if (days <= 7) return { label: `${days} days`, color: 'text-amber-500' };
  return { label: `${days} days`, color: 'text-emerald-600' };
}

export default function StudentExamTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const { examTimetable, loading: etLoading } = useExamTimetable(user?.schoolId);
  const [grades, setGrades] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [parentPrompts, setParentPrompts] = useState([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }).catch(() => []),
      base44.entities.LessonPlan.filter({ schoolId: user.schoolId, classId: user.classId, isPublished: true }).catch(() => []),
    ]).then(([g, lp]) => {
      setGrades(g || []);
      setLessonPlans(lp || []);
      // Try to load parent prompts - search by linkedStudentIds
      base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'parent' }).catch(() => []).then(parents => {
        const myParents = (parents || []).filter(p => (p.linkedStudentIds || []).includes(user.id));
        const allParentPrompts = [];
        for (const parent of myParents) {
          const stored = JSON.parse(localStorage.getItem(`parentPrompts_${parent.id}`) || '[]');
          allParentPrompts.push(...stored);
        }
        setParentPrompts(allParentPrompts);
      });
      setDataLoading(false);
    });
  }, [user?.id]);

  if (etLoading || dataLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!examTimetable) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 opacity-30" />
        </div>
        <p className="font-semibold text-lg mb-1">Exam Timetable Not Available</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your school admin has not published an exam timetable yet. Please check back later.</p>
      </div>
    );
  }

  // Filter entries for this student's class
  const myEntries = (examTimetable.entries || []).filter(e =>
    (e.classIds || []).includes(user?.classId)
  ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const today = new Date();
  const upcomingEntries = myEntries.filter(e => e.date && new Date(e.date) >= today);
  const nextExam = upcomingEntries[0];

  // Countdown to exam start
  const daysToStart = examTimetable.startDate ? differenceInDays(new Date(examTimetable.startDate), today) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Exam Timetable</h1>
        <p className="text-sm text-muted-foreground">{examTimetable.sessionName}</p>
      </div>

      {/* Countdown banner */}
      {daysToStart !== null && (
        <div className={`p-3 rounded-xl border text-sm font-medium text-center ${daysToStart > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : daysToStart === 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-muted border-border'}`}>
          {daysToStart > 0 ? `⏳ Exams start in ${daysToStart} day${daysToStart !== 1 ? 's' : ''}` : daysToStart === 0 ? '🎯 Exam period starts TODAY!' : '📚 Exam period is ongoing'}
        </div>
      )}

      {/* Next exam card */}
      {nextExam && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">NEXT EXAM</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-lg">{nextExam.subjectName}</span>
              <Badge variant="outline">{nextExam.date ? format(new Date(nextExam.date), 'EEE, MMM d') : '—'}</Badge>
              {nextExam.startTime && <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{nextExam.startTime}</span>}
              {nextExam.venue && <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{nextExam.venue}</span>}
              {nextExam.date && (() => { const d = differenceInDays(new Date(nextExam.date), today); const { label, color } = getDaysLabel(d); return <span className={`text-sm font-semibold ${color}`}>{label}</span>; })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timetable">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="timetable"><Calendar className="w-4 h-4 mr-1.5" />My Timetable</TabsTrigger>
          {examTimetable.enableAIStudyPlan !== false && (
            <TabsTrigger value="study-plan"><BookOpen className="w-4 h-4 mr-1.5" />AI Study Planner</TabsTrigger>
          )}
          {examTimetable.enableAIExamTips !== false && (
            <TabsTrigger value="tips"><Lightbulb className="w-4 h-4 mr-1.5" />AI Exam Tips</TabsTrigger>
          )}
        </TabsList>

        {/* Timetable tab */}
        <TabsContent value="timetable">
          {myEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No exams have been scheduled for your class yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myEntries.map((entry, i) => {
                const daysLeft = entry.date ? differenceInDays(new Date(entry.date), today) : null;
                const { label, color } = daysLeft !== null ? getDaysLabel(daysLeft) : { label: '', color: '' };
                const isPast = daysLeft !== null && daysLeft < 0;
                return (
                  <Card key={i} className={`border shadow-sm ${isPast ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="shrink-0 text-center bg-primary/10 rounded-lg p-2 w-16">
                          <div className="text-xs text-muted-foreground">{entry.dayOfWeek?.slice(0, 3)}</div>
                          <div className="font-bold text-primary text-sm">{entry.date ? format(new Date(entry.date), 'MMM d') : '—'}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{entry.subjectName}</span>
                            <Badge variant="outline" className="text-xs">{entry.examType || 'written'}</Badge>
                            {entry.maxMarks && <Badge variant="secondary" className="text-xs">{entry.maxMarks} marks</Badge>}
                            {!isPast && label && <span className={`text-xs font-semibold ${color}`}>{label}</span>}
                            {isPast && <Badge variant="secondary" className="text-xs">Completed</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                             {entry.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.startTime}–{entry.endTime}</span>}
                             {entry.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.venue}</span>}
                             {entry.invigilatorName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.invigilatorName}</span>}
                           </div>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* AI Study Plan tab */}
        {examTimetable.enableAIStudyPlan !== false && (
          <TabsContent value="study-plan">
            <AIStudyPlanGenerator
              entries={myEntries}
              grades={grades}
              lessonPlans={lessonPlans}
              studentName={user?.fullName}
              studentId={user?.id}
              schoolId={user?.schoolId}
              parentPrompts={parentPrompts}
            />
          </TabsContent>
        )}

        {/* AI Tips tab */}
        {examTimetable.enableAIExamTips !== false && (
          <TabsContent value="tips">
            <AIExamPreparationTips
              entries={myEntries}
              grades={grades}
              lessonPlans={lessonPlans}
              studentId={user?.id}
              schoolId={user?.schoolId}
              studentName={user?.fullName}
            />
          </TabsContent>
        )}
      </Tabs>

      {examTimetable.enableAIChatbot !== false && (
        <AITimetableChatbot entries={myEntries} userRole="student" userName={user?.fullName} grades={grades} />
      )}
    </div>
  );
}