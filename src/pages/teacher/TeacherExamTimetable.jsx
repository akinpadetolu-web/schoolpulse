import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { useExamTimetable } from '@/lib/examTimetableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, MapPin, User, BookOpen, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function TeacherExamTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const { examTimetable, loading: etLoading } = useExamTimetable(user?.schoolId);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    base44.entities.LessonPlan.filter({ schoolId: user.schoolId, teacherId: user.id }).catch(() => [])
      .then(lp => { setLessonPlans(lp || []); setDataLoading(false); });
  }, [user?.id]);

  if (etLoading || dataLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!examTimetable) {
    return (
      <div className="text-center py-20">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="font-semibold text-lg mb-1">Exam Timetable Not Available</p>
        <p className="text-sm text-muted-foreground">The school admin has not published an exam timetable yet.</p>
      </div>
    );
  }

  const allEntries = (examTimetable.entries || []).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const myInvigilation = allEntries.filter(e => e.invigilatorId === user?.id);
  const myClassIds = user?.assignedClasses || [];
  const myClassEntries = allEntries.filter(e => (e.classIds || []).some(id => myClassIds.includes(id)));
  const today = new Date();

  function EntryCard({ entry }) {
    const daysLeft = entry.date ? differenceInDays(new Date(entry.date), today) : null;
    return (
      <Card className="border shadow-sm">
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
                {entry.classNames?.length > 0 && <Badge variant="secondary" className="text-xs">{entry.classNames.join(', ')}</Badge>}
                {daysLeft !== null && daysLeft >= 0 && (
                  <span className={`text-xs font-semibold ${daysLeft === 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {daysLeft === 0 ? 'TODAY' : `${daysLeft}d`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                {entry.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.startTime}–{entry.endTime}</span>}
                {entry.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.venue}</span>}
                {entry.invigilatorName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.invigilatorName}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lpBySubject = {};
  for (const lp of lessonPlans) {
    if (!lpBySubject[lp.subjectId]) lpBySubject[lp.subjectId] = [];
    lpBySubject[lp.subjectId].push(lp);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Exam Timetable</h1>
        <p className="text-sm text-muted-foreground">{examTimetable.sessionName}</p>
      </div>

      <Tabs defaultValue="full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="full">Full Timetable</TabsTrigger>
          <TabsTrigger value="invigilation">My Invigilation</TabsTrigger>
          <TabsTrigger value="my-classes">My Classes</TabsTrigger>
          <TabsTrigger value="lesson-plans">Lesson Plan Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="full">
          <div className="space-y-2">
            {allEntries.length === 0 && <div className="text-center py-10 text-muted-foreground">No exam entries scheduled yet.</div>}
            {allEntries.map((e, i) => <EntryCard key={i} entry={e} />)}
          </div>
        </TabsContent>

        <TabsContent value="invigilation">
          {myInvigilation.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>You have no invigilation duties assigned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                📋 You have <strong>{myInvigilation.length}</strong> invigilation {myInvigilation.length === 1 ? 'duty' : 'duties'} assigned. Please confirm each one below.
              </div>
              {myInvigilation.map((entry, i) => {
                // Find my assignment within invigilators array
                const myAssignment = (entry.invigilators || []).find(inv => inv.teacherId === user?.id) ||
                  (entry.invigilatorId === user?.id ? { role: 'primary', confirmed: false, checkinTime: '', instructions: '' } : null);
                const daysLeft = entry.date ? differenceInDays(new Date(entry.date), today) : null;
                return (
                  <Card key={i} className={`border shadow-sm ${myAssignment?.confirmed ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="shrink-0 text-center bg-primary/10 rounded-lg p-2 w-16">
                          <div className="text-xs text-muted-foreground">{entry.dayOfWeek?.slice(0, 3)}</div>
                          <div className="font-bold text-primary text-sm">{entry.date ? format(new Date(entry.date), 'MMM d') : '—'}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{entry.subjectName}</span>
                            {myAssignment?.role && <Badge variant="secondary" className="text-xs capitalize">{myAssignment.role.replace('_', ' ')} Invigilator</Badge>}
                            {entry.classNames?.length > 0 && <Badge variant="outline" className="text-xs">{entry.classNames.join(', ')}</Badge>}
                            {daysLeft !== null && daysLeft >= 0 && (
                              <span className={`text-xs font-semibold ${daysLeft === 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                {daysLeft === 0 ? 'TODAY' : `${daysLeft}d away`}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {entry.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.startTime}–{entry.endTime}</span>}
                            {entry.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.venue}</span>}
                            {myAssignment?.checkinTime && <span className="flex items-center gap-1 text-amber-600">⏰ Check-in: {myAssignment.checkinTime}</span>}
                          </div>
                          {myAssignment?.instructions && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                              <strong>Admin instructions:</strong> {myAssignment.instructions}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {myAssignment?.confirmed
                            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">✓ Confirmed</Badge>
                            : <Badge className="bg-amber-100 text-amber-700 border-amber-300">⏳ Pending</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-classes">
          {myClassEntries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No exams found for your assigned classes.</p>
            </div>
          ) : (
            <div className="space-y-2">{myClassEntries.map((e, i) => <EntryCard key={i} entry={e} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="lesson-plans">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Your uploaded lesson plans help students generate AI Study Plans and Exam Tips. Make sure all exam subjects are covered.</p>
            {lessonPlans.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ You haven't uploaded any lesson plans yet. Students need lesson plans to generate AI Study Plans and Exam Tips.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(lpBySubject).map(([subjectId, plans]) => (
                  <div key={subjectId} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{plans[0]?.subjectName || subjectId}</span>
                      <span className="text-xs text-muted-foreground ml-2">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">AI Ready</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}