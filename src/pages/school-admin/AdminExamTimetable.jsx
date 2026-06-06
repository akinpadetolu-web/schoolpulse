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
  Calendar, Clock, MapPin, User, ToggleLeft, ToggleRight, BookOpenCheck, Users, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InvigilatorAssignmentPanel from '@/components/timetable/InvigilatorAssignmentPanel';
import InvigilatorReport from '@/components/timetable/InvigilatorReport';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminExamTimetable() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [examTimetable, setExamTimetable] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedInvEntry, setExpandedInvEntry] = useState(null);
  const [savingInv, setSavingInv] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    sessionName: '', academicYear: '', term: '', startDate: '', endDate: ''
  });

  const [entryForm, setEntryForm] = useState({
    date: '', dayOfWeek: '', subjectId: '', classIds: [], startTime: '', endTime: '',
    venue: '', invigilatorId: '', examType: 'written', maxMarks: 100, notes: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [et, cls, subj, teach, lp] = await Promise.all([
      base44.entities.ExamTimetable.filter({ schoolId }).catch(() => []),
      base44.entities.SchoolClass.filter({ schoolId, isArchived: false }).catch(() => []),
      base44.entities.Subject.filter({ schoolId, isArchived: false }).catch(() => []),
      base44.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }).catch(() => []),
      base44.entities.LessonPlan.filter({ schoolId, isPublished: true }).catch(() => []),
    ]);
    const sorted = (et || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setExamTimetable(sorted[0] || null);
    setClasses(cls || []);
    setSubjects(subj || []);
    setTeachers(teach || []);
    setLessonPlans(lp || []);
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
    const newStatus = examTimetable.status === 'published' ? 'draft' : 'published';
    const updated = await base44.entities.ExamTimetable.update(examTimetable.id, { status: newStatus });
    setExamTimetable(prev => ({ ...prev, status: newStatus }));
    toast.success(newStatus === 'published' ? 'Timetable published!' : 'Timetable moved to draft');
  }

  async function toggleVisibility() {
    if (!examTimetable) return;
    const newVisible = !examTimetable.isVisible;
    await base44.entities.ExamTimetable.update(examTimetable.id, { isVisible: newVisible });
    setExamTimetable(prev => ({ ...prev, isVisible: newVisible }));
    toast.success(newVisible ? 'Exam Timetable is now VISIBLE to all users' : 'Exam Timetable hidden from users');
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
    setExpandedInvEntry(null);
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

  // Lesson plan coverage
  const subjectIds = [...new Set((examTimetable?.entries || []).map(e => e.subjectId))];
  const lpBySubject = {};
  for (const lp of lessonPlans) {
    if (!lpBySubject[lp.subjectId]) lpBySubject[lp.subjectId] = [];
    lpBySubject[lp.subjectId].push(lp);
  }
  const subjectsWithPlans = subjectIds.filter(id => lpBySubject[id]?.length > 0);
  const subjectsMissingPlans = subjectIds.filter(id => !lpBySubject[id]?.length);

  // Filtered entries
  const filteredEntries = (examTimetable?.entries || [])
    .filter(e => {
      if (filterClass !== 'all' && !(e.classIds || []).includes(filterClass)) return false;
      if (filterSubject !== 'all' && e.subjectId !== filterSubject) return false;
      if (search && !e.subjectName?.toLowerCase().includes(search.toLowerCase()) && !e.venue?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

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
              <Button variant="outline" size="sm" onClick={togglePublish}>
                {examTimetable.status === 'published' ? 'Move to Draft' : 'Publish'}
              </Button>
              <Button
                size="sm"
                variant={examTimetable.isVisible ? 'default' : 'outline'}
                onClick={toggleVisibility}
                className="gap-2"
              >
                {examTimetable.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {examTimetable.isVisible ? 'Visible to Users' : 'Hidden from Users'}
              </Button>
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
          {/* Session info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg">{examTimetable.sessionName}</h2>
                    <Badge variant={examTimetable.status === 'published' ? 'default' : 'secondary'}>
                      {examTimetable.status}
                    </Badge>
                    {examTimetable.isVisible && examTimetable.status === 'published' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">🟢 LIVE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {examTimetable.academicYear && `${examTimetable.academicYear} · `}
                    {examTimetable.term && `${examTimetable.term} · `}
                    {examTimetable.startDate && examTimetable.endDate && `${format(new Date(examTimetable.startDate), 'MMM d')} – ${format(new Date(examTimetable.endDate), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={deleteSession}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="schedule">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="schedule">Exam Schedule</TabsTrigger>
              <TabsTrigger value="invigilators">Invigilator Report</TabsTrigger>
              <TabsTrigger value="ai-controls">AI Controls</TabsTrigger>
              <TabsTrigger value="lesson-coverage">Lesson Plan Coverage</TabsTrigger>
            </TabsList>

            {/* Schedule tab */}
            <TabsContent value="schedule" className="space-y-4">
              {/* Filters */}
              <div className="flex gap-3 flex-wrap">
                <Input placeholder="Search subject or venue…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-8 text-sm" />
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No exam entries yet. Click "Add Exam" to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry, i) => {
                    const hasInv = entry.invigilators?.length > 0 || !!entry.invigilatorId;
                    const isExpanded = expandedInvEntry === entry.id;
                    return (
                      <Card key={entry.id || i} className="border shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="shrink-0 text-center bg-primary/10 rounded-lg p-2 w-16">
                              <div className="text-xs text-muted-foreground">{entry.dayOfWeek?.slice(0, 3)}</div>
                              <div className="font-bold text-primary">{entry.date ? format(new Date(entry.date), 'MMM d') : '—'}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{entry.subjectName}</span>
                                <Badge variant="outline" className="text-xs">{entry.examType}</Badge>
                                {entry.maxMarks && <Badge variant="secondary" className="text-xs">{entry.maxMarks} marks</Badge>}
                                {!hasInv && <Badge className="bg-red-100 text-red-700 text-xs border-red-200">No Invigilator</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                {entry.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.startTime}–{entry.endTime}</span>}
                                {entry.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.venue}</span>}
                                {entry.invigilatorName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.invigilatorName}</span>}
                                {entry.classNames?.length > 0 && <span>{entry.classNames.join(', ')}</span>}
                              </div>
                              {entry.notes && <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => setExpandedInvEntry(isExpanded ? null : entry.id)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Users className="w-3.5 h-3.5" />
                                {isExpanded ? 'Close' : 'Invigilators'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t">
                              <InvigilatorAssignmentPanel
                                entry={entry}
                                allEntries={examTimetable.entries || []}
                                teachers={teachers}
                                subjects={subjects}
                                saving={savingInv}
                                onSave={(invData) => saveInvigilators(entry.id, invData)}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Invigilator Report tab */}
            <TabsContent value="invigilators">
              <InvigilatorReport
                entries={examTimetable.entries || []}
                teachers={teachers}
                onAutoAssign={handleAutoAssign}
              />
            </TabsContent>

            {/* AI Controls tab */}
            <TabsContent value="ai-controls">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">AI Feature Controls</h3>
                  <p className="text-sm text-muted-foreground">Toggle which AI features students and parents can access when the exam timetable is live.</p>
                  {[
                    { field: 'enableAIStudyPlan', label: 'AI Study Plan for Students', desc: 'Students can generate a personalised study plan from lesson plans' },
                    { field: 'enableAIExamTips', label: 'AI Exam Tips for Students', desc: 'Students can generate subject-specific exam tips from lesson plans' },
                    { field: 'enableAIChatbot', label: 'AI Chatbot for Students', desc: 'Floating AI assistant on the exam timetable page' },
                    { field: 'enableAIParentInsights', label: 'AI Insights for Parents', desc: 'Parents can view AI analysis of their child\'s exam readiness' },
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

            {/* Lesson plan coverage */}
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