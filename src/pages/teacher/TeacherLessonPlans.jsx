import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, BookOpen, Target, Activity, Package, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, FileText, X, Upload, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const EMPTY_PLAN = {
  title: "", date: "", classIds: [], subjectId: "",
  objectives: [""], activities: [{ title: "", description: "", durationMinutes: "" }],
  resources: [""], homework: "", notes: "", isPublished: false, pdfFileUrl: "",
};

export default function TeacherLessonPlans() {
  const { schoolUser: user } = useSchoolAuth();
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterClassId, setFilterClassId] = useState("all");
  const [form, setForm] = useState(EMPTY_PLAN);
  const [pdfUploading, setPdfUploading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [p, c, s] = await Promise.all([
      base44.entities.LessonPlan.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
    ]);
    setPlans((p || []).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    // Restrict to teacher's assigned classes/subjects
    const ta = user?.teachingAssignments || [];
    const assignedClassIds = ta.length ? [...new Set(ta.map(t => t.classId))] : null;
    const assignedSubjectIds = ta.length ? [...new Set(ta.map(t => t.subjectId))] : null;
    setClasses(assignedClassIds ? (c || []).filter(cl => assignedClassIds.includes(cl.id)) : (c || []));
    setSubjects(assignedSubjectIds ? (s || []).filter(sub => assignedSubjectIds.includes(sub.id)) : (s || []));
    setLoading(false);
  }

  function openCreate() {
    setEditingPlan(null);
    setForm(EMPTY_PLAN);
    setShowDialog(true);
  }

  function openEdit(plan) {
    setEditingPlan(plan);
    setForm({
      title: plan.title || "",
      date: plan.date || "",
      classIds: plan.classIds?.length ? plan.classIds : (plan.classId ? [plan.classId] : []),
      subjectId: plan.subjectId || "",
      objectives: plan.objectives?.length ? plan.objectives : [""],
      activities: plan.activities?.length ? plan.activities : [{ title: "", description: "", durationMinutes: "" }],
      resources: plan.resources?.length ? plan.resources : [""],
      homework: plan.homework || "",
      notes: plan.notes || "",
      isPublished: plan.isPublished || false,
      pdfFileUrl: plan.pdfFileUrl || "",
    });
    setShowDialog(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title || !form.date || !form.classIds.length || !form.subjectId) {
      return toast.error("Title, date, at least one class, and subject are required");
    }
    if (!user?.schoolId || !user?.id) {
      return toast.error("Session error — please log out and log back in.");
    }
    setSaving(true);

    // Safety timeout — never leave button stuck
    const timeout = setTimeout(() => {
      setSaving(false);
      toast.error("Submission timed out. Please try again.");
    }, 30000);

    try {
      const selectedClasses = classes.filter(c => form.classIds.includes(c.id));
      const subj = subjects.find(s => s.id === form.subjectId);
      const primaryClass = selectedClasses[0];
      const payload = {
        schoolId: user.schoolId, teacherId: user.id, teacherName: user.fullName,
        classId: primaryClass?.id || "", className: primaryClass?.className || "",
        classIds: form.classIds, classNames: selectedClasses.map(c => c.className),
        subjectId: form.subjectId, subjectName: subj?.name || "",
        title: form.title, date: form.date,
        objectives: form.objectives.filter(o => o.trim()),
        activities: form.activities.filter(a => a.title.trim()),
        resources: form.resources.filter(r => r.trim()),
        homework: form.homework, notes: form.notes,
        pdfFileUrl: form.pdfFileUrl || "",
      };
      if (editingPlan) {
        await base44.entities.LessonPlan.update(editingPlan.id, {
          ...payload,
          status: "pending",
          isPublished: false,
          approvedBy: "", approvalDate: "", approvalNotes: "",
        });
        toast.success("Plan updated — resubmitted for approval");
      } else {
        await base44.entities.LessonPlan.create({ ...payload, status: "pending", isPublished: false });
        toast.success("Lesson plan submitted for approval successfully");
      }
      setShowDialog(false);
      loadData();
    } catch (err) {
      toast.error("Failed to save lesson plan: " + (err?.message || "Unknown error"));
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  }

  async function handleSubmitForApproval(plan) {
    await base44.entities.LessonPlan.update(plan.id, { status: "pending", isPublished: false, approvedBy: "", approvalDate: "", approvalNotes: "" });
    toast.success("Resubmitted for admin approval");
    loadData();
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error("Please select a PDF file");
    setPdfUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, pdfFileUrl: file_url }));
    setPdfUploading(false);
    toast.success("PDF uploaded");
  }

  function toggleClass(classId) {
    setForm(f => {
      const has = f.classIds.includes(classId);
      const newIds = has ? f.classIds.filter(id => id !== classId) : [...f.classIds, classId];
      return { ...f, classIds: newIds, subjectId: "" };
    });
  }

  async function handleDelete(plan) {
    if (!window.confirm("Delete this lesson plan?")) return;
    await base44.entities.LessonPlan.delete(plan.id);
    toast.success("Deleted");
    loadData();
  }

  async function togglePublish(plan) {
    if (!plan.isPublished && plan.status !== "approved") {
      return toast.error("This plan must be approved by an admin before publishing");
    }
    await base44.entities.LessonPlan.update(plan.id, { isPublished: !plan.isPublished });
    toast.success(plan.isPublished ? "Hidden from students" : "Published to students");
    loadData();
  }

  // Dynamic list helpers
  const addObjective = () => setForm(f => ({ ...f, objectives: [...f.objectives, ""] }));
  const removeObjective = (i) => setForm(f => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }));
  const setObjective = (i, v) => setForm(f => ({ ...f, objectives: f.objectives.map((o, j) => j === i ? v : o) }));

  const addActivity = () => setForm(f => ({ ...f, activities: [...f.activities, { title: "", description: "", durationMinutes: "" }] }));
  const removeActivity = (i) => setForm(f => ({ ...f, activities: f.activities.filter((_, j) => j !== i) }));
  const setActivity = (i, field, v) => setForm(f => ({ ...f, activities: f.activities.map((a, j) => j === i ? { ...a, [field]: v } : a) }));

  const addResource = () => setForm(f => ({ ...f, resources: [...f.resources, ""] }));
  const removeResource = (i) => setForm(f => ({ ...f, resources: f.resources.filter((_, j) => j !== i) }));
  const setResource = (i, v) => setForm(f => ({ ...f, resources: f.resources.map((r, j) => j === i ? v : r) }));

  const subjectsForClass = form.classIds.length
    ? subjects.filter(s => form.classIds.some(cid => (s.applicableClasses || []).includes(cid)))
    : subjects;

  const filteredPlans = filterClassId === "all" ? plans : plans.filter(p =>
    p.classId === filterClassId || (p.classIds || []).includes(filterClassId)
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lesson Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan daily objectives, activities and resources for each class</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Plan</Button>
      </div>

      {/* Filter */}
      <div className="mb-4 max-w-xs">
        <Select value={filterClassId} onValueChange={setFilterClassId}>
          <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredPlans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No lesson plans yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map(plan => {
            const isExpanded = expandedId === plan.id;
            const totalMins = (plan.activities || []).reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0);
            return (
              <Card key={plan.id} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{plan.title}</p>
                        {plan.isPublished ? (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700">Published</Badge>
                        ) : plan.status === "approved" ? (
                          <Badge className="text-xs bg-blue-100 text-blue-700"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
                        ) : plan.status === "rejected" ? (
                          <Badge className="text-xs bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
                        ) : (
                          <Badge className="text-xs bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {plan.subjectName} · {(plan.classNames?.length ? plan.classNames : [plan.className]).join(', ')} · {plan.date ? format(new Date(plan.date), 'EEE, MMM d yyyy') : ''}
                        {totalMins > 0 && <span className="ml-2">· {totalMins} min</span>}
                        {plan.pdfFileUrl && <span className="ml-2 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {plan.status === "approved" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); togglePublish(plan); }}
                          title={plan.isPublished ? "Hide from students" : "Publish to students"}>
                          {plan.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                      {plan.status === "rejected" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600" title="Resubmit for approval" onClick={e => { e.stopPropagation(); handleSubmitForApproval(plan); }}>
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(plan); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(plan); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-4">
                      {plan.objectives?.filter(o => o).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Objectives</p>
                          <ul className="space-y-1">
                            {plan.objectives.filter(o => o).map((o, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {plan.activities?.filter(a => a.title).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Activities</p>
                          <div className="space-y-2">
                            {plan.activities.filter(a => a.title).map((a, i) => (
                              <div key={i} className="flex gap-3 p-3 bg-secondary/40 rounded-lg">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{a.title}</span>
                                    {a.durationMinutes && <span className="text-xs text-muted-foreground">{a.durationMinutes} min</span>}
                                  </div>
                                  {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {plan.resources?.filter(r => r).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Resources</p>
                          <div className="flex flex-wrap gap-2">
                            {plan.resources.filter(r => r).map((r, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 bg-secondary rounded-full">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {plan.homework && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <p className="text-xs font-semibold text-amber-700 mb-1">Homework / Follow-up</p>
                          <p className="text-sm">{plan.homework}</p>
                        </div>
                      )}
                      {plan.pdfFileUrl && (
                        <a href={plan.pdfFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline p-2 bg-primary/5 rounded-lg">
                          <FileText className="w-4 h-4" /> View attached PDF
                        </a>
                      )}
                      {plan.status === "rejected" && plan.approvalNotes && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Admin Feedback</p>
                          <p className="text-sm text-red-800">{plan.approvalNotes}</p>
                        </div>
                      )}
                      {plan.status === "approved" && plan.approvalNotes && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Admin Notes</p>
                          <p className="text-sm text-blue-800">{plan.approvalNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Lesson Plan" : "New Lesson Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Title *</Label><Input placeholder="e.g. Introduction to Photosynthesis" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Class * <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/40 px-2 py-1 rounded">
                      <Checkbox
                        checked={form.classIds.includes(c.id)}
                        onCheckedChange={() => toggleClass(c.id)}
                      />
                      <span className="text-sm">{c.className}</span>
                    </label>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes assigned</p>}
                </div>
                {form.classIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.classIds.map(cid => {
                      const cl = classes.find(c => c.id === cid);
                      return cl ? (
                        <span key={cid} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {cl.className}
                          <button type="button" onClick={() => toggleClass(cid)}><X className="w-3 h-3" /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2"><Label>Subject *</Label>
                <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjectsForClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    {subjectsForClass.length === 0 && <SelectItem value="_" disabled>No subjects for selected classes</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Target className="w-4 h-4" /> Learning Objectives</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addObjective} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {form.objectives.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`Objective ${i + 1}`} value={o} onChange={e => setObjective(i, e.target.value)} />
                    {form.objectives.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0 text-muted-foreground" onClick={() => removeObjective(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> Activities</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addActivity} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-3">
                {form.activities.map((a, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-secondary/20">
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2">{i + 1}</div>
                      <Input placeholder="Activity name" value={a.title} onChange={e => setActivity(i, 'title', e.target.value)} className="flex-1" />
                      <Input type="number" placeholder="Min" value={a.durationMinutes} onChange={e => setActivity(i, 'durationMinutes', e.target.value)} className="w-20 flex-shrink-0" />
                      {form.activities.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0 text-muted-foreground" onClick={() => removeActivity(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                    <Textarea placeholder="Description (optional)" value={a.description} onChange={e => setActivity(i, 'description', e.target.value)} rows={2} className="text-sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Required Resources</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addResource} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {form.resources.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`Resource ${i + 1} (e.g. Textbook p.45, Projector, Worksheet)`} value={r} onChange={e => setResource(i, e.target.value)} />
                    {form.resources.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0 text-muted-foreground" onClick={() => removeResource(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Homework */}
            <div className="space-y-2">
              <Label>Homework / Follow-up</Label>
              <Textarea placeholder="Any homework or follow-up tasks for students..." value={form.homework} onChange={e => setForm({ ...form, homework: e.target.value })} rows={2} />
            </div>

            {/* Notes (private) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Private Notes (not visible to students)</Label>
              <Textarea placeholder="Your own notes, reminders, observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            {/* PDF Attachment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Attach PDF (optional)</Label>
              {form.pdfFileUrl ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={form.pdfFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline flex-1 truncate">View attached PDF</a>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setForm(f => ({ ...f, pdfFileUrl: "" }))}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                  {pdfUploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{pdfUploading ? "Uploading..." : "Click to upload a PDF file"}</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={pdfUploading} />
                </label>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              Plans are submitted for admin approval. Once approved, you can publish them to students.
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingPlan ? "Update & Resubmit" : "Submit for Approval"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}