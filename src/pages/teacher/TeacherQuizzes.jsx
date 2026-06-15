import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Trash2, Eye, EyeOff, ClipboardList, Clock, Calendar, Radio, Edit2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import QuizQuestionEditor from '@/components/teacher/QuizQuestionEditor';
import QuizBulkImportDialog from '@/components/teacher/QuizBulkImportDialog';

const RELEASE_MODES = [
  { value: "manual", label: "Manual — publish when ready" },
  { value: "scheduled", label: "Scheduled — pick a date & time" },
  { value: "class_start", label: "At class start time" },
  { value: "15min_into_class", label: "15 minutes into class" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherQuizzes() {
  const { schoolUser: user } = useSchoolAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", classId: "", classIds: [], subjectId: "",
    durationMinutes: 30, releaseMode: "manual",
    scheduledAt: "", timetableEntryId: "",
    passage: "", questions: []
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [q, c, s, tt] = await Promise.all([
      base44.entities.Quiz.filter({ schoolId: user.schoolId, teacherId: user.id, isArchived: false }),
      base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user.schoolId, isArchived: false }),
      base44.entities.TimetableEntry.filter({ schoolId: user.schoolId, teacherId: user.id }),
    ]);
    setQuizzes(q || []);
    setClasses(c || []);
    setSubjects(s || []);
    setTimetable(tt || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingQuiz(null);
    setForm({ title: "", description: "", classId: "", classIds: [], subjectId: "", durationMinutes: 30, releaseMode: "manual", scheduledAt: "", timetableEntryId: "", passage: "", questions: [] });
    setShowDialog(true);
  }

  function handleBulkImportComplete(importedQuestions) {
    setForm(prev => ({ ...prev, questions: importedQuestions }));
    setShowDialog(true);
  }

  function openEdit(quiz) {
    setEditingQuiz(quiz);
    setForm({
      title: quiz.title, description: quiz.description || "",
      classId: quiz.classId, classIds: quiz.classIds || [], subjectId: quiz.subjectId,
      durationMinutes: quiz.durationMinutes || 30,
      releaseMode: quiz.releaseMode || "manual",
      scheduledAt: quiz.scheduledAt || "",
      timetableEntryId: quiz.timetableEntryId || "",
      passage: quiz.passage || "", questions: quiz.questions || []
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.title || !form.subjectId) return toast.error("Title and subject are required");
    const selectedIds = form.classIds.length > 0 ? form.classIds : (form.classId ? [form.classId] : []);
    if (selectedIds.length === 0) return toast.error("Select at least one class");
    if (form.questions.length === 0) return toast.error("Add at least one question");
    setSaving(true);

    const selectedClasses = classes.filter(c => selectedIds.includes(c.id));
    const subj = subjects.find(s => s.id === form.subjectId);
    const ttEntry = timetable.find(t => t.id === form.timetableEntryId);

    const payload = {
      schoolId: user.schoolId,
      teacherId: user.id,
      teacherName: user.fullName,
      classId: selectedIds[0],
      className: selectedClasses[0]?.className || "",
      classIds: selectedIds,
      classNames: selectedClasses.map(c => c.className),
      subjectId: form.subjectId,
      subjectName: subj?.name || "",
      title: form.title,
      description: form.description,
      passage: form.passage,
      durationMinutes: Number(form.durationMinutes),
      releaseMode: form.releaseMode,
      scheduledAt: form.releaseMode === "scheduled" ? form.scheduledAt : "",
      timetableEntryId: (form.releaseMode === "class_start" || form.releaseMode === "15min_into_class") ? form.timetableEntryId : "",
      timetableDay: ttEntry?.dayOfWeek || "",
      timetableStartTime: ttEntry?.startTime || "",
      questions: form.questions,
      isArchived: false,
    };

    if (editingQuiz) {
      await base44.entities.Quiz.update(editingQuiz.id, payload);
      toast.success("Quiz updated");
    } else {
      await base44.entities.Quiz.create({ ...payload, isPublished: false });
      toast.success("Quiz created");
    }

    setSaving(false);
    setShowDialog(false);
    loadData();
  }

  async function togglePublish(quiz) {
    await base44.entities.Quiz.update(quiz.id, { isPublished: !quiz.isPublished });
    toast.success(quiz.isPublished ? "Quiz unpublished" : "Quiz published — students can now see it");
    loadData();
  }

  async function handleDelete(quiz) {
    if (!window.confirm("Delete this quiz?")) return;
    await base44.entities.Quiz.update(quiz.id, { isArchived: true });
    toast.success("Quiz deleted");
    loadData();
  }

  const timetableForClass = timetable.filter(t => t.classId === form.classId);

  const releaseBadge = (quiz) => {
    if (quiz.isPublished) return <Badge className="bg-emerald-100 text-emerald-700">Live</Badge>;
    if (quiz.releaseMode === "manual") return <Badge variant="secondary">Draft</Badge>;
    if (quiz.releaseMode === "scheduled") return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
    if (quiz.releaseMode === "class_start") return <Badge className="bg-amber-100 text-amber-700">At Class Start</Badge>;
    if (quiz.releaseMode === "15min_into_class") return <Badge className="bg-orange-100 text-orange-700">15min Into Class</Badge>;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and schedule quizzes for your classes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}><Upload className="w-4 h-4 mr-2" /> Bulk Import</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Quiz</Button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No quizzes yet. Create your first quiz!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight">{quiz.title}</h3>
                  {releaseBadge(quiz)}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{quiz.className} • {quiz.subjectName}</p>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{quiz.durationMinutes} min
                  <span className="mx-1">•</span>
                  <ClipboardList className="w-3 h-3" />{(quiz.questions || []).length} questions
                </p>
                {quiz.releaseMode === "scheduled" && quiz.scheduledAt && (
                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />Releases {new Date(quiz.scheduledAt).toLocaleString()}
                  </p>
                )}
                {(quiz.releaseMode === "class_start" || quiz.releaseMode === "15min_into_class") && quiz.timetableDay && (
                  <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    {quiz.releaseMode === "class_start" ? "At class start" : "15min into class"} on {quiz.timetableDay} at {quiz.timetableStartTime}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(quiz)}>
                    <Edit2 className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant={quiz.isPublished ? "outline" : "default"} className="flex-1" onClick={() => togglePublish(quiz)}>
                    {quiz.isPublished ? <><EyeOff className="w-3 h-3 mr-1" />Unpublish</> : <><Eye className="w-3 h-3 mr-1" />Publish</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(quiz)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Import Dialog */}
      <QuizBulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} onImport={handleBulkImportComplete} />

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="questions">Questions ({form.questions.length})</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="e.g. Chapter 3 Quiz" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Instructions for students..." rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Classes * (select one or more)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                      <input 
                        type="checkbox" 
                        checked={form.classIds.includes(c.id)} 
                        onChange={e => {
                          if (e.target.checked) {
                            setForm({ ...form, classIds: [...form.classIds, c.id], classId: form.classIds[0] || c.id });
                          } else {
                            const newIds = form.classIds.filter(id => id !== c.id);
                            setForm({ ...form, classIds: newIds, classId: newIds[0] || "" });
                          }
                        }} 
                      />
                      <span className="text-sm">{c.className}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={5} max={180} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reading Passage (optional - for language subjects)</Label>
                <textarea 
                  className="w-full border rounded px-3 py-2 text-sm font-mono min-h-24"
                  placeholder="Paste the reading passage here for comprehension questions..."
                  value={form.passage}
                  onChange={e => setForm({ ...form, passage: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions">
              <QuizQuestionEditor questions={form.questions} onChange={q => setForm({ ...form, questions: q })} />
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="space-y-2">
                <Label>Release Mode</Label>
                <Select value={form.releaseMode} onValueChange={v => setForm({ ...form, releaseMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELEASE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.releaseMode === "scheduled" && (
                <div className="space-y-2">
                  <Label>Release Date & Time</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
              )}

              {(form.releaseMode === "class_start" || form.releaseMode === "15min_into_class") && (
                <div className="space-y-2">
                  <Label>Select Timetable Slot</Label>
                  {timetableForClass.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timetable entries found for the selected class. Select a class first.</p>
                  ) : (
                    <Select value={form.timetableEntryId} onValueChange={v => setForm({ ...form, timetableEntryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick a class period" /></SelectTrigger>
                      <SelectContent>
                        {timetableForClass.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.dayOfWeek} — {t.startTime}–{t.endTime} ({t.subjectName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {form.releaseMode === "class_start"
                      ? "The quiz will become available at the class start time."
                      : "The quiz will become available 15 minutes after the class starts."}
                  </p>
                </div>
              )}

              <div className="p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground">
                <strong>Note:</strong> For class-timed releases, the quiz automatically becomes visible to students at the calculated time. You can also manually publish/unpublish at any point.
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingQuiz ? "Save Changes" : "Create Quiz"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}