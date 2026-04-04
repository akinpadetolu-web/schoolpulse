import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { generateWeeklyTimetableForClass, getSubjectsForClass, autoLinkTeachersToTimetable, parseTimetablePrompt } from '@/lib/schoolData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, RefreshCw, Wand2, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const CATEGORY_COLORS = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];

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
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState([]);
  const [aiError, setAiError] = useState("");
  const [manualForm, setManualForm] = useState({ classId: "", subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
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
    } catch { /* ignore */ }
    setLoading(false);
  }

  // Subjects filtered by selected class (for manual form)
  const subjectsForManualClass = manualForm.classId
    ? subjects.filter(s => (s.applicableClasses || []).includes(manualForm.classId))
    : subjects;

  async function handleManualCreate(e) {
    e.preventDefault();
    if (!manualForm.classId || !manualForm.subjectId || !manualForm.dayOfWeek) return toast.error("Class, subject and day are required");
    setSaving(true);
    try {
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
    } catch { toast.error("Failed to add entry"); }
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
    toast.success(count > 0 ? `Linked ${count} teacher${count > 1 ? "s" : ""} to timetable entries` : "All entries already have teachers or no matches found");
    setSyncing(false);
    loadData();
  }

  async function handleAiGenerate() {
    setAiError("");
    setAiPreview([]);
    if (!aiPrompt.trim()) return setAiError("Please enter a prompt, e.g. 'Generate timetable for JS1A'");
    setAiGenerating(true);
    try {
      // Parse class name from prompt
      const className = parseTimetablePrompt(aiPrompt);
      if (!className) {
        setAiError("Could not detect a class name in your prompt. Try: 'Generate timetable for JS1A'");
        setAiGenerating(false);
        return;
      }
      const cls = classes.find(c => c.className.toLowerCase() === className.toLowerCase());
      if (!cls) {
        setAiError(`Class "${className}" not found. Please create it in Classes first.`);
        setAiGenerating(false);
        return;
      }
      const classSubjects = await getSubjectsForClass(cls.id, schoolId);
      if (classSubjects.length === 0) {
        setAiError(`No subjects are mapped to ${cls.className}. Please assign subjects to this class first.`);
        setAiGenerating(false);
        return;
      }

      // Use AI to help distribute subjects intelligently
      const subjectNames = classSubjects.map(s => s.name).join(", ");
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a school timetable generator. Generate a weekly timetable for class "${cls.className}" using ONLY these subjects: ${subjectNames}.
Output a JSON array of timetable slots. Each slot must have: dayOfWeek (Monday-Friday), startTime (HH:MM), endTime (HH:MM), subjectName (must be one of the listed subjects).
Requirements:
- Monday to Friday, 5-6 periods per day
- Periods: 08:00-09:00, 09:00-10:00, 10:15-11:15, 11:15-12:15, 13:00-14:00, 14:00-15:00
- Distribute subjects evenly across the week
- Core/compulsory subjects should appear more frequently
- No duplicate subject in same day if avoidable
Return ONLY the JSON array, no markdown.`,
        response_json_schema: {
          type: "object",
          properties: {
            slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dayOfWeek: { type: "string" },
                  startTime: { type: "string" },
                  endTime: { type: "string" },
                  subjectName: { type: "string" },
                }
              }
            }
          }
        }
      });

      const slots = aiResult?.slots || [];
      // Map slots back to subject IDs
      const preview = slots.map(slot => {
        const subj = classSubjects.find(s => s.name.toLowerCase() === slot.subjectName.toLowerCase()) || classSubjects[0];
        return {
          schoolId, classId: cls.id, className: cls.className,
          subjectId: subj.id, subjectName: subj.name || slot.subjectName,
          teacherId: "", teacherName: "",
          dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime,
          categoryId: subj.categoryId || "",
        };
      });
      setAiPreview(preview);
      if (preview.length === 0) setAiError("AI did not return any timetable entries. Try a clearer prompt.");
    } catch (err) {
      setAiError("AI generation failed. Please try again.");
      console.error(err);
    }
    setAiGenerating(false);
  }

  async function handleSaveAiPreview() {
    if (!aiPreview.length) return;
    setSaving(true);
    try {
      await Promise.all(aiPreview.map(entry => base44.entities.TimetableEntry.create(entry)));
      toast.success(`Saved ${aiPreview.length} timetable entries`);
      setAiPreview([]);
      setAiPrompt("");
      loadData();
    } catch { toast.error("Failed to save timetable"); }
    setSaving(false);
  }

  async function handleClearClass() {
    if (selectedClass === "all") return toast.error("Please select a specific class to clear");
    const toDelete = entries.filter(e => e.classId === selectedClass);
    if (!toDelete.length) return toast.info("No entries to clear");
    await Promise.all(toDelete.map(e => base44.entities.TimetableEntry.delete(e.id)));
    toast.success(`Cleared ${toDelete.length} entries`);
    loadData();
  }

  const filteredEntries = selectedClass && selectedClass !== "all"
    ? entries.filter(e => e.classId === selectedClass)
    : entries;

  const groupedByDay = DAYS.map(day => ({
    day,
    items: filteredEntries.filter(e => e.dayOfWeek === day).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
  }));

  const warnings = [];
  const classesWithEntries = [...new Set(entries.map(e => e.classId))];
  classes.forEach(c => {
    if (!classesWithEntries.includes(c.id)) warnings.push(`${c.className} has no timetable`);
  });
  const noTeacherEntries = entries.filter(e => !e.teacherId).length;
  if (noTeacherEntries > 0) warnings.push(`${noTeacherEntries} timetable entries have no teacher assigned`);

  // Category color map
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
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSyncTeachers} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
            Sync Teachers
          </Button>
          <Button onClick={() => setShowManualDialog(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
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
          <TabsTrigger value="ai">AI Generator</TabsTrigger>
        </TabsList>

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
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-2">No timetable entries{selectedClass !== "all" ? " for this class" : ""}.</p>
              <p className="text-sm">Use the AI Generator tab to auto-generate a timetable.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {groupedByDay.map(({ day, items }) => (
                <Card key={day} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">{day}</h3>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No entries</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 rounded-lg p-2.5 group relative">
                            <span className="text-xs font-mono w-28 text-muted-foreground flex-shrink-0">{item.startTime}–{item.endTime}</span>
                            <div className={`px-2.5 py-1 rounded-md text-xs font-medium flex-1 ${getEntryColor(item)}`}>
                              {item.subjectName}
                              {item.className && selectedClass === "all" && <span className="ml-1 opacity-70">• {item.className}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground min-w-0">
                              {item.teacherName ? item.teacherName : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No teacher</span>}
                            </div>
                            <button onClick={() => handleDelete(item)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> AI Timetable Generator</h3>
              <p className="text-sm text-muted-foreground mb-4">Uses your school's actual subjects and classes — works for JS1–JS3, SS1–SS3, and all subsets.</p>
              <div className="space-y-3">
                <div>
                  <Label>Your prompt</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    placeholder="e.g. Generate timetable for JS1A&#10;Create timetable for SS2 Science B&#10;Build timetable for JS3C"
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
                    {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {aiGenerating ? "Generating..." : "Generate Timetable"}
                  </Button>
                  {aiPreview.length > 0 && (
                    <Button variant="outline" onClick={() => { setAiPreview([]); setAiError(""); }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick generate buttons */}
              {classes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Quick generate for:</p>
                  <div className="flex flex-wrap gap-2">
                    {classes.slice(0, 8).map(c => (
                      <button key={c.id} onClick={() => setAiPrompt(`Generate timetable for ${c.className}`)}
                        className="text-xs px-3 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-full transition-colors">
                        {c.className}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Preview */}
          {aiPreview.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Preview — {aiPreview[0]?.className}</h3>
                    <p className="text-sm text-muted-foreground">{aiPreview.length} entries generated</p>
                  </div>
                  <Button onClick={handleSaveAiPreview} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save to Timetable
                  </Button>
                </div>
                <div className="grid gap-2">
                  {DAYS.map(day => {
                    const items = aiPreview.filter(e => e.dayOfWeek === day).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
                    if (!items.length) return null;
                    return (
                      <div key={day}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{day}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {items.map((item, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-md">
                              {item.startTime}–{item.endTime} · {item.subjectName}
                            </span>
                          ))}
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
          <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
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
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Add Entry</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}