import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Award, BookOpen } from 'lucide-react';

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
  if (p >= 70) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (p >= 60) return { label: "B", color: "text-blue-600", bg: "bg-blue-50" };
  if (p >= 50) return { label: "C", color: "text-amber-600", bg: "bg-amber-50" };
  if (p >= 40) return { label: "D", color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "F", color: "text-red-600", bg: "bg-red-50" };
}

export default function StudentGradeHistory({ studentId, schoolId }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  useEffect(() => {
    if (!studentId || !schoolId) { setLoading(false); return; }
    base44.entities.Grade.filter({ schoolId, studentId }).then(g => {
      setGrades(g || []);
      setLoading(false);
    });
  }, [studentId, schoolId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

  if (grades.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
      <p className="text-sm">No grades recorded for this student yet.</p>
    </div>
  );

  // Filter
  const filtered = grades.filter(g => {
    if (filterTerm !== "all" && g.term !== filterTerm) return false;
    if (filterSubject !== "all" && g.subjectId !== filterSubject) return false;
    return true;
  });

  // Unique subjects for filter
  const subjects = [...new Map(grades.map(g => [g.subjectId, { id: g.subjectId, name: g.subjectName }])).values()];

  // Overall average
  const overall = filtered.length
    ? Math.round(filtered.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / filtered.length)
    : null;

  // Per-subject summary
  const bySubject = subjects
    .filter(s => filterSubject === "all" || s.id === filterSubject)
    .map(s => {
      const sg = filtered.filter(g => g.subjectId === s.id);
      const avg = sg.length ? Math.round(sg.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / sg.length) : null;
      return { ...s, grades: sg, avg };
    })
    .filter(s => s.grades.length > 0);

  const { label: ovLabel, color: ovColor } = overall !== null ? gradeLabel(overall) : { label: "—", color: "text-muted-foreground" };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[120px] bg-secondary/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Records</p>
          <p className="text-xl font-bold mt-0.5">{filtered.length}</p>
        </div>
        <div className="flex-1 min-w-[120px] bg-secondary/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Subjects</p>
          <p className="text-xl font-bold mt-0.5">{bySubject.length}</p>
        </div>
        <div className="flex-1 min-w-[120px] bg-secondary/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-xl font-bold mt-0.5 ${ovColor}`}>
            {overall !== null ? `${overall}%` : "—"}
          </p>
        </div>
        <div className="flex-1 min-w-[120px] bg-secondary/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Grade</p>
          <p className={`text-xl font-bold mt-0.5 ${ovColor}`}>{ovLabel}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Subject breakdown */}
      <div className="space-y-4">
        {bySubject.map(s => {
          const { label: sLabel, color: sColor, bg: sBg } = s.avg !== null ? gradeLabel(s.avg) : { label: "—", color: "text-muted-foreground", bg: "" };
          return (
            <div key={s.id} className="border rounded-xl overflow-hidden">
              {/* Subject header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="text-xs text-muted-foreground">({s.grades.length} record{s.grades.length !== 1 ? "s" : ""})</span>
                </div>
                {s.avg !== null && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sBg} ${sColor}`}>
                    <TrendingUp className="w-3 h-3" />
                    {s.avg}% · {sLabel}
                  </div>
                )}
              </div>
              {/* Grade rows */}
              <div className="divide-y">
                {s.grades.map(g => {
                  const p = pct(g.score, g.maxScore);
                  const { label, color } = gradeLabel(p);
                  return (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors">
                      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{g.term || "—"}</span>
                      <Badge className={`${TYPE_COLORS[g.assessmentType] || ""} border-0 capitalize text-[11px] flex-shrink-0`}>
                        {g.assessmentType}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {/* Score bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(p, 100)}%` }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{g.score}/{g.maxScore}</span>
                          <span className="text-xs font-mono">{p}%</span>
                          <span className={`text-xs font-bold w-5 ${color}`}>{label}</span>
                        </div>
                      </div>
                      {g.comment && (
                        <span className="text-xs text-muted-foreground italic hidden sm:block max-w-[120px] truncate">{g.comment}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No grades match the selected filters.</p>
      )}
    </div>
  );
}