import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2 } from 'lucide-react';

export default function TeacherGrades() {
  const user = getCurrentUser();
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentId: "", subjectId: "", assessmentType: "exam", score: "", maxScore: "100", comment: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [g, s, subj] = await Promise.all([
        base44.entities.Grade.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student", isArchived: false }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setGrades(g || []);
      setStudents(s || []);
      setSubjects(subj || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const student = students.find(s => s.id === form.studentId);
      const subject = subjects.find(s => s.id === form.subjectId);
      await base44.entities.Grade.create({
        schoolId: user.schoolId,
        studentId: form.studentId,
        studentName: student?.fullName || "",
        classId: student?.classId || "",
        subjectId: form.subjectId,
        subjectName: subject?.name || "",
        teacherId: user.id,
        assessmentType: form.assessmentType,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        comment: form.comment,
      });
      setForm({ studentId: "", subjectId: "", assessmentType: "exam", score: "", maxScore: "100", comment: "" });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Grades</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Grade</Button>
      </div>
      {grades.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No grades recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.map(g => (
                <TableRow key={g.id}>
                  <TableCell>{g.studentName}</TableCell>
                  <TableCell>{g.subjectName}</TableCell>
                  <TableCell className="capitalize">{g.assessmentType}</TableCell>
                  <TableCell>{g.score}/{g.maxScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Grade</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Student *</Label>
              <Select value={form.studentId} onValueChange={v => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Assessment Type</Label>
              <Select value={form.assessmentType} onValueChange={v => setForm({ ...form, assessmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Exam</SelectItem><SelectItem value="test">Test</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem><SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="classwork">Classwork</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Score *</Label><Input type="number" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Max Score</Label><Input type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Comment</Label><Input value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save Grade</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}