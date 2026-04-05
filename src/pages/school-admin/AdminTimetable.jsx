import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { getSubjectsForClass, autoLinkTeachersToTimetable } from '@/lib/schoolData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, RefreshCw, Wand2, AlertTriangle, CheckCircle2, Link2, Clock, BookOpen, Zap, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700", "bg-teal-100 text-teal-700",
];

// ── Clash Detection ──────────────────────────────────────────────────────────
function timeToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(s1, e1, s2, e2) {
  const a = timeToMin(s1), b = timeToMin(e1);
  const c = timeToMin(s2), d = timeToMin(e2);
  if (a === null || b === null || c === null || d === null) return false;
  return a < d && c < b;
}

/**
 * Detect clashes for a candidate entry against a list of existing entries.
 * Returns array of clash description strings (empty = no clash).
 */
function detectClashes(candidate, existingEntries) {
  const clashes = [];
  const { classId, teacherId, dayOfWeek, startTime, endTime } = candidate;
  if (!dayOfWeek || !startTime || !endTime) return clashes;

  for (const e of existingEntries) {
    if (e.id === candidate.id) continue; // skip self
    if (e.dayOfWeek !== dayOfWeek) continue;
    if (!timesOverlap(startTime, endTime, e.startTime, e.endTime)) continue;

    // Class clash: same class has a different subject at the same time
    if (classId && e.classId === classId) {
      clashes.push(`Class clash: ${e.className || 'Class'} already has "${e.subjectName}" at ${e.startTime}–${e.endTime} on ${dayOfWeek}`);
    }
    // Teacher clash: same teacher is scheduled elsewhere
    if (teacherId && teacherId !== "" && e.teacherId === teacherId) {
      clashes.push(`Teacher clash: ${e.teacherName || 'Teacher'} is already teaching "${e.subjectName}" (${e.className}) at ${e.startTime}–${e.endTime} on ${dayOfWeek}`);
    }
  }
  return clashes;
}

/**
 * Detect clashes within a list itself (for AI preview).
 * Returns map: index -> [clash strings]
 */
function detectInternalClashes(slots, existingEntries = []) {
  const all = [...existingEntries, ...slots.map((s, i) => ({ ...s, _idx: i }))];
  return slots.map((slot, i) => detectClashes(slot, all.filter((_, j) => j !== (existingEntries.length + i))));
}

export default function AdminTimetable() {
  const user = getCurrentUser();
  const schoolId = user?.schoolId;
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualClashes, setManualClashes] = useState([]);

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState([]);
  const [aiClashMap, setAiClashMap] = useState({}); // index -> [clashes]
  const [aiError, setAiError] = useState("");
  const [aiLog, setAiLog] = useState(""); // reasoning from AI

  const [manualForm, setManualForm] = useState({
    classId: "", subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: ""
  });

  useEffect(() => { loadData(); }, []);

  // Live clash check whenever manual form changes
  useEffect(() => {
    if (manualForm.classId && manualForm.dayOfWeek && manualForm.startTime && manualForm.endTime) {
      const cls = classes.find(c => c.id === manualForm.classId);
      const subj = subjects.find(s => s.id === manualForm.subjectId);
      const teacher = teachers.find(t => t.id === manualForm.teacherId);
      const candidate = {
        classId: manualForm.classId, className: cls?.className || "",
        subjectId: manualForm.subjectId, subjectName: subj?.name || "",
        teacherId: manualForm.teacherId || "", teacherName: teacher?.fullName || "",
        dayOfWeek: manualForm.dayOfWeek, startTime: manualForm.startTime, endTime: manualForm.endTime,
      };
      setManualClashes(detectClashes(candidate, entries));
    } else {
      setManualClashes([]);
    }
  }, [manualForm, entries]);

  async function loadData() {
    const [e, c, s, t, cat] = await Promise.all([
      base44.entities.TimetableEntry.filter({ schoolId }),
      base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId, role: "teacher", isArchived: false }),
      base44.entities.SubjectCategory.filter({ schoolId, isArchived: false }),
    ]);
    setEntries(e || []);
    setClasses(c || []);
    setSubjects(s || []);
    setTeachers(t || []);
    setCategories(cat || []);
    setLoading(false);
  }

  const subjectsForManualClass = manualForm.classId
    ? subjects.filter(s => (s.applicableClasses || []).includes(manualForm.classId))
    : subjects;

  async function handleManualCreate(e) {
    e.preventDefault();
    if (!manualForm.classId || !manualForm.subjectId || !manualForm.dayOfWeek) {
      return toast.error("Class, subject and day are required");
    }
    if (manualClashes.length > 0) {
      return toast.error("Please resolve clashes before saving");
    }
    setSaving(true);
    const cls = classes.find(c => c.id === manualForm.classId);
    const subj = subjects.find(s => s.id === manualForm.subjectId);
    const teacher = teachers.find(t => t.id === manualForm.teacherId);
    await base44.entities.TimetableEntry.create({
      schoolId, classId: manualForm.classId, className: cls?.className || "",
      subjectId: manualForm.subjectId, subjectName: subj?.name || "",
      teacherId: manualForm.teacherId || "", teacherName: teacher?.fullName || "",
      dayOfWeek: manualForm.dayOfWeek, startTime: manualForm.startTime, endTime: manualForm.endTime,
    });
    setManualForm({ classId: "", subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: "" });
    setShowManualDialog(false);
    toast.success("Entry added");
    loadData();
    setSaving(false);
  }

  async function handleDelete(entry) {
    await base44.entities.TimetableEntry.delete(entry.id);
    toast.success("Entry deleted");
    loadData();
  }

  async function handleSyncTeachers() {
    setSyncing(true);
    const count = await autoLinkTeachersToTimetable(schoolId);
    toast.success(count > 0 ? `Linked ${count} teacher(s)` : "All entries already have teachers");
    setSyncing(false);
    loadData();
  }

  async function handleClearClass() {
    if (selectedClass === "all") return toast.error("Select a specific class to clear");
    const toDelete = entries.filter(e => e.classId === selectedClass);
    if (!toDelete.length) return toast.info("No entries to clear");
    await Promise.all(toDelete.map(e => base44.entities.TimetableEntry.delete(e.id)));
    toast.success(`Cleared ${toDelete.length} entries`);
    loadData();
  }

  async function handleBulkReset() {
    if (!window.confirm("Are you sure you want to delete ALL timetable entries? This cannot be undone.")) return;
    setSaving(true);
    try {
      await Promise.all(entries.map(e => base44.entities.TimetableEntry.delete(e.id)));
      toast.success(`Reset all ${entries.length} timetable entries`);
      loadData();
    } catch (error) {
      console.error('Failed to reset timetable:', error);
      toast.error('Failed to reset timetable');
    } finally {
      setSaving(false);
    }
  }

  // ── AI Generator ─────────────────────────────────────────────────────────
  async function handleAiGenerate() {
    setAiError(""); setAiPreview([]); setAiLog(""); setAiClashMap({});
    if (!aiPrompt.trim()) return setAiError("Please describe what you want, e.g. 'Generate a timetable for SS2 Science B with double periods for Maths and Physics'");
    setAiGenerating(true);

    // Build rich context for the AI
    const classesInfo = classes.map(c => ({
      id: c.id, name: c.className, level: c.educationLevel, track: c.academicTrack || ""
    }));

    const subjectsInfo = subjects.map(s => ({
      id: s.id, name: s.name, code: s.code || "", category: s.categoryName || "",
      compulsory: s.isCompulsory, classes: s.applicableClasses || []
    }));

    const teachersInfo = teachers.map(t => ({
      id: t.id, name: t.fullName,
      subjects: (t.teachingAssignments || []).map(a => ({ subjectId: a.subjectId, classId: a.classId }))
    }));

    const existingEntriesSummary = entries.map(e => ({
      classId: e.classId, className: e.className, subjectName: e.subjectName,
      teacherId: e.teacherId, teacherName: e.teacherName,
      day: e.dayOfWeek, start: e.startTime, end: e.endTime
    }));

    const systemContext = `
You are an expert school timetable scheduler AI for a Nigerian secondary school management system called SchoolPulse.

SCHOOL DATA:
Classes: ${JSON.stringify(classesInfo)}
Subjects: ${JSON.stringify(subjectsInfo)}
Teachers: ${JSON.stringify(teachersInfo)}
Existing timetable entries (already scheduled): ${JSON.stringify(existingEntriesSummary)}

SCHEDULING RULES (MANDATORY - NEVER VIOLATE):
1. No class can have two subjects at the same time on the same day (class clash).
2. No teacher can be in two places at the same time on the same day (teacher clash).
3. Periods must not overlap within a class.
4. Default school periods: 08:00-09:00, 09:00-10:00, 10:15-11:15, 11:15-12:15, 13:00-14:00, 14:00-15:00
5. Double periods: use consecutive times e.g. 08:00-10:00 for Maths if requested.
6. Each class should have 5-6 periods per day (Mon-Fri).
7. Compulsory subjects must appear at least twice a week.
8. Balance subject distribution — avoid clustering one subject on consecutive days.
9. Assign teachers to subjects based on their teachingAssignments. Leave teacherId/teacherName empty if no teacher assigned.
10. Analyse the existing timetable to avoid re-scheduling already-scheduled entries.

When generating, always:
- Identify exactly which class(es) the user is referring to from the classes list (support fuzzy matching e.g. "js1a" → "JS1A", "ss2 science" → any SS2 Science class)
- Extract any special constraints from the prompt (double periods, specific days, excluded subjects, start time preferences, number of periods per day, etc.)
- Explain your reasoning in the "reasoning" field
- Return ONLY subjects that are mapped to the target class (applicableClasses includes the class ID)

USER PROMPT: "${aiPrompt.trim()}"
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: systemContext,
      model: "gemini_3_1_pro",
      response_json_schema: {
        type: "object",
        properties: {
          reasoning: { type: "string", description: "Brief explanation of decisions made" },
          targetClasses: {
            type: "array",
            items: { type: "string" },
            description: "Class IDs being scheduled"
          },
          slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                classId: { type: "string" },
                className: { type: "string" },
                subjectId: { type: "string" },
                subjectName: { type: "string" },
                teacherId: { type: "string" },
                teacherName: { type: "string" },
                dayOfWeek: { type: "string", enum: ["Monday","Tuesday","Wednesday","Thursday","Friday"] },
                startTime: { type: "string", description: "HH:MM" },
                endTime: { type: "string", description: "HH:MM" },
              },
              required: ["classId","className","subjectId","subjectName","dayOfWeek","startTime","endTime"]
            }
          },
          warnings: {
            type: "array",
            items: { type: "string" },
            description: "Any issues or notes about the generated schedule"
          }
        },
        required: ["slots", "reasoning"]
      }
    });

    const slots = (result?.slots || []).map(s => ({
      schoolId,
      classId: s.classId || "",
      className: s.className || "",
      subjectId: s.subjectId || "",
      subjectName: s.subjectName || "",
      teacherId: s.teacherId || "",
      teacherName: s.teacherName || "",
      dayOfWeek: s.dayOfWeek || "",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
    }));

    if (slots.length === 0) {
      setAiError("AI didn't generate any entries. Try a more specific prompt, e.g. 'Generate timetable for JS1A'");
      setAiGenerating(false);
      return;
    }

    // Run clash detection against existing entries + within preview itself
    const clashMap = {};
    slots.forEach((slot, i) => {
      const otherPreview = slots.filter((_, j) => j !== i);
      const clashes = detectClashes(slot, [...entries, ...otherPreview]);
      if (clashes.length > 0) clashMap[i] = clashes;
    });

    setAiPreview(slots);
    setAiClashMap(clashMap);
    if (result?.reasoning) setAiLog(result.reasoning);
    if (result?.warnings?.length > 0) {
      result.warnings.forEach(w => toast.warning(w, { duration: 6000 }));
    }
    const clashCount = Object.keys(clashMap).length;
    if (clashCount > 0) {
      toast.warning(`${clashCount} clash(es) detected in preview — review before saving`);
    } else {
      toast.success(`${slots.length} entries generated with no clashes`);
    }
    setAiGenerating(false);
  }

  async function handleSaveAiPreview() {
    const clashCount = Object.keys(aiClashMap).length;
    if (clashCount > 0) {
      if (!window.confirm(`There are ${clashCount} clash(es) in the preview. Save anyway?`)) return;
    }
    setSaving(true);
    // Only save non-clashing entries unless confirmed
    await Promise.all(aiPreview.map(entry => base44.entities.TimetableEntry.create(entry)));
    toast.success(`Saved ${aiPreview.length} timetable entries`);
    setAiPreview([]);
    setAiPrompt("");
    setAiLog("");
    setAiClashMap({});
    loadData();
    setSaving(false);
  }

  // ── PDF Export ───────────────────────────────────────────────────────────
  function handleExportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const colW = (pageW - margin * 2) / (DAYS.length + 1);

    const className = selectedClass !== "all"
      ? classes.find(c => c.id === selectedClass)?.className || "All Classes"
      : "All Classes";

    // Header background
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SchoolPulse — Weekly Timetable', margin, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(className, pageW - margin, 11, { align: 'right' });

    // Column headers
    const headerY = 22;
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Time', margin + 2, headerY + 5);
    DAYS.forEach((day, i) => {
      const x = margin + colW * (i + 1);
      doc.setFillColor(241, 245, 249);
      doc.rect(x, headerY, colW, 9, 'F');
      doc.text(day, x + colW / 2, headerY + 5.5, { align: 'center' });
    });

    // Collect all unique time slots sorted
    const timeSlots = [...new Set(filteredEntries.map(e => `${e.startTime}|${e.endTime}`))]
      .sort()
      .map(t => { const [s, e] = t.split('|'); return { startTime: s, endTime: e }; });

    const rowH = 12;
    let y = headerY + 9;

    timeSlots.forEach((slot, rowIdx) => {
      const rowY = y + rowIdx * rowH;
      if (rowY + rowH > pageH - margin) return; // skip if out of page

      // Alternating row bg
      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, pageW - margin * 2, rowH, 'F');
      }

      // Time label
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${slot.startTime}–${slot.endTime}`, margin + 2, rowY + 7.5);

      DAYS.forEach((day, dayIdx) => {
        const cellX = margin + colW * (dayIdx + 1) + 1;
        const entriesInCell = filteredEntries.filter(e =>
          e.dayOfWeek === day && e.startTime === slot.startTime && e.endTime === slot.endTime
        );

        entriesInCell.forEach((entry, eIdx) => {
          const cellY = rowY + 1 + eIdx * (rowH - 2);
          // Subject pill background
          doc.setFillColor(219, 234, 254);
          doc.roundedRect(cellX, cellY, colW - 3, rowH - 3, 1.5, 1.5, 'F');
          doc.setTextColor(29, 78, 216);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(entry.subjectName || '', cellX + 2, cellY + 5, { maxWidth: colW - 6 });
          if (entry.teacherName) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.setFontSize(6);
            doc.text(entry.teacherName, cellX + 2, cellY + 9, { maxWidth: colW - 6 });
          }
        });
      });
    });

    // Border grid lines
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    const totalH = Math.min(timeSlots.length * rowH, pageH - margin - headerY - 9);
    for (let i = 0; i <= DAYS.length + 1; i++) {
      const x = margin + colW * i;
      doc.line(x, headerY, x, headerY + 9 + totalH);
    }
    for (let i = 0; i <= timeSlots.length; i++) {
      const lineY = headerY + 9 + i * rowH;
      if (lineY <= pageH - margin) doc.line(margin, lineY, pageW - margin, lineY);
    }

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageW / 2, pageH - 5, { align: 'center' });

    doc.save(`timetable-${className.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  // ── View helpers ──────────────────────────────────────────────────────────
  const filteredEntries = selectedClass && selectedClass !== "all"
    ? entries.filter(e => e.classId === selectedClass)
    : entries;

  const groupedByDay = DAYS.map(day => ({
    day,
    items: filteredEntries.filter(e => e.dayOfWeek === day).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
  }));

  // Detect clashes in the current view
  const viewClashIds = new Set();
  filteredEntries.forEach((entry) => {
    const clashes = detectClashes(entry, filteredEntries);
    if (clashes.length > 0) viewClashIds.add(entry.id);
  });

  const warnings = [];
  const classesWithEntries = [...new Set(entries.map(e => e.classId))];
  classes.forEach(c => { if (!classesWithEntries.includes(c.id)) warnings.push(`${c.className} has no timetable`); });
  const noTeacherEntries = entries.filter(e => !e.teacherId).length;
  if (noTeacherEntries > 0) warnings.push(`${noTeacherEntries} entries have no teacher assigned`);
  if (viewClashIds.size > 0) warnings.push(`${viewClashIds.size} clash(es) detected in current view`);

  const categoryColorMap = {};
  categories.forEach((cat, i) => { categoryColorMap[cat.id] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });

  function getEntryColor(entry) {
    const subj = subjects.find(s => s.id === entry.subjectId);
    if (subj?.categoryId && categoryColorMap[subj.categoryId]) return categoryColorMap[subj.categoryId];
    return "bg-secondary/60 text-foreground";
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Clash detection is always active</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSyncTeachers} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
            Sync Teachers
          </Button>
          <Button onClick={() => setShowManualDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
          {entries.length > 0 && (
            <Button variant="outline" onClick={handleBulkReset} disabled={saving} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-1" /> Reset All
            </Button>
          )}
        </div>
      </div>

      {/* Warnings panel */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{w}
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="view">
        <TabsList className="mb-4">
          <TabsTrigger value="view">Weekly Grid</TabsTrigger>
          <TabsTrigger value="ai">
            <Wand2 className="w-4 h-4 mr-1.5" /> AI Generator
          </TabsTrigger>
        </TabsList>

        {/* ── Weekly Grid ── */}
        <TabsContent value="view">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="max-w-xs flex-1">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedClass !== "all" && (
              <Button variant="outline" size="sm" onClick={handleClearClass} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-1" /> Clear This Class
              </Button>
            )}
            {filteredEntries.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-1" /> Export PDF
              </Button>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="mb-1">No timetable entries{selectedClass !== "all" ? " for this class" : ""}.</p>
              <p className="text-sm">Use the AI Generator tab to auto-generate a timetable.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {groupedByDay.map(({ day, items }) => (
                <Card key={day} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />{day}
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No entries</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => {
                          const isClash = viewClashIds.has(item.id);
                          return (
                            <div key={item.id} className={`flex items-center gap-3 rounded-lg p-2.5 group relative border ${isClash ? 'border-red-300 bg-red-50' : 'border-transparent'}`}>
                              {isClash && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" title="Clash detected" />}
                              <span className="text-xs font-mono w-28 text-muted-foreground flex-shrink-0">{item.startTime}–{item.endTime}</span>
                              <div className={`px-2.5 py-1 rounded-md text-xs font-medium flex-1 ${isClash ? 'bg-red-100 text-red-700' : getEntryColor(item)}`}>
                                {item.subjectName}
                                {item.className && selectedClass === "all" && <span className="ml-1 opacity-70">• {item.className}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground min-w-0 hidden sm:block">
                                {item.teacherName || <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No teacher</span>}
                              </div>
                              <button onClick={() => handleDelete(item)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── AI Generator ── */}
        <TabsContent value="ai">
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Intelligent AI Timetable Generator</h3>
                  <p className="text-sm text-muted-foreground">Understands complex instructions, respects teacher assignments, detects clashes automatically. Uses your school's actual subjects and class data.</p>
                </div>
              </div>

              <div className="bg-secondary/40 rounded-lg p-3 mb-4 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground text-sm mb-1">💡 Example prompts you can use:</p>
                <p>• "Generate timetable for JS1A with double periods for Maths on Monday and Wednesday"</p>
                <p>• "Create SS2 Science B timetable — give Physics and Chemistry 3 periods each per week, no classes after 2pm on Fridays"</p>
                <p>• "Build a full week timetable for JS3C, prioritise English and Mathematics, avoid scheduling Science on Mondays"</p>
                <p>• "Schedule SS1 Commerce with double period Economics on Tuesdays and Thursdays"</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Your instructions</Label>
                  <Textarea
                    className="mt-1"
                    rows={4}
                    placeholder="Be as specific as you like — mention class names, preferred days, double periods, subject priorities, time restrictions..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                </div>
                {aiError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{aiError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleAiGenerate} disabled={aiGenerating} className="flex-1">
                    {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    {aiGenerating ? "Generating — this may take a moment..." : "Generate Timetable"}
                  </Button>
                  {aiPreview.length > 0 && (
                    <Button variant="outline" onClick={() => { setAiPreview([]); setAiClashMap({}); setAiLog(""); }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick generate buttons */}
              {classes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Quick start — click to pre-fill:</p>
                  <div className="flex flex-wrap gap-2">
                    {classes.map(c => (
                      <button key={c.id} onClick={() => setAiPrompt(`Generate a full week timetable for ${c.className}`)}
                        className="text-xs px-3 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-full transition-colors">
                        {c.className}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Reasoning Log */}
          {aiLog && (
            <Card className="border-0 shadow-sm mb-4 border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AI Reasoning</p>
                <p className="text-sm text-foreground">{aiLog}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Preview */}
          {aiPreview.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {Object.keys(aiClashMap).length > 0
                        ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      Preview — {aiPreview[0]?.className}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {aiPreview.length} entries
                      {Object.keys(aiClashMap).length > 0
                        ? <span className="text-amber-600 ml-2">• {Object.keys(aiClashMap).length} clash(es) found</span>
                        : <span className="text-emerald-600 ml-2">• No clashes</span>}
                    </p>
                  </div>
                  <Button onClick={handleSaveAiPreview} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save to Timetable
                  </Button>
                </div>

                <div className="grid gap-3">
                  {DAYS.map(day => {
                    const items = aiPreview
                      .map((e, i) => ({ ...e, _idx: i }))
                      .filter(e => e.dayOfWeek === day)
                      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
                    if (!items.length) return null;
                    return (
                      <div key={day}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">{day}</p>
                        <div className="space-y-1.5">
                          {items.map((item) => {
                            const clashes = aiClashMap[item._idx] || [];
                            return (
                              <div key={item._idx} className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 rounded-lg px-3 py-2 text-xs ${clashes.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-primary/5'}`}>
                                <span className="font-mono text-muted-foreground w-28 flex-shrink-0">{item.startTime}–{item.endTime}</span>
                                <span className="font-medium flex-1">{item.subjectName}</span>
                                {item.teacherName && <span className="text-muted-foreground">{item.teacherName}</span>}
                                {clashes.length > 0 && (
                                  <div className="flex items-start gap-1 text-red-600 mt-1 sm:mt-0">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                    <span>{clashes[0]}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Create Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Timetable Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={manualForm.classId} onValueChange={v => setManualForm({ ...manualForm, classId: v, subjectId: "" })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={manualForm.subjectId} onValueChange={v => setManualForm({ ...manualForm, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsForManualClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  {subjectsForManualClass.length === 0 && <SelectItem value="none" disabled>No subjects for this class</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={manualForm.teacherId} onValueChange={v => setManualForm({ ...manualForm, teacherId: v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher (optional)" /></SelectTrigger>
                <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day *</Label>
              <Select value={manualForm.dayOfWeek} onValueChange={v => setManualForm({ ...manualForm, dayOfWeek: v })}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start</Label><Input type="time" value={manualForm.startTime} onChange={e => setManualForm({ ...manualForm, startTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="time" value={manualForm.endTime} onChange={e => setManualForm({ ...manualForm, endTime: e.target.value })} /></div>
            </div>

            {/* Live clash warning */}
            {manualClashes.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" /> Clash Detected
                </div>
                {manualClashes.map((c, i) => (
                  <p key={i} className="text-xs text-red-600">{c}</p>
                ))}
              </div>
            )}
            {manualClashes.length === 0 && manualForm.classId && manualForm.dayOfWeek && manualForm.startTime && manualForm.endTime && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle2 className="w-4 h-4" /> No clashes detected
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving || manualClashes.length > 0}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Entry
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}