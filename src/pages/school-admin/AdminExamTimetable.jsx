import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Plus, Trash2, Eye, EyeOff, BookOpen, AlertTriangle,
  Calendar, ToggleLeft, ToggleRight, BookOpenCheck, Brain, BarChart2, Wand2, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import ExamScheduleTab from '@/components/exam-timetable/ExamScheduleTab';
import AIExamPlannerTab from '@/components/exam-timetable/AIExamPlannerTab';
import InvigilatorReport from '@/components/timetable/InvigilatorReport';
import { AITimetableInsights, AIPerformancePrediction } from '@/components/timetable/AITimetableAssistant';

export default function AdminExamTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [examTimetable, setExamTimetable] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [savingInv, setSavingInv] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    sessionName: '', academicYear: '', term: '', startDate: '', endDate: ''
  });

  const [entryForm, setEntryForm] = useState({
    date: '', dayOfWeek: '', subjectId: '', classIds: [], startTime: '', endTime: '',
    venue: '', invigilatorId: '', examType: 'written', maxMarks: 100, notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!examTimetable?.id) return;
    const unsub = base44.entities.ExamTimetable.subscribe((event) => {
      if (event.id === examTimetable.id && event.type !== 'delete') {
        setExamTimetable(event.data);
      }
    });
    return unsub;
  }, [examTimetable?.id]);

  async function loadData() {
    setLoading(true);
    const [et, cls, subj, teach, lp, grd] = await Promise.all([
      base44.entities.ExamTimetable.filter({ schoolId }).catch(() => []),
      base44.entities.SchoolClass.filter({ schoolId, isArchived: false }).catch(() => []),
      base44.entities.Subject.filter({ schoolId, isArchived: false }).catch(() => []),
      base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }).catch(() => []),
      base44.entities.LessonPlan.filter({ schoolId, isPublished: true }).catch(() => []),
      base44.entities.Grade.filter({ schoolId }).catch(() => []),
    ]);
    const sorted = (et || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setExamTimetable(sorted[0] || null);
    setClasses(cls || []);
    setSubjects(subj || []);
    setTeachers(teach || []);
    setLessonPlans(lp || []);
    setGrades(grd || []);
    setLoading(false);
  }

  async function createSession() {
    if (!sessionForm.sessionName) return toast.error('Session name is required');
    setSaving(true);
    const created = await base44.entities.ExamTimetable.create({
      schoolId, ...sessionForm, status: 'draft', isVisible: false,
      enableAIStudyPlan: true, enableAIExamTips: true,
      enableAIChatbot: true, enableAIParentInsights: true, entries: []
    });
    setExamTimetable(created);
    setShowCreateDialog(false);
    setSaving(false);
    toast.success('Exam session created');
  }

  async function togglePublish() {
    if (!examTimetable) return;
    const isPublished = examTimetable.status === 'published';
    if (isPublished) {
      // Move back to draft — hide from all users
      const updates = { status: 'draft', isVisible: false };
      await base44.entities.ExamTimetable.update(examTimetable.id, updates);
      setExamTimetable(prev => ({ ...prev, ...updates }));
      toast.success('Timetable moved to draft and hidden from users');
    } else {
      // Publish — make visible to all users immediately
      const updates = {
        status: 'published',
        isVisible: true,
        publishedAt: new Date().toISOString(),
        publishedBy: user?.fullName || user?.email || 'Admin',
      };
      await base44.entities.ExamTimetable.update(examTimetable.id, updates);
      setExamTimetable(prev => ({ ...prev, ...updates }));
      // Send in-app notification to students, teachers and parents
      try {
        await Promise.all([
          base44.entities.Notification.create({
            schoolId,
            type: 'announcement',
            title: '📅 Exam Timetable Published!',
            message: `Your exam timetable for "${examTimetable.sessionName}" is now available. Click here to view your exam schedule.`,
            targetRole: 'student',
            targetClassIds: [],
            targetUserIds: [],
          }),
          base44.entities.Notification.create({
            schoolId,
            type: 'announcement',
            title: '📅 Exam Timetable Published!',
            message: `The exam timetable for "${examTimetable.sessionName}" is now live. View the full schedule and your invigilation duties.`,
            targetRole: 'teacher',
            targetClassIds: [],
            targetUserIds: [],
          }),
          base44.entities.Notification.create({
            schoolId,
            type: 'announcement',
            title: '📅 Exam Timetable Published!',
            message: `Your child's exam timetable for "${examTimetable.sessionName}" is now available. Click here to view the schedule.`,
            targetRole: 'parent',
            targetClassIds: [],
            targetUserIds: [],
          }),
        ]);
      } catch (e) {
        // Notifications are best-effort — don't block publish
      }
      toast.success('✅ Timetable published and now visible to all users!');
    }
  }

  async function toggleVisibility() {
    if (!examTimetable) return;
    // Only allow visibility toggle when published
    if (examTimetable.status !== 'published') {
      toast.error('Publish the timetable first before changing visibility');
      return;
    }
    const newVisible = !examTimetable.isVisible;
    await base44.entities.ExamTimetable.update(examTimetable.id, { isVisible: newVisible });
    setExamTimetable(prev => ({ ...prev, isVisible: newVisible }));
    toast.success(newVisible ? '✅ Exam Timetable is now VISIBLE to all users' : '🔒 Exam Timetable hidden from users');
  }

  async function toggleAI(field) {
    if (!examTimetable) return;
    const newVal = !examTimetable[field];
    await base44.entities.ExamTimetable.update(examTimetable.id, { [field]: newVal });
    setExamTimetable(prev => ({ ...prev, [field]: newVal }));
  }

  async function addEntry() {
    if (!entryForm.subjectId || !entryForm.date) return toast.error('Subject and date are required');
    const subj = subjects.find(s => s.id === entryForm.subjectId);
    const teacher = teachers.find(t => t.id === entryForm.invigilatorId);
    const classNames = classes.filter(c => (entryForm.classIds || []).includes(c.id)).map(c => c.className);
    const dayOfWeek = entryForm.date ? new Date(entryForm.date).toLocaleDateString('en-US', { weekday: 'long' }) : '';
    const newEntry = {
      id: Date.now().toString(),
      ...entryForm,
      dayOfWeek,
      subjectName: subj?.name || '',
      classNames,
      invigilatorName: teacher?.fullName || '',
    };
    const updatedEntries = [...(examTimetable.entries || []), newEntry];
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: updatedEntries });
    setExamTimetable(prev => ({ ...prev, entries: updatedEntries }));
    setEntryForm({ date: '', dayOfWeek: '', subjectId: '', classIds: [], startTime: '', endTime: '', venue: '', invigilatorId: '', examType: 'written', maxMarks: 100, notes: '' });
    setShowEntryDialog(false);
    toast.success('Exam entry added');
  }

  async function deleteEntry(entryId) {
    const updatedEntries = (examTimetable.entries || []).filter(e => e.id !== entryId);
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: updatedEntries });
    setExamTimetable(prev => ({ ...prev, entries: updatedEntries }));
    toast.success('Entry removed');
  }

  async function updateEntry(entryId, changes) {
    const now = new Date().toISOString();
    const updatedEntries = (examTimetable.entries || []).map(e => {
      if (e.id !== entryId) return e;
      // Build change log
      const logEntries = [];
      for (const [key, val] of Object.entries(changes)) {
        if (e[key] !== val && !['invigilatorId'].includes(key)) {
          logEntries.push({ field: key, from: e[key] || '', to: val, by: user?.fullName || 'Admin', at: now, subject: e.subjectName });
        }
      }
      return {
        ...e,
        ...changes,
        changeLog: [...(e.changeLog || []), ...logEntries],
      };
    });
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: updatedEntries });
    setExamTimetable(prev => ({ ...prev, entries: updatedEntries }));
  }

  async function deleteSession() {
    if (!window.confirm('Delete this exam timetable session? This cannot be undone.')) return;
    await base44.entities.ExamTimetable.delete(examTimetable.id);
    setExamTimetable(null);
    toast.success('Exam timetable deleted');
  }

  async function saveInvigilators(entryId, invData) {
    setSavingInv(true);
    const updatedEntries = (examTimetable.entries || []).map(e =>
      e.id === entryId ? { ...e, ...invData } : e
    );
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: updatedEntries });
    setExamTimetable(prev => ({ ...prev, entries: updatedEntries }));
    setSavingInv(false);
    toast.success('Invigilator assignment saved');
  }

  async function handleAutoAssign(assignments, summary) {
    setSavingInv(true);
    const updatedEntries = (examTimetable.entries || []).map(entry => {
      const asgn = assignments.find(a => a.entryId === entry.id);
      if (!asgn) return entry;
      return {
        ...entry,
        invigilatorId: asgn.teacherId,
        invigilatorName: asgn.teacherName,
        invigilators: [{ teacherId: asgn.teacherId, teacherName: asgn.teacherName, role: 'primary', confirmed: false, checkinTime: '', instructions: '' }],
      };
    });
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: updatedEntries });
    setExamTimetable(prev => ({ ...prev, entries: updatedEntries }));
    setSavingInv(false);
    toast.success(summary);
  }

  // Handle AI Planner apply
  async function handlePlannerApply(aiRows, manualAssignments, onApplyComplete) {
    if (!examTimetable || !aiRows?.length) return;
    const norm = s => (s || '').toLowerCase().replace(/\s+/g, '');
    const newEntries = aiRows.map((row, i) => {
      const subj = subjects.find(s => norm(s.name) === norm(row.subject) || norm(row.subject).includes(norm(s.name)));
      // Handle combined class names like "JS1A, JS1B" — use first matched class
      const rowClassNames = (row.className || '').split(/[,/&]+/).map(s => s.trim());
      const cls = rowClassNames.map(rcn => classes.find(c => norm(c.className) === norm(rcn))).find(Boolean);
      const manual = manualAssignments?.[i];
      const invTeacher = teachers.find(t => t.fullName?.toLowerCase() === row.invigilator?.toLowerCase());
      return {
        id: `ai_${Date.now()}_${i}`,
        date: row.date || '',
        dayOfWeek: row.day || '',
        subjectId: subj?.id || '',
        subjectName: row.subject || '',
        classIds: cls ? [cls.id] : [],
        classNames: cls ? [cls.className] : [row.className || ''],
        startTime: row.startTime || '',
        endTime: row.endTime || '',
        venue: row.venue || '',
        examType: 'written',
        maxMarks: 100,
        notes: '',
        invigilatorId: manual?.teacherId || invTeacher?.id || '',
        invigilatorName: manual?.teacherName || invTeacher?.fullName || row.invigilator || '',
      };
    });
    const combined = [...(examTimetable.entries || []), ...newEntries];
    await base44.entities.ExamTimetable.update(examTimetable.id, { entries: combined });
    setExamTimetable(prev => ({ ...prev, entries: combined }));
    toast.success(`${newEntries.length} exam entries added from AI Planner`);
    setActiveTab('schedule');
  }

  // Lesson plan coverage
  const subjectIds = [...new Set((examTimetable?.entries || []).map(e => e.subjectId))];
  const lpBySubject = {};
  for (const lp of lessonPlans) {
    if (!lpBySubject[lp.subjectId]) lpBySubject[lp.subjectId] = [];
    lpBySubject[lp.subjectId].push(lp);
  }
  const subjectsWithPlans = subjectIds.filter(id => lpBySubject[id]?.length > 0);
  const subjectsMissingPlans = subjectIds.filter(id => !lpBySubject[id]?.length);

  const entries = examTimetable?.entries || [];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exam Timetable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage the school exam schedule</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {examTimetable && (
            <>
              <Button
                variant={examTimetable.status === 'published' ? 'outline' : 'default'}
                size="sm"
                onClick={togglePublish}
                className={examTimetable.status !== 'published' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              >
                {examTimetable.status === 'published' ? (
                  <><EyeOff className="w-4 h-4 mr-1" /> Unpublish</>
                ) : (
                  <><Eye className="w-4 h-4 mr-1" /> Publish & Make Visible</>
                )}
              </Button>
              {examTimetable.status === 'published' && (
                <Button
                  size="sm"
                  variant={examTimetable.isVisible ? 'default' : 'outline'}
                  onClick={toggleVisibility}
                  className="gap-2"
                >
                  {examTimetable.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {examTimetable.isVisible ? 'Visible' : 'Hidden'}
                </Button>
              )}
              <Button size="sm" onClick={() => setShowEntryDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Exam
              </Button>
            </>
          )}
          {!examTimetable && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Exam Session
            </Button>
          )}
        </div>
      </div>

      {/* No timetable */}
      {!examTimetable && (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg text-foreground mb-1">No Exam Timetable Yet</p>
          <p className="text-sm mb-6">Create an exam session to get started. Once published and made visible, it will appear in all user portals.</p>
          <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" /> Create Exam Session</Button>
        </div>
      )}

      {examTimetable && (
        <>
          {/* Session info + Visibility Status */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg">{examTimetable.sessionName}</h2>
                    <Badge variant={examTimetable.status === 'published' ? 'default' : 'secondary'}>
                      {examTimetable.status}
                    </Badge>
                    {examTimetable.isVisible && examTimetable.status === 'published' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">🟢 LIVE — Visible to all users</Badge>
                    )}
                    {examTimetable.status === 'published' && !examTimetable.isVisible && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">🟡 Published but Hidden</Badge>
                    )}
                    {examTimetable.status !== 'published' && (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">🔒 Draft — Not visible to users</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {examTimetable.academicYear && `${examTimetable.academicYear} · `}
                    {examTimetable.term && `${examTimetable.term} · `}
                    {examTimetable.startDate && examTimetable.endDate && `${format(new Date(examTimetable.startDate), 'MMM d')} – ${format(new Date(examTimetable.endDate), 'MMM d, yyyy')}`}
                    {entries.length > 0 && ` · ${entries.length} exam${entries.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={deleteSession}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Session
                </Button>
              </div>
              {/* Visibility info bar */}
              <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
                examTimetable.isVisible && examTimetable.status === 'published'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border border-slate-200 text-slate-600'
              }`}>
                {examTimetable.isVisible && examTimetable.status === 'published' ? (
                  <>
                    <Eye className="w-4 h-4 shrink-0" />
                    <span><strong>Visible to:</strong> Students, Teachers, Parents of this school</span>
                    {examTimetable.publishedAt && (
                      <span className="ml-auto text-xs text-emerald-600">
                        Published {format(new Date(examTimetable.publishedAt), 'MMM d, yyyy h:mm a')}
                        {examTimetable.publishedBy && ` by ${examTimetable.publishedBy}`}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 shrink-0" />
                    <span><strong>Hidden from:</strong> Students, Teachers, Parents — {examTimetable.status === 'draft' ? 'Publish this timetable to make it visible.' : 'Toggle visibility ON to show it.'}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="schedule"><Calendar className="w-3.5 h-3.5 mr-1" />Exam Schedule</TabsTrigger>
              <TabsTrigger value="ai-planner"><Wand2 className="w-3.5 h-3.5 mr-1" />AI Exam Planner</TabsTrigger>
              <TabsTrigger value="ai-insights"><Brain className="w-3.5 h-3.5 mr-1" />AI Insights</TabsTrigger>
              <TabsTrigger value="predictions"><BarChart2 className="w-3.5 h-3.5 mr-1" />Predictions</TabsTrigger>
              <TabsTrigger value="invigilators"><ClipboardList className="w-3.5 h-3.5 mr-1" />Invigilator Report</TabsTrigger>
              <TabsTrigger value="lesson-coverage"><BookOpen className="w-3.5 h-3.5 mr-1" />Lesson Plan Coverage</TabsTrigger>
              <TabsTrigger value="ai-controls"><ToggleRight className="w-3.5 h-3.5 mr-1" />AI Controls</TabsTrigger>
            </TabsList>

            {/* Tab 1: Exam Schedule */}
            <TabsContent value="schedule">
              <ExamScheduleTab
                entries={entries}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                onDeleteEntry={deleteEntry}
                onUpdateEntry={updateEntry}
                savingInv={savingInv}
                onSaveInvigilators={saveInvigilators}
              />
            </TabsContent>

            {/* Tab 2: AI Exam Planner */}
            <TabsContent value="ai-planner">
              <AIExamPlannerTab
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                examTimetable={examTimetable}
                onApply={handlePlannerApply}
                schoolId={schoolId}
              />
            </TabsContent>

            {/* Tab 3: AI Insights */}
            <TabsContent value="ai-insights">
              <AITimetableInsights
                entries={entries}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
              />
            </TabsContent>

            {/* Tab 4: Predictions */}
            <TabsContent value="predictions">
              <AIPerformancePrediction
                entries={entries}
                subjects={subjects}
                classes={classes}
                grades={grades}
              />
            </TabsContent>

            {/* Tab 5: Invigilator Report */}
            <TabsContent value="invigilators">
              <InvigilatorReport
                entries={entries}
                teachers={teachers}
                onAutoAssign={handleAutoAssign}
              />
            </TabsContent>

            {/* Tab 6: Lesson Plan Coverage */}
            <TabsContent value="lesson-coverage">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-700">{subjectsWithPlans.length}</div>
                      <div className="text-xs text-emerald-600 mt-1">Subjects with lesson plans</div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-700">{subjectsMissingPlans.length}</div>
                      <div className="text-xs text-red-600 mt-1">Subjects missing lesson plans</div>
                    </CardContent>
                  </Card>
                </div>
                {subjectsMissingPlans.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" /> AI features cannot generate for these subjects:
                    </div>
                    <ul className="space-y-1">
                      {subjectsMissingPlans.map(id => {
                        const subj = subjects.find(s => s.id === id);
                        return <li key={id} className="text-sm text-amber-700">• {subj?.name || id} — no lesson plans uploaded</li>;
                      })}
                    </ul>
                    <p className="text-xs text-amber-600 mt-2">Ask the relevant teachers to upload and publish lesson plans for these subjects.</p>
                  </div>
                )}
                {subjectsWithPlans.length > 0 && (
                  <div className="space-y-2">
                    {subjectsWithPlans.map(id => {
                      const subj = subjects.find(s => s.id === id);
                      const plans = lpBySubject[id] || [];
                      return (
                        <div key={id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                          <BookOpenCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{subj?.name || id}</span>
                            <span className="text-xs text-muted-foreground ml-2">{plans.length} lesson plan{plans.length !== 1 ? 's' : ''} uploaded</span>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">AI Ready</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 7: AI Controls */}
            <TabsContent value="ai-controls">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">AI Feature Controls</h3>
                  <p className="text-sm text-muted-foreground">Toggle which AI features students and parents can access when the exam timetable is live.</p>
                  {[
                    { field: 'enableAIStudyPlan', label: 'AI Study Plan for Students', desc: 'Students can generate a personalised study plan from lesson plans' },
                    { field: 'enableAIExamTips', label: 'AI Exam Tips for Students', desc: 'Students can generate subject-specific exam tips from lesson plans' },
                    { field: 'enableAIChatbot', label: 'AI Chatbot for Students', desc: 'Floating AI assistant on the exam timetable page' },
                    { field: 'enableAIParentInsights', label: 'AI Insights for Parents', desc: "Parents can view AI analysis of their child's exam readiness" },
                  ].map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <button onClick={() => toggleAI(field)} className="shrink-0">
                        {examTimetable[field]
                          ? <ToggleRight className="w-8 h-8 text-primary" />
                          : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create session dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Exam Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Session Name *</Label><Input value={sessionForm.sessionName} onChange={e => setSessionForm(p => ({ ...p, sessionName: e.target.value }))} placeholder="e.g. Term 2 Exams 2026" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Academic Year</Label><Input value={sessionForm.academicYear} onChange={e => setSessionForm(p => ({ ...p, academicYear: e.target.value }))} placeholder="2025-2026" className="mt-1" /></div>
              <div><Label>Term</Label><Input value={sessionForm.term} onChange={e => setSessionForm(p => ({ ...p, term: e.target.value }))} placeholder="Term 2" className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={sessionForm.startDate} onChange={e => setSessionForm(p => ({ ...p, startDate: e.target.value }))} className="mt-1" /></div>
              <div><Label>End Date</Label><Input type="date" value={sessionForm.endDate} onChange={e => setSessionForm(p => ({ ...p, endDate: e.target.value }))} className="mt-1" /></div>
            </div>
            <Button onClick={createSession} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add entry dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Exam Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={entryForm.date} onChange={e => setEntryForm(p => ({ ...p, date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Subject *</Label>
                <Select value={entryForm.subjectId} onValueChange={v => setEntryForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Classes</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {classes.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => setEntryForm(p => ({ ...p, classIds: p.classIds.includes(c.id) ? p.classIds.filter(id => id !== c.id) : [...p.classIds, c.id] }))}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${entryForm.classIds.includes(c.id) ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}>
                    {c.className}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={entryForm.startTime} onChange={e => setEntryForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" /></div>
              <div><Label>End Time</Label><Input type="time" value={entryForm.endTime} onChange={e => setEntryForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Venue</Label><Input value={entryForm.venue} onChange={e => setEntryForm(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Hall A" className="mt-1" /></div>
              <div><Label>Max Marks</Label><Input type="number" value={entryForm.maxMarks} onChange={e => setEntryForm(p => ({ ...p, maxMarks: Number(e.target.value) }))} className="mt-1" /></div>
            </div>
            <div>
              <Label>Invigilator</Label>
              <Select value={entryForm.invigilatorId} onValueChange={v => setEntryForm(p => ({ ...p, invigilatorId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select teacher (optional)" /></SelectTrigger>
                <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exam Type</Label>
              <Select value={entryForm.examType} onValueChange={v => setEntryForm(p => ({ ...p, examType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="written">Written</SelectItem>
                  <SelectItem value="oral">Oral</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={entryForm.notes} onChange={e => setEntryForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional instructions" className="mt-1" /></div>
            <Button onClick={addEntry} className="w-full">Add Exam Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}