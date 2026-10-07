import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { useExamTimetable } from '@/lib/examTimetableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Lightbulb, Clock, MapPin, Heart, User, MessageSquare, Send } from 'lucide-react';
import AIParentInsights from '@/components/timetable/AIParentInsights';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function ParentExamTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const { examTimetable, loading: etLoading } = useExamTimetable(user?.schoolId);
  const [children, setChildren] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [parentPrompts, setParentPrompts] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const linkedIds = user?.linkedStudentIds || [];
      if (linkedIds.length === 0) { setDataLoading(false); return; }
      const [kids, gradeData] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' }).catch(() => []),
        base44.entities.Grade.filter({ schoolId: user.schoolId }).catch(() => []),
      ]);
      const myChildren = (kids || []).filter(k => linkedIds.includes(k.id));
      setChildren(myChildren);
      setGrades(gradeData || []);
      if (myChildren.length > 0) setSelectedChildId(myChildren[0].id);
      // Load parent prompts from local storage (persisted per parent per school)
      const storedPrompts = JSON.parse(localStorage.getItem(`parentPrompts_${user.id}`) || '[]');
      setParentPrompts(storedPrompts);
      setDataLoading(false);
    }
    load();
  }, [user?.id]);

  function addParentPrompt() {
    if (!promptInput.trim()) return;
    const newPrompt = { text: promptInput.trim(), timestamp: new Date().toISOString(), parentId: user?.id };
    const updated = [...parentPrompts, newPrompt];
    setParentPrompts(updated);
    localStorage.setItem(`parentPrompts_${user.id}`, JSON.stringify(updated));
    setPromptInput('');
    toast.success('Your preference has been added to your child\'s study plan settings.');
  }

  function removeParentPrompt(idx) {
    const updated = parentPrompts.filter((_, i) => i !== idx);
    setParentPrompts(updated);
    localStorage.setItem(`parentPrompts_${user.id}`, JSON.stringify(updated));
  }

  if (etLoading || dataLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!examTimetable) {
    return (
      <div className="text-center py-20">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="font-semibold text-lg mb-1">Exam Timetable Not Available</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your school admin has not published an exam timetable yet. Please check back later.</p>
      </div>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const today = new Date();

  const childEntries = selectedChild
    ? (examTimetable.entries || [])
        .filter(e => (e.classIds || []).includes(selectedChild.classId))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    : [];

  const upcomingEntries = childEntries.filter(e => e.date && new Date(e.date) >= today);
  const nextExam = upcomingEntries[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Child's Exam Timetable</h1>
          <p className="text-sm text-muted-foreground">{examTimetable.sessionName}</p>
        </div>
        {children.length > 1 && (
          <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select child" /></SelectTrigger>
            <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {children.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">No linked children found in your account.</div>
      )}

      {selectedChild && (
        <>
          {/* Next exam */}
          {nextExam && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">NEXT EXAM — {selectedChild.fullName}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-lg">{nextExam.subjectName}</span>
                  <Badge variant="outline">{nextExam.date ? format(new Date(nextExam.date), 'EEE, MMM d') : '—'}</Badge>
                  {nextExam.startTime && <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{nextExam.startTime}</span>}
                  {nextExam.venue && <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{nextExam.venue}</span>}
                  {nextExam.date && (() => {
                    const d = differenceInDays(new Date(nextExam.date), today);
                    return <span className={`text-sm font-semibold ${d === 0 ? 'text-red-600' : d <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}>
                      {d === 0 ? 'TODAY' : d === 1 ? 'Tomorrow' : `${d} days away`}
                    </span>;
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="timetable">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="timetable"><Calendar className="w-4 h-4 mr-1.5" />Exam Timetable</TabsTrigger>
              {examTimetable.enableAIParentInsights !== false && (
                <TabsTrigger value="insights"><Heart className="w-4 h-4 mr-1.5" />AI Insights</TabsTrigger>
              )}
              <TabsTrigger value="prompts"><MessageSquare className="w-4 h-4 mr-1.5" />Study Plan Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="timetable">
              {childEntries.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No exams scheduled for {selectedChild.fullName}'s class yet.</div>
              ) : (
                <div className="space-y-2">
                  {childEntries.map((entry, i) => {
                    const daysLeft = entry.date ? differenceInDays(new Date(entry.date), today) : null;
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
                                {daysLeft !== null && !isPast && (
                                  <span className={`text-xs font-semibold ${daysLeft === 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    {daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                                  </span>
                                )}
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

            {examTimetable.enableAIParentInsights !== false && (
              <TabsContent value="insights">
                <AIParentInsights
                  children={selectedChild ? [selectedChild] : []}
                  timetable={examTimetable.entries || []}
                  grades={grades.filter(g => g.studentId === selectedChild?.id)}
                />
              </TabsContent>
            )}

            <TabsContent value="prompts" className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-1">Add Preferences to {selectedChild?.fullName}'s Study Plan</h3>
                <p className="text-xs text-muted-foreground mb-3">Your preferences will be included when your child generates their AI Study Plan.</p>
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 border rounded-lg p-2 text-sm resize-none min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                    placeholder={`e.g. My child has a doctor's appointment on June 12\nPlease allocate extra time for Mathematics\nMy child cannot study after 8PM\nMy child prefers studying in the morning`}
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                  />
                  <Button size="sm" className="self-end gap-1.5" onClick={addParentPrompt} disabled={savingPrompt || !promptInput.trim()}>
                    <Send className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>

              {parentPrompts.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Your Submitted Preferences ({parentPrompts.length})</h4>
                  {[...parentPrompts].reverse().map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                      <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{p.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.timestamp ? format(new Date(p.timestamp), 'MMM d, yyyy h:mm a') : ''}</p>
                      </div>
                      <button onClick={() => removeParentPrompt(parentPrompts.length - 1 - i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No preferences added yet. Use the box above to add study plan requests for your child.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}