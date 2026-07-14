import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const ASSESSMENT_TYPES = ["exam", "test", "quiz", "assignment", "classwork"];
const TERMS = ["First Term", "Second Term", "Third Term"];

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

function gradeLabel(p) {
  if (p >= 70) return "A";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 40) return "D";
  return "F";
}

export default function BulkGradeEntryDialog({ open, onOpenChange, classes, subjects, students, schoolUser: user }) {
  const [bulkClass, setBulkClass] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkType, setBulkType] = useState("exam");
  const [bulkTerm, setBulkTerm] = useState("First Term");
  const [bulkMax, setBulkMax] = useState("100");
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScores({});
    }
  }, [open]);

  const classStudents = useMemo(() => {
    if (!bulkClass) return [];
    return students.filter(s => s.classId === bulkClass);
  }, [students, bulkClass]);

  const subjectsForClass = useMemo(() => {
    if (!bulkClass) return subjects;
    return subjects.filter(s => (s.applicableClasses || []).includes(bulkClass));
  }, [subjects, bulkClass]);

  const filledCount = useMemo(() => {
    return Object.values(scores).filter(v => v !== "" && v !== null && v !== undefined).length;
  }, [scores]);

  function setScore(studentId, value) {
    setScores(prev => ({ ...prev, [studentId]: value }));
  }

  function fillAll(value) {
    const map = {};
    classStudents.forEach(s => { map[s.id] = String(value); });
    setScores(map);
  }

  async function handleBulkSave() {
    if (!bulkClass || !bulkSubject || !bulkMax) {
      toast.error("Class, subject, and max score are required");
      return;
    }

    const maxNum = Number(bulkMax);
    const records = [];

    for (const student of classStudents) {
      const raw = scores[student.id];
      if (raw === "" || raw === null || raw === undefined) continue;
      const scoreNum = Number(raw);
      if (isNaN(scoreNum)) continue;
      if (scoreNum > maxNum) {
        toast.error(`${student.fullName}: score ${scoreNum} exceeds max ${maxNum}`);
        return;
      }
      records.push({
        schoolId: user.schoolId,
        studentId: student.id,
        studentName: student.fullName,
        classId: student.classId || bulkClass,
        subjectId: bulkSubject,
        subjectName: subjects.find(s => s.id === bulkSubject)?.name || "",
        teacherId: user.id,
        assessmentType: bulkType,
        score: scoreNum,
        maxScore: maxNum,
        term: bulkTerm,
      });
    }

    if (records.length === 0) {
      toast.error("Enter at least one score to save");
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Grade.bulkCreate(records);
      toast.success(`Saved ${records.length} grade${records.length !== 1 ? "s" : ""} for the class`);
      onOpenChange(false);
      setScores({});
    } catch {
      toast.error("Failed to save grades. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Close handler that resets state
  function handleOpenChange(v) {
    if (!v) {
      setScores({});
    }
    onOpenChange(v);
  }

  const maxNum = Number(bulkMax) || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Grade Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={bulkClass} onValueChange={v => { setBulkClass(v); setScores({}); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={bulkSubject} onValueChange={setBulkSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsForClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select value={bulkType} onValueChange={setBulkType}>
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
              <Select value={bulkTerm} onValueChange={setBulkTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Score</Label>
              <Input type="number" min="1" step="0.01" value={bulkMax} onChange={e => setBulkMax(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              {classStudents.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => fillAll(maxNum)} disabled={saving || !maxNum}>
                  Fill All with Max
                </Button>
              )}
              {classStudents.length > 0 && filledCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setScores({})} disabled={saving}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Student list */}
          {!bulkClass ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Select a class to see students</p>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No students found in this class</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {classStudents.length} students · {filledCount} filled
                </p>
                <Badge variant="secondary" className="text-xs">
                  {bulkType} · {bulkTerm}
                </Badge>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_60px_50px] gap-2 px-3 py-2 bg-muted font-medium text-xs">
                  <span>Student</span>
                  <span className="text-right">Score / {bulkMax || "—"}</span>
                  <span className="text-right">%</span>
                  <span className="text-center">Grade</span>
                </div>
                <div className="divide-y">
                  {classStudents.map(student => {
                    const raw = scores[student.id] ?? "";
                    const scoreNum = raw !== "" ? Number(raw) : null;
                    const validScore = scoreNum !== null && !isNaN(scoreNum) && maxNum > 0;
                    const p = validScore ? pct(scoreNum, maxNum) : null;
                    return (
                      <div key={student.id} className="grid grid-cols-[1fr_100px_60px_50px] gap-2 px-3 py-2 items-center hover:bg-muted/40">
                        <span className="text-sm font-medium truncate">{student.fullName}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          max={bulkMax || undefined}
                          value={raw}
                          onChange={e => setScore(student.id, e.target.value)}
                          disabled={saving}
                          className="h-8 text-right text-sm w-full"
                          placeholder="—"
                        />
                        <span className="text-sm text-right text-muted-foreground">
                          {p !== null ? `${p}%` : ""}
                        </span>
                        <span className="text-center text-sm font-bold">
                          {p !== null ? gradeLabel(p) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleBulkSave} disabled={saving || filledCount === 0} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : `Save ${filledCount} Grade${filledCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}