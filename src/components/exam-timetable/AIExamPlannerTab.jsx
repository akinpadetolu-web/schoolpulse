import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Wand2, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Users, Plus, Trash2, History, Clock
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const QUICK_TOGGLES = [
  { key: 'noTeacherOwnSubject', label: 'Teachers should NOT invigilate their own subject' },
  { key: 'evenDistribution', label: 'Distribute invigilation duties evenly across all teachers' },
  { key: 'harderEarlier', label: 'Schedule harder subjects earlier in the exam period' },
  { key: 'restAfter3Days', label: 'Add rest day after every 3 exam days' },
];

const STORAGE_KEY_PROMPT = 'adminExamPlannerPrompt';
const STORAGE_KEY_TOGGLES = 'adminExamPlannerToggles';
const STORAGE_KEY_HISTORY = 'adminExamPlannerHistory';

export default function AIExamPlannerTab({ classes, subjects, teachers, examTimetable, onApply }) {
  const [form, setForm] = useState({
    examDays: 10,
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '16:00',
    examDurationMinutes: 120,
    maxExamsPerDay: 2,
    venues: 'Hall A, Hall B, Lab 1',
    breakDays: '',
    conflictSubjects: '',
    fixedSlots: '',
  });

  const [additionalInfo, setAdditionalInfo] = useState(() =>
    localStorage.getItem(STORAGE_KEY_PROMPT) || ''
  );
  const [toggles, setToggles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TOGGLES) || '{}'); } catch { return {}; }
  });
  const [maxDutiesPerTeacher, setMaxDutiesPerTeacher] = useState(5);
  const [minInvigilatorsPerExam, setMinInvigilatorsPerExam] = useState(2);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoAssignOnGenerate, setAutoAssignOnGenerate] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]'); } catch { return []; }
  });

  // Manual invigilator assignment table (per generated entry)
  const [manualAssignments, setManualAssignments] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROMPT, additionalInfo);
  }, [additionalInfo]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TOGGLES, JSON.stringify(toggles));
  }, [toggles]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function buildPrompt() {
    const subjectList = subjects.map(s => s.name).join(', ');
    const classList = classes.map(c => c.className).join(', ');
    const teacherList = teachers.map(t => t.fullName).join(', ');
    const quickRules = QUICK_TOGGLES.filter(t => toggles[t.key]).map(t => t.label).join('\n');

    return `You are an expert school exam timetable scheduler.
Generate a complete, conflict-free exam timetable.

Settings:
- Exam period: ${form.startDate || 'starting soon'} to ${form.endDate || `${form.examDays} days`}
- Subjects: ${subjectList}
- Classes/Grades: ${classList}
- Available venues: ${form.venues}
- Exam hours: ${form.startTime} to ${form.endTime}
- Max exams per class per day: ${form.maxExamsPerDay}
- Exam duration: ${form.examDurationMinutes} minutes
- Break/rest days: ${form.breakDays || 'none'}
- Subjects that must NOT be on the same day: ${form.conflictSubjects || 'none'}
- Fixed slots: ${form.fixedSlots || 'none'}

${quickRules ? `Quick Rules:\n${quickRules}` : ''}

${autoAssignOnGenerate ? `Invigilator Assignment:
- Teachers available: ${teacherList}
- Maximum duties per teacher: ${maxDutiesPerTeacher}
- Minimum invigilators per exam: ${minInvigilatorsPerExam}
- Assign invigilators fairly to each exam following the rules above.` : ''}

${additionalInfo ? `Additional Instructions:\n${additionalInfo}` : ''}

Rules:
1. No class has more than ${form.maxExamsPerDay} exams per day
2. No two exams for the same class clash at the same time
3. No venue is double-booked
4. Space difficult subjects at least 1 day apart
5. Return the full timetable as JSON.`;
  }

  async function generate() {
    setLoading(true);
    setResult(null);
    const prompt = buildPrompt();

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          timetable: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'string' },
                date: { type: 'string' },
                subject: { type: 'string' },
                className: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                venue: { type: 'string' },
                invigilator: { type: 'string' },
              }
            }
          },
          summary: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
          invigilatorSummary: { type: 'string' },
        }
      }
    });

    setResult(res);
    setLoading(false);

    // Save to history
    const entry = {
      prompt: additionalInfo,
      toggles: { ...toggles },
      at: new Date().toISOString(),
      summary: res?.summary || '',
    };
    const newHistory = [entry, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
  }

  function applyToSchedule() {
    if (!result?.timetable?.length) return;
    onApply && onApply(result.timetable, manualAssignments);
    toast.success('Timetable saved to Exam Schedule!');
    setResult(null);
  }

  function reuseHistory(item) {
    setAdditionalInfo(item.prompt);
    if (item.toggles) setToggles(item.toggles);
    setShowHistory(false);
    toast.success('Prompt loaded from history');
  }

  // Teacher duty count for manual assignment
  const dutyCount = {};
  Object.values(manualAssignments).forEach(row => {
    if (row.teacherId) dutyCount[row.teacherId] = (dutyCount[row.teacherId] || 0) + 1;
  });

  // Conflict check for manual assignment
  function hasConflict(rowKey, teacherId) {
    if (!teacherId) return false;
    const row = result?.timetable?.[rowKey];
    if (!row) return false;
    return Object.entries(manualAssignments).some(([k, a]) => {
      if (k === String(rowKey)) return false;
      const other = result.timetable[Number(k)];
      return a.teacherId === teacherId && other?.date === row.date && timesOverlap(row.startTime, row.endTime, other.startTime, other.endTime);
    });
  }

  function timesOverlap(s1, e1, s2, e2) {
    if (!s1 || !e1 || !s2 || !e2) return false;
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
  }

  const charLeft = 2000 - additionalInfo.length;

  return (
    <div className="space-y-6">
      {/* Section A: Generation Settings */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">A — Exam Generation Settings</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><p className="text-xs text-muted-foreground mb-1">Exam Days</p><Input type="number" value={form.examDays} onChange={e => upd('examDays', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">Start Date</p><Input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">End Date</p><Input type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">Exam Start Time</p><Input type="time" value={form.startTime} onChange={e => upd('startTime', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">Exam End Time</p><Input type="time" value={form.endTime} onChange={e => upd('endTime', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">Duration (mins)</p><Input type="number" value={form.examDurationMinutes} onChange={e => upd('examDurationMinutes', e.target.value)} className="h-8 text-sm" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">Max Exams/Class/Day</p><Input type="number" value={form.maxExamsPerDay} onChange={e => upd('maxExamsPerDay', e.target.value)} className="h-8 text-sm" /></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Available Venues (comma-separated)</p><Input value={form.venues} onChange={e => upd('venues', e.target.value)} className="h-8 text-sm" /></div>
            <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground mb-1">Rest/Break Days (e.g. "June 14, June 21")</p><Input value={form.breakDays} onChange={e => upd('breakDays', e.target.value)} placeholder="Leave blank if none" className="h-8 text-sm" /></div>
            <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground mb-1">Subjects that must NOT be on the same day</p><Input value={form.conflictSubjects} onChange={e => upd('conflictSubjects', e.target.value)} placeholder="e.g. Mathematics & Physics" className="h-8 text-sm" /></div>
            <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground mb-1">Fixed slots (e.g. "Mathematics on June 10")</p><Input value={form.fixedSlots} onChange={e => upd('fixedSlots', e.target.value)} placeholder="Optional" className="h-8 text-sm" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Invigilator Assignment */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">B — Invigilator Assignment</h3>
            <p className="text-xs text-muted-foreground mt-1">Assign invigilators to exams. You can use the prompt box, auto bulk assignment, or manually assign after generation.</p>
          </div>

          {/* Option 1 & 2 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors flex-1 ${autoAssignOnGenerate ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
              onClick={() => setAutoAssignOnGenerate(v => !v)}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${autoAssignOnGenerate ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {autoAssignOnGenerate && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium">AI Auto-Assign During Generation</p>
                <p className="text-xs text-muted-foreground">AI will assign invigilators to all exams when generating the timetable</p>
              </div>
            </div>
          </div>

          {autoAssignOnGenerate && (
            <div className="grid grid-cols-2 gap-3 pl-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Max invigilation duties per teacher</p>
                <Input type="number" value={maxDutiesPerTeacher} onChange={e => setMaxDutiesPerTeacher(Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Minimum invigilators per exam</p>
                <Input type="number" value={minInvigilatorsPerExam} onChange={e => setMinInvigilatorsPerExam(Number(e.target.value))} className="h-8 text-sm" />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Or add invigilator preferences in the Additional Information box below (e.g. "Assign Mr. Smith to all Science exams").
            After generation, you can also manually assign in the table below.
          </p>
        </CardContent>
      </Card>

      {/* Section C: Additional Information */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">C — Additional Information & Special Instructions</h3>
          <div>
            <textarea
              value={additionalInfo}
              onChange={e => e.target.value.length <= 2000 && setAdditionalInfo(e.target.value)}
              placeholder={`Add any special instructions or additional information for the AI to consider when generating the timetable. Examples:
- Assign Mr. John Smith to all Science exams
- Do not schedule Mathematics and Physics on consecutive days
- Class JS3A must have their exams in Hall B
- Assign female invigilators to female classes
- Schedule difficult subjects early in the exam period
- Add 30 minute gaps between morning and afternoon exams
- Reserve Hall A only for SS3 classes
- Teachers who teach a subject should not invigilate that subject's exam`}
              className="w-full min-h-[160px] text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <p className={`text-xs mt-1 ${charLeft < 100 ? 'text-amber-600' : 'text-muted-foreground'}`}>{charLeft} characters remaining</p>
          </div>

          {/* Quick toggles */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Options</p>
            {QUICK_TOGGLES.map(t => (
              <label key={t.key} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setToggles(p => ({ ...p, [t.key]: !p[t.key] }))}
                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${toggles[t.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${toggles[t.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button onClick={generate} disabled={loading} size="lg" className="w-full gap-2 text-base h-12">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
        {loading ? 'Generating AI Timetable…' : '✨ Generate Timetable with AI'}
      </Button>

      {/* Result Preview */}
      {result && (
        <div className="space-y-4">
          {result.summary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{result.summary}</div>
          )}
          {result.invigilatorSummary && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              <strong>Invigilator Assignment:</strong> {result.invigilatorSummary}
            </div>
          )}
          {result.warnings?.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{w}</div>
              ))}
            </div>
          )}
          {result.timetable?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Generated Timetable Preview</h4>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      {['Day', 'Date', 'Class', 'Subject', 'Time', 'Venue', 'Invigilator'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.timetable.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-muted/20'}>
                        <td className="px-3 py-2">{row.day}</td>
                        <td className="px-3 py-2 text-xs">{row.date}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{row.className}</Badge></td>
                        <td className="px-3 py-2 font-medium">{row.subject}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.startTime}–{row.endTime}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{row.venue}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.invigilator ? (
                            <span className="text-emerald-700">{row.invigilator}</span>
                          ) : (
                            <Select
                              value={manualAssignments[i]?.teacherId || ''}
                              onValueChange={v => {
                                const t = teachers.find(t => t.id === v);
                                setManualAssignments(p => ({ ...p, [i]: { teacherId: v, teacherName: t?.fullName || '' } }));
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Assign…" /></SelectTrigger>
                              <SelectContent>
                                {teachers.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <span className={hasConflict(i, t.id) ? 'text-red-600' : ''}>
                                      {t.fullName} ({dutyCount[t.id] || 0} duties)
                                      {hasConflict(i, t.id) && ' ⚠️'}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={applyToSchedule} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Accept & Save to Exam Schedule
            </Button>
            <Button variant="outline" onClick={generate} className="gap-2" disabled={loading}>
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
            <Button variant="outline" onClick={applyToSchedule} className="gap-2">
              Accept & Manually Edit
            </Button>
          </div>
        </div>
      )}

      {/* Prompt History */}
      {history.length > 0 && (
        <div className="border rounded-xl">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/30 transition-colors rounded-xl"
          >
            <span className="flex items-center gap-2"><History className="w-4 h-4" />Previous Prompts ({history.length})</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="px-4 pb-4 space-y-3 border-t pt-3">
              {history.map((item, i) => (
                <div key={i} className="p-3 border rounded-lg bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.at ? format(new Date(item.at), 'MMM d, yyyy h:mm a') : ''}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => reuseHistory(item)} className="h-6 text-xs px-2">
                      Reuse This Prompt
                    </Button>
                  </div>
                  {item.prompt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
                  )}
                  {item.summary && (
                    <p className="text-xs text-blue-700 italic">{item.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}