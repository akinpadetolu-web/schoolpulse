import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/common/UserAvatar';

const ASSESSMENT_TYPES = ["exam", "test", "quiz", "assignment", "classwork"];
const TERMS = ["First Term", "Second Term", "Third Term"];

const TYPE_META = {
  exam: { label: "Exams", color: "text-red-600", bg: "bg-red-50", bar: "bg-red-500" },
  test: { label: "Tests", color: "text-orange-600", bg: "bg-orange-50", bar: "bg-orange-500" },
  quiz: { label: "Quizzes", color: "text-blue-600", bg: "bg-blue-50", bar: "bg-blue-500" },
  assignment: { label: "Assignments", color: "text-purple-600", bg: "bg-purple-50", bar: "bg-purple-500" },
  classwork: { label: "Classwork", color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500" },
};

function pct(score, max) { return max ? Math.round((score / max) * 100) : 0; }

const EMPTY_FORM = {
  subjectId: "", assessmentType: "exam",
  score: "", maxScore: "100", term: "First Term", comment: "",
};

export default function TeacherStudentGradeDialog({ open, onOpenChange, student }) {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!student?.id || !user?.schoolId) return;
    setLoading(true);
    const [g, subs] = await Promise.all([
      base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: student.id }),
      base44.entities.Subject.filter({ schoolId: user.schoolId, isArchived: false }),
    ]);
    setGrades(g || []);
    // Filter subjects to those the teacher teaches in this student's class
    const teachingPairs = (user?.teachingAssignments || []).filter(a => a.classId === student.classId);
    const assignedSubjectIds = [...new Set(teachingPairs.map(a => a.subjectId))];
    const relevantSubs = assignedSubjectIds.length > 0
      ? (subs || []).filter(s => assignedSubjectIds.includes(s.id))
      : (subs || []).filter(s => (s.applicableClasses || []).includes(student.classId));
    setSubjects(relevantSubs);
    setLoading(false);
  }, [student?.id, student?.classId, user?.schoolId, user?.id, user?.teachingAssignments]);

  useEffect(() => {
    if (open) {
      load();
      const unsub = base44.entities.Grade.subscribe(() => { if (student?.id) load(); });
      return unsub;
    }
  }, [open, load, student?.id]);

  // Reset form when dialog opens / student changes
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setEditingGrade(null);
      setShowForm(false);
    }
  }, [open, student?.id]);

  const breakdown = useMemo(() => {
    const map = {};
    ASSESSMENT_TYPES.forEach(t => {
      const typeGrades = grades.filter(g => g.assessmentType === t);
      const avg = typeGrades.length > 0
        ? Math.round(typeGrades.reduce((s, g) => s + pct(g.score, g.maxScore), 0) / typeGrades.length)
        : null;
      map[t] = { count: typeGrades.length, avg, grades: typeGrades };
    });
    return map;
  }, [grades]);

  const overallAvg = useMemo(() => {
    if (grades.length === 0) return null;
    return Math.round(grades.reduce((s, g) => s + pct(g.score, g.maxScore), 0) / grades.length);
  }, [grades]);

  function openAdd() {
    setEditingGrade(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(grade) {
    setEditingGrade(grade);
    setForm({
      subjectId: grade.subjectId || "",
      assessmentType: grade.assessmentType || "exam",
      score: String(grade.score ?? ""),
      maxScore: String(grade.maxScore ?? "100"),
      term: grade.term || "First Term",
      comment: grade.comment || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subjectId || form.score === "") return toast.error("Subject and score are required");
    const scoreNum = Number(form.score);
    const maxNum = Number(form.maxScore || 100);
    if (scoreNum > maxNum) return toast.error("Score cannot exceed max score");

    setSaving(true);
    const subject = subjects.find(s => s.id === form.subjectId);
    const payload = {
      schoolId: user.schoolId,
      studentId: student.id,
      studentName: student.fullName,
      classId: student.classId || "",
      className: student.className || "",
      subjectId: form.subjectId,
      subjectName: subject?.name || "",
      teacherId: user.id,
      assessmentType: form.assessmentType,
      score: scoreNum,
      maxScore: maxNum,
      term: form.term,
      comment: form.comment,
    };

    try {
      let gradeId;
      if (editingGrade) {
        await base44.entities.Grade.update(editingGrade.id, payload);
        gradeId = editingGrade.id;
        toast.success("Grade updated");
      } else {
        const result = await base44.entities.Grade.create(payload);
        gradeId = result?.id;
        toast.success("Grade saved");
      }
      if (gradeId) {
        try {
          await base44.functions.invoke('onGradeSubmittedV2', {
            gradeId, schoolId: user.schoolId, studentId: student.id,
            teacherId: user.id, subjectId: form.subjectId, term: form.term,
          });
        } catch (notifError) {
          console.warn('Notification trigger failed (non-critical):', notifError);
        }
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingGrade(null);
      load();
    } catch {
      toast.error("Failed to save grade");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(grade) {
    if (!window.confirm(`Delete this ${grade.assessmentType} grade (${grade.score}/${grade.maxScore})?`)) return;
    try {
      await base44.entities.Grade.delete(grade.id);
      toast.success("Grade deleted");
      load();
    } catch {
      toast.error("Failed to delete grade");
    }
  }

  const sortedGrades = useMemo(() => {
    return [...grades].sort((a, b) => new Date(b.lastUpdatedAt || b.updated_date || 0) - new Date(a.lastUpdatedAt || a.updated_date || 0));
  }, [grades]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar user={student} size="md" />
            <div>
              <DialogTitle className="text-lg">{student?.fullName}</DialogTitle>
              <p className="text-sm text-muted-foreground">{student?.className} · {student?.email}</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Overall summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm bg-secondary/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Grades</p>
                  <p className="text-xl font-bold mt-0.5">{grades.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-secondary/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Subjects</p>
                  <p className="text-xl font-bold mt-0.5">{new Set(grades.map(g => g.subjectId)).size}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-secondary/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Overall Avg</p>
                  <p className="text-xl font-bold mt-0.5">{overallAvg !== null ? `${overallAvg}%` : "—"}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-secondary/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Terms</p>
                  <p className="text-xl font-bold mt-0.5">{new Set(grades.map(g => g.term).filter(Boolean)).size}</p>
                </CardContent>
              </Card>
            </div>

            {/* Assessment type breakdown */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Grade Breakdown by Assessment Type</h3>
              <div className="space-y-2">
                {ASSESSMENT_TYPES.map(type => {
                  const meta = TYPE_META[type];
                  const data = breakdown[type];
                  return (
                    <div key={type} className={`flex items-center gap-3 p-3 rounded-lg ${meta.bg}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                          <Badge variant="outline" className="text-xs">{data.count}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                            <div className={`h-full ${meta.bar} rounded-full transition-all`} style={{ width: `${data.avg ?? 0}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{data.avg !== null ? `${data.avg}%` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Grade button / form */}
            {!showForm ? (
              <Button onClick={openAdd} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Grade
              </Button>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{editingGrade ? "Edit Grade" : "Add Grade"}</h3>
                    <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingGrade(null); setForm(EMPTY_FORM); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {subjects.length === 0 && <p className="text-xs text-amber-600">No subjects assigned to you for this student's class.</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Assessment Type</Label>
                        <Select value={form.assessmentType} onValueChange={v => setForm({ ...form, assessmentType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Term</Label>
                        <Select value={form.term} onValueChange={v => setForm({ ...form, term: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Score *</Label>
                        <Input type="number" min="0" step="0.01" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Score</Label>
                        <Input type="number" min="1" step="0.01" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })} />
                      </div>
                    </div>
                    {form.score !== "" && form.maxScore !== "" && (
                      <div className="flex items-center gap-3 p-2.5 bg-secondary/40 rounded-lg">
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct(Number(form.score), Number(form.maxScore)), 100)}%` }} />
                        </div>
                        <span className="text-sm font-semibold">{pct(Number(form.score), Number(form.maxScore))}%</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Comment</Label>
                      <Input placeholder="Optional feedback..." value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={saving || subjects.length === 0}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {editingGrade ? "Update Grade" : "Save Grade"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Grade list */}
            {sortedGrades.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">All Grades</h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {sortedGrades.map(g => {
                    const p = pct(g.score, g.maxScore);
                    const meta = TYPE_META[g.assessmentType] || TYPE_META.exam;
                    return (
                      <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <Badge className={`${meta.bg} ${meta.color} border-0 capitalize text-xs flex-shrink-0`}>{g.assessmentType}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{g.subjectName}</p>
                          <p className="text-xs text-muted-foreground">{g.term || "—"} · {g.score}/{g.maxScore}</p>
                        </div>
                        <span className="text-sm font-bold">{p}%</span>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-muted rounded-md">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(g)} className="p-1.5 hover:bg-destructive/10 rounded-md">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}