import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Loader2, Pencil, Trash2, Search, BookOpen, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import TermAverages from '@/components/teacher/TermAverages';

const ASSESSMENT_TYPES = ["exam", "test", "quiz", "assignment", "classwork"];
const TERMS = ["First Term", "Second Term", "Third Term"];

const TYPE_COLORS = {
  exam: "bg-red-100 text-red-700",
  test: "bg-orange-100 text-orange-700",
  quiz: "bg-blue-100 text-blue-700",
  assignment: "bg-purple-100 text-purple-700",
  classwork: "bg-emerald-100 text-emerald-700",
};

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

function gradeLabel(p) {
  if (p >= 70) return { label: "A", color: "text-emerald-600" };
  if (p >= 60) return { label: "B", color: "text-blue-600" };
  if (p >= 50) return { label: "C", color: "text-amber-600" };
  if (p >= 40) return { label: "D", color: "text-orange-600" };
  return { label: "F", color: "text-red-600" };
}

const EMPTY_FORM = {
  classId: "", studentId: "", subjectId: "",
  assessmentType: "exam", score: "", maxScore: "100",
  term: "First Term", comment: "",
};

export default function TeacherGrades() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Filters
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const assignedClassIds = [...new Set(
      (user?.teachingAssignments || []).map(a => a.classId).filter(Boolean)
    )];
    const assignedSubjectIds = [...new Set(
      (user?.teachingAssignments || []).map(a => a.subjectId).filter(Boolean)
    )];

    const [g, cls, studs, subjs] = await Promise.all([
      base44.entities.Grade.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student", isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
    ]);

    setGrades(g || []);

    // Limit to assigned classes/subjects if teacher has assignments
    const filteredCls = assignedClassIds.length
      ? (cls || []).filter(c => assignedClassIds.includes(c.id))
      : (cls || []);
    const filteredSubjs = assignedSubjectIds.length
      ? (subjs || []).filter(s => assignedSubjectIds.includes(s.id))
      : (subjs || []);

    setClasses(filteredCls);
    setAllStudents(studs || []);
    setAllSubjects(filteredSubjs);
    setLoading(false);
  }

  // Students in selected class
  const studentsInClass = form.classId
    ? allStudents.filter(s => s.classId === form.classId)
    : allStudents;

  // Subjects for selected class
  const subjectsForClass = form.classId
    ? allSubjects.filter(s => (s.applicableClasses || []).includes(form.classId))
    : allSubjects;

  function openCreate() {
    setEditingGrade(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(grade) {
    setEditingGrade(grade);
    setForm({
      classId: grade.classId || "",
      studentId: grade.studentId || "",
      subjectId: grade.subjectId || "",
      assessmentType: grade.assessmentType || "exam",
      score: String(grade.score ?? ""),
      maxScore: String(grade.maxScore ?? "100"),
      term: grade.term || "First Term",
      comment: grade.comment || "",
    });
    setShowDialog(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId || !form.subjectId || form.score === "") return toast.error("Student, subject and score are required");
    const scoreNum = Number(form.score);
    const maxNum = Number(form.maxScore || 100);
    if (scoreNum > maxNum) return toast.error("Score cannot exceed max score");

    setSaving(true);
    const student = allStudents.find(s => s.id === form.studentId);
    const subject = allSubjects.find(s => s.id === form.subjectId);

    const payload = {
      schoolId: user.schoolId,
      studentId: form.studentId,
      studentName: student?.fullName || "",
      classId: student?.classId || form.classId || "",
      subjectId: form.subjectId,
      subjectName: subject?.name || "",
      teacherId: user.id,
      assessmentType: form.assessmentType,
      score: scoreNum,
      maxScore: maxNum,
      term: form.term,
      comment: form.comment,
    };

    // Optimistic update — apply immediately, rollback on error
    const prevGrades = [...grades];
    if (editingGrade) {
      setGrades(prev => prev.map(g => g.id === editingGrade.id ? { ...g, ...payload } : g));
    } else {
      const tempId = `temp-${Date.now()}`;
      setGrades(prev => [...prev, { ...payload, id: tempId }]);
    }
    setShowDialog(false);

    try {
      if (editingGrade) {
        await base44.entities.Grade.update(editingGrade.id, payload);
        toast.success("Grade updated");
      } else {
        await base44.entities.Grade.create(payload);
        toast.success("Grade saved");
      }
      loadData(); // sync with server
    } catch {
      setGrades(prevGrades); // rollback
      toast.error("Failed to save grade. Please try again.");
      setShowDialog(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(grade) {
    if (!window.confirm(`Delete grade for ${grade.studentName}?`)) return;
    // Optimistic delete
    const prevGrades = [...grades];
    setGrades(prev => prev.filter(g => g.id !== grade.id));
    try {
      await base44.entities.Grade.delete(grade.id);
      toast.success("Grade deleted");
    } catch {
      setGrades(prevGrades);
      toast.error("Failed to delete grade.");
    }
  }

  // Filtered view
  const filtered = grades.filter(g => {
    if (filterClass !== "all" && g.classId !== filterClass) return false;
    if (filterSubject !== "all" && g.subjectId !== filterSubject) return false;
    if (filterTerm !== "all" && g.term !== filterTerm) return false;
    if (filterType !== "all" && g.assessmentType !== filterType) return false;
    if (search && !g.studentName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Summary stats
  const avgScore = filtered.length
    ? Math.round(filtered.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / filtered.length)
    : null;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grades & Scores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record and manage student performance</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Grade</Button>
      </div>

      <Tabs defaultValue="records">
        <TabsList className="mb-5">
          <TabsTrigger value="records">All Records</TabsTrigger>
          <TabsTrigger value="averages">Term Averages</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold mt-1">{grades.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold mt-1">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold mt-0.5">{avgScore !== null ? `${avgScore}%` : "—"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No grades recorded yet. Click "Add Grade" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(g => {
                    const p = pct(g.score, g.maxScore);
                    const { label, color } = gradeLabel(p);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.studentName}</TableCell>
                        <TableCell>{g.subjectName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.term || "—"}</TableCell>
                        <TableCell>
                          <Badge className={`${TYPE_COLORS[g.assessmentType] || ""} border-0 capitalize`}>{g.assessmentType}</Badge>
                        </TableCell>
                        <TableCell>{g.score}/{g.maxScore}</TableCell>
                        <TableCell>{p}%</TableCell>
                        <TableCell><span className={`font-bold ${color}`}>{label}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{g.comment || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-muted rounded-md">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(g)} className="p-1.5 hover:bg-destructive/10 rounded-md">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="averages">
          <TermAverages grades={grades} classes={classes} subjects={allSubjects} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGrade ? "Edit Grade" : "Add Grade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v, studentId: "", subjectId: "" })}>
                <SelectTrigger><SelectValue placeholder="Filter by class (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— All Classes —</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={form.studentId} onValueChange={v => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {studentsInClass.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsForClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment Type</Label>
                <Select value={form.assessmentType} onValueChange={v => setForm({ ...form, assessmentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
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

            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(pct(Number(form.score), Number(form.maxScore)), 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{pct(Number(form.score), Number(form.maxScore))}%</span>
                <span className={`text-sm font-bold ${gradeLabel(pct(Number(form.score), Number(form.maxScore))).color}`}>
                  {gradeLabel(pct(Number(form.score), Number(form.maxScore))).label}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Comment</Label>
              <Input placeholder="Optional feedback..." value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingGrade ? "Update Grade" : "Save Grade"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}