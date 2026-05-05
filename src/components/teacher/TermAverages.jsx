import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Award } from 'lucide-react';

function pct(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

function gradeLabel(p) {
  if (p >= 70) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (p >= 60) return { label: "B", color: "text-blue-600", bg: "bg-blue-50" };
  if (p >= 50) return { label: "C", color: "text-amber-600", bg: "bg-amber-50" };
  if (p >= 40) return { label: "D", color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "F", color: "text-red-600", bg: "bg-red-50" };
}

export default function TermAverages({ grades, classes, subjects }) {
  const [filterClass, setFilterClass] = useState("all");

  // Derive available terms from actual grade data — never rely on hardcoded list
  const availableTerms = useMemo(() => {
    const seen = new Set();
    grades.forEach(g => { if (g.term) seen.add(g.term); });
    return [...seen].sort();
  }, [grades]);

  const [filterTerm, setFilterTerm] = useState("");

  // Auto-select first term when available terms load
  const effectiveTerm = filterTerm || availableTerms[0] || "";

  // Build per-student per-subject averages for selected term & class
  const averages = useMemo(() => {
    if (!effectiveTerm) return [];
    const termGrades = grades.filter(g => {
      if (g.term !== effectiveTerm) return false;
      if (filterClass !== "all" && g.classId !== filterClass) return false;
      return true;
    });

    // Group by studentId -> subjectId -> [grades]
    const map = {};
    for (const g of termGrades) {
      if (!map[g.studentId]) map[g.studentId] = { studentName: g.studentName, classId: g.classId, subjects: {} };
      if (!map[g.studentId].subjects[g.subjectId]) {
        map[g.studentId].subjects[g.subjectId] = { subjectName: g.subjectName, records: [] };
      }
      map[g.studentId].subjects[g.subjectId].records.push(g);
    }

    // Compute averages
    return Object.entries(map).map(([studentId, data]) => {
      const subjectAverages = Object.entries(data.subjects).map(([subjectId, sData]) => {
        const totalPct = sData.records.reduce((sum, r) => sum + pct(r.score, r.maxScore), 0);
        const avg = Math.round(totalPct / sData.records.length);
        return { subjectId, subjectName: sData.subjectName, avg, count: sData.records.length };
      });
      // Overall = average of all individual grade percentages (not average-of-averages)
      const allRecords = Object.values(data.subjects).flatMap(s => s.records);
      const overallAvg = allRecords.length
        ? Math.round(allRecords.reduce((sum, r) => sum + pct(r.score, r.maxScore), 0) / allRecords.length)
        : 0;
      return { studentId, studentName: data.studentName, classId: data.classId, subjectAverages, overallAvg };
    }).sort((a, b) => b.overallAvg - a.overallAvg);
  }, [grades, filterClass, effectiveTerm]);

  // All unique subjects in filtered results — stable memo
  const activeSubjects = useMemo(() => {
    const ids = new Set();
    averages.forEach(r => r.subjectAverages.forEach(s => ids.add(s.subjectId)));
    return [...ids].map(id => {
      const found = averages.flatMap(a => a.subjectAverages).find(s => s.subjectId === id);
      return { id, name: found?.subjectName || id };
    });
  }, [averages]);

  // Class average per subject — only students who have a score for that subject
  const classSubjectAverages = useMemo(() => {
    const result = {};
    for (const subj of activeSubjects) {
      const vals = averages
        .map(a => a.subjectAverages.find(s => s.subjectId === subj.id)?.avg)
        .filter(v => v !== undefined && v !== null);
      result[subj.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    }
    return result;
  }, [averages, activeSubjects]);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
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
      </div>

      {averages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{availableTerms.length === 0 ? "No grades have been recorded yet." : `No grades recorded for ${effectiveTerm} yet.`}</p>
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="text-2xl font-bold mt-1">{averages.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold mt-1">{activeSubjects.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold mt-1">
                  {averages.length
                    ? `${Math.round(averages.reduce((s, a) => s + a.overallAvg, 0) / averages.length)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Student</p>
                  <p className="text-sm font-bold mt-0.5 truncate">{averages[0]?.studentName || "—"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average table */}
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
                            <span className={`font-semibold text-sm ${sc}`}>{sub.avg}%</span>
                            <span className="text-xs text-muted-foreground ml-1">({sub.count})</span>
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
                {/* Class average footer row */}
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
          <p className="text-xs text-muted-foreground mt-2">Numbers in parentheses indicate how many assessments were recorded per subject.</p>
        </>
      )}
    </div>
  );
}