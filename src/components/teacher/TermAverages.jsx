import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Award, Info } from 'lucide-react';
import { calculateWeightedScore } from '@/lib/gradeWeightCalculator';

function gradeLabel(p) {
  if (p >= 70) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (p >= 60) return { label: "B", color: "text-blue-600", bg: "bg-blue-50" };
  if (p >= 50) return { label: "C", color: "text-amber-600", bg: "bg-amber-50" };
  if (p >= 40) return { label: "D", color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "F", color: "text-red-600", bg: "bg-red-50" };
}

export default function TermAverages({ grades, classes, subjects }) {
  const { schoolUser: user } = useSchoolAuth();
  const [filterClass, setFilterClass] = useState("all");
  const [categories, setCategories] = useState([]);

  const availableTerms = useMemo(() => {
    const seen = new Set();
    grades.forEach(g => { if (g.term) seen.add(g.term); });
    return [...seen].sort();
  }, [grades]);

  const [filterTerm, setFilterTerm] = useState("");
  const effectiveTerm = filterTerm || availableTerms[0] || "";

  useEffect(() => {
    if (user?.schoolId) {
      base44.entities.GradeCategory.filter({ schoolId: user.schoolId }).then(c => setCategories(c || []));
    }
  }, [user?.schoolId]);

  const averages = useMemo(() => {
    if (!effectiveTerm) return [];
    const termGrades = grades.filter(g => {
      if (g.term !== effectiveTerm) return false;
      if (filterClass !== "all" && g.classId !== filterClass) return false;
      return true;
    });

    // Unique students in this term/class
    const studentMap = {};
    termGrades.forEach(g => {
      if (!studentMap[g.studentId]) studentMap[g.studentId] = { studentName: g.studentName, classId: g.classId };
    });

    // Unique subjects in this term/class
    const subjectIds = [...new Set(termGrades.map(g => g.subjectId))];

    return Object.entries(studentMap).map(([studentId, sData]) => {
      const subjectAverages = subjectIds.map(subjectId => {
        const subjectName = termGrades.find(g => g.subjectId === subjectId)?.subjectName || subjectId;
        // Try to find class-specific categories
        const classCats = categories.filter(c => c.subjectId === subjectId && c.classId === sData.classId);
        const result = calculateWeightedScore(termGrades, classCats, studentId, subjectId, effectiveTerm);
        return { subjectId, subjectName, avg: result.overall, hasWeights: result.hasWeights, breakdown: result.breakdown };
      }).filter(s => {
        // Only include subjects where this student has at least one grade
        return termGrades.some(g => g.studentId === studentId && g.subjectId === s.subjectId);
      });

      const overallAvg = subjectAverages.length
        ? Math.round(subjectAverages.reduce((sum, s) => sum + s.avg, 0) / subjectAverages.length * 100) / 100
        : 0;

      return { studentId, studentName: sData.studentName, classId: sData.classId, subjectAverages, overallAvg };
    }).sort((a, b) => b.overallAvg - a.overallAvg);
  }, [grades, filterClass, effectiveTerm, categories]);

  const activeSubjects = useMemo(() => {
    const ids = new Set();
    averages.forEach(r => r.subjectAverages.forEach(s => ids.add(s.subjectId)));
    return [...ids].map(id => {
      const found = averages.flatMap(a => a.subjectAverages).find(s => s.subjectId === id);
      return { id, name: found?.subjectName || id };
    });
  }, [averages]);

  const classSubjectAverages = useMemo(() => {
    const result = {};
    for (const subj of activeSubjects) {
      const vals = averages.map(a => a.subjectAverages.find(s => s.subjectId === subj.id)?.avg).filter(v => v !== undefined);
      result[subj.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null;
    }
    return result;
  }, [averages, activeSubjects]);

  const isWeighted = averages.some(a => a.subjectAverages.some(s => s.hasWeights));

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Select value={effectiveTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Select term" /></SelectTrigger>
          <SelectContent>
            {availableTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        {isWeighted && (
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <Info className="w-3.5 h-3.5" /> Weighted grades active
          </span>
        )}
      </div>

      {averages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{availableTerms.length === 0 ? "No grades have been recorded yet." : `No grades recorded for ${effectiveTerm} yet.`}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Students</p><p className="text-2xl font-bold mt-1">{averages.length}</p></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Subjects</p><p className="text-2xl font-bold mt-1">{activeSubjects.length}</p></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Class Average</p><p className="text-2xl font-bold mt-1">{averages.length ? `${Math.round(averages.reduce((s, a) => s + a.overallAvg, 0) / averages.length)}%` : "—"}</p></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /><div><p className="text-xs text-muted-foreground">Top Student</p><p className="text-sm font-bold mt-0.5 truncate">{averages[0]?.studentName || "—"}</p></div></CardContent></Card>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">#</TableHead>
                  <TableHead className="sticky left-8 bg-background z-10 min-w-[140px]">Student</TableHead>
                  {activeSubjects.map(s => (
                    <TableHead key={s.id} className="text-center min-w-[90px] text-xs">{s.name}</TableHead>
                  ))}
                  <TableHead className="text-center font-bold min-w-[80px]">Overall</TableHead>
                  <TableHead className="text-center min-w-[60px]">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {averages.map((row, idx) => {
                  const { label, color } = gradeLabel(row.overallAvg);
                  return (
                    <TableRow key={row.studentId}>
                      <TableCell className="sticky left-0 bg-background text-muted-foreground text-sm">{idx + 1}</TableCell>
                      <TableCell className="sticky left-8 bg-background font-medium">{row.studentName}</TableCell>
                      {activeSubjects.map(s => {
                        const sub = row.subjectAverages.find(x => x.subjectId === s.id);
                        if (!sub) return <TableCell key={s.id} className="text-center text-muted-foreground">—</TableCell>;
                        const { label: sl, color: sc } = gradeLabel(sub.avg);
                        return (
                          <TableCell key={s.id} className="text-center">
                            <div className={`font-semibold text-sm ${sc}`}>{sub.avg}%</div>
                            {sub.hasWeights && <div className="text-xs text-muted-foreground">weighted</div>}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold text-sm">{row.overallAvg}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-base ${color}`}>{label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="sticky left-0 bg-muted/40"></TableCell>
                  <TableCell className="sticky left-8 bg-muted/40 text-xs text-muted-foreground">Class Avg</TableCell>
                  {activeSubjects.map(s => (
                    <TableCell key={s.id} className="text-center text-sm">
                      {classSubjectAverages[s.id] !== null ? `${classSubjectAverages[s.id]}%` : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center text-sm font-bold">
                    {averages.length ? `${Math.round(averages.reduce((s, a) => s + a.overallAvg, 0) / averages.length)}%` : "—"}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isWeighted ? 'Scores use configured assessment weights (e.g. Exam 60%, Quiz 20%, Assignment 20%).' : 'Scores are simple averages. Configure Grade Weighting to enable weighted calculation.'}
          </p>
        </>
      )}
    </div>
  );
}