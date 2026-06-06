import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2, Loader2, BookOpen, Lightbulb, CheckSquare, Square,
  Calendar, RefreshCw, Star, StarOff, MessageSquare, ChevronDown, ChevronUp, Save, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── No Timetable Empty State ────────────────────────────────────
function NoTimetableState() {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-3">
        <Calendar className="w-6 h-6 text-red-400" />
      </div>
      <p className="font-medium text-foreground mb-1">Not Available Outside Exam Period</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        You can only generate this during the exam period. Please check back when your school admin has published an exam timetable.
      </p>
    </div>
  );
}

// ─── AI Study Plan ────────────────────────────────────────────────
export function AIStudyPlanGenerator({ entries, grades, studentId, schoolId, studentName }) {
  const [studyHours, setStudyHours] = useState('afternoon');
  const [hoursPerDay, setHoursPerDay] = useState('3');
  const [savedPlan, setSavedPlan] = useState(null);  // record from DB
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const hasEntries = entries.length > 0;
  const sessionLabel = `Exam Session — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  // Load saved plan on mount
  useEffect(() => {
    if (!studentId) return;
    loadSavedPlan();
  }, [studentId]);

  async function loadSavedPlan() {
    setLoading(true);
    const plans = await base44.entities.AIStudyPlan.filter({ studentId, schoolId, status: 'active' });
    if (plans?.length > 0) {
      // most recent
      const sorted = [...plans].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setSavedPlan(sorted[0]);
    }
    setLoading(false);
  }

  async function generate() {
    if (savedPlan) {
      if (!window.confirm('You already have a saved study plan. Generating a new one will replace your current plan. Continue?')) return;
    }
    setGenerating(true);

    const examList = entries.map(e => `${e.subjectName} (${e.dayOfWeek}${e.startTime ? ' at ' + e.startTime : ''})`).join(', ');
    const gradeContext = grades?.length
      ? grades.slice(0, 20).map(g => `${g.subjectName}: ${g.score}/${g.maxScore}`).join(', ')
      : 'No grade history available';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a personalised student study planner. Create a day-by-day study plan.
Student: ${studentName || 'Student'}
Upcoming exams: ${examList || 'No exams scheduled yet'}
Historical performance: ${gradeContext}
Preferred study time: ${studyHours}
Study hours available per day: ${hoursPerDay} hours
Today: ${new Date().toLocaleDateString()}
Generate a practical study plan for the next 14 days. Prioritise subjects with lower scores. Include revision days before each exam. Include rest days.`,
      response_json_schema: {
        type: 'object',
        properties: {
          totalDays: { type: 'number' },
          readinessSummary: { type: 'string' },
          plan: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'number' },
                date: { type: 'string' },
                subject: { type: 'string' },
                task: { type: 'string' },
                hours: { type: 'number' },
                priority: { type: 'string' },
              }
            }
          },
          generalTips: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // Save to DB — archive old, create new
    if (savedPlan?.id) {
      await base44.entities.AIStudyPlan.update(savedPlan.id, { status: 'archived' });
    }
    const newPlan = await base44.entities.AIStudyPlan.create({
      studentId, schoolId, studentName, sessionLabel,
      planContent: res,
      progress: {},
      completionPercentage: 0,
      status: 'active',
      version: (savedPlan?.version || 0) + 1,
      timetableEntryCount: entries.length,
      studyHours, hoursPerDay,
    });

    setSavedPlan(newPlan);
    setGenerating(false);
    toast.success('Study plan generated and saved!');
  }

  async function toggleComplete(idx) {
    if (!savedPlan) return;
    const newProgress = { ...(savedPlan.progress || {}), [idx]: !(savedPlan.progress?.[idx]) };
    const total = savedPlan.planContent?.plan?.length || 0;
    const done = Object.values(newProgress).filter(Boolean).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const updated = { ...savedPlan, progress: newProgress, completionPercentage: pct };
    setSavedPlan(updated);

    setSavingProgress(true);
    await base44.entities.AIStudyPlan.update(savedPlan.id, { progress: newProgress, completionPercentage: pct });
    setSavingProgress(false);
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!hasEntries) return <NoTimetableState />;

  const plan = savedPlan?.planContent;
  const progress = savedPlan?.progress || {};
  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalTasks = plan?.plan?.length || 0;
  const completionPct = savedPlan?.completionPercentage || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" />AI Study Plan</h3>
          <p className="text-sm text-muted-foreground">Personalised day-by-day study schedule</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={studyHours} onValueChange={setStudyHours}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="any">Any time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hoursPerDay} onValueChange={setHoursPerDay}>
            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['1','2','3','4','5'].map(h => <SelectItem key={h} value={h}>{h}h/day</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={generating} size="sm" className="h-7 gap-1.5 text-xs">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : savedPlan ? <RefreshCw className="w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
            {generating ? 'Generating…' : savedPlan ? 'Regenerate' : 'Generate Plan'}
          </Button>
        </div>
      </div>

      {/* Saved banner */}
      {savedPlan && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>
            📅 Study Plan generated on {savedPlan.created_date ? format(new Date(savedPlan.created_date), 'MMM d, yyyy \'at\' h:mm a') : '—'} · {savedPlan.sessionLabel}
          </span>
          {savingProgress && <span className="ml-auto flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
          {!savingProgress && <span className="ml-auto flex items-center gap-1 text-emerald-600"><Clock className="w-3 h-3" />Auto-saved</span>}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          {plan.readinessSummary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{plan.readinessSummary}</div>
          )}

          {/* Progress */}
          {totalTasks > 0 && (
            <div className="p-4 bg-card border rounded-xl space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Study Progress</span>
                <span className="text-primary">{completionPct}% Complete</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{completedCount} of {totalTasks} sessions completed</p>
            </div>
          )}

          {/* Sessions list */}
          <div className="space-y-2">
            {plan.plan?.map((item, i) => {
              const done = !!progress[i];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${done ? 'opacity-50 bg-muted/30' : 'bg-card'}`}
                  style={{ borderLeftColor: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#10b981', borderLeftWidth: 3 }}
                >
                  <button onClick={() => toggleComplete(i)} className="mt-0.5 shrink-0">
                    {done ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Day {item.day}</span>
                      {item.date && <span className="text-xs font-medium">{item.date}</span>}
                      <Badge variant="outline" className="text-xs">{item.subject}</Badge>
                      <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">{item.priority}</Badge>
                      <span className="text-xs text-muted-foreground">{item.hours}h</span>
                    </div>
                    <p className={`text-sm mt-0.5 ${done ? 'line-through text-muted-foreground' : ''}`}>{item.task}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {plan.generalTips?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-semibold text-amber-800 text-sm mb-2">Study Tips</h4>
              <ul className="space-y-1">
                {plan.generalTips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2"><span>💡</span>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!savedPlan && !generating && (
        <div className="text-center py-10 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No study plan yet. Click "Generate Plan" to create your personalised study schedule.</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Exam Tips ─────────────────────────────────────────────────
export function AIExamPreparationTips({ entries, studentId, schoolId, studentName }) {
  const [savedTips, setSavedTips] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [notes, setNotes] = useState({});
  const [editingNote, setEditingNote] = useState(null); // "si-ti"
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const hasEntries = entries.length > 0;
  const sessionLabel = `Exam Session — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  useEffect(() => {
    if (!studentId) return;
    loadSavedTips();
  }, [studentId]);

  async function loadSavedTips() {
    setLoading(true);
    const list = await base44.entities.AIExamTips.filter({ studentId, schoolId, status: 'active' });
    if (list?.length > 0) {
      const sorted = [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setSavedTips(sorted[0]);
      setNotes(sorted[0].studentNotes || {});
    }
    setLoading(false);
  }

  async function getTips() {
    if (savedTips) {
      if (!window.confirm('Regenerate AI tips? This will replace your current saved tips.')) return;
    }
    setGenerating(true);

    const examList = entries.map(e =>
      `${e.subjectName} on ${e.dayOfWeek}${e.startTime ? ' at ' + e.startTime : ''}`
    ).join('; ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a student exam preparation coach. Provide subject-specific preparation tips.
Upcoming exams: ${examList || 'No exams yet'}
Today: ${new Date().toLocaleDateString()}
For each subject provide: study strategies, important focus topics, common mistakes, time management tips for the exam, and urgency level.
Keep tips practical, encouraging and specific.`,
      response_json_schema: {
        type: 'object',
        properties: {
          subjectTips: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                urgency: { type: 'string' },
                studyStrategies: { type: 'array', items: { type: 'string' } },
                focusTopics: { type: 'array', items: { type: 'string' } },
                commonMistakes: { type: 'array', items: { type: 'string' } },
                examDayTip: { type: 'string' },
              }
            }
          },
          generalWellnessTips: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // Archive old, save new
    if (savedTips?.id) {
      await base44.entities.AIExamTips.update(savedTips.id, { status: 'archived' });
    }
    const newTips = await base44.entities.AIExamTips.create({
      studentId, schoolId, studentName, sessionLabel,
      tipsContent: res,
      highlightedTips: {},
      studentNotes: {},
      status: 'active',
      timetableEntryCount: entries.length,
    });

    setSavedTips(newTips);
    setNotes({});
    setGenerating(false);
    toast.success('Exam tips generated and saved!');
  }

  async function toggleHighlight(si, ti) {
    if (!savedTips) return;
    const key = `${si}-${ti}`;
    const newHL = { ...(savedTips.highlightedTips || {}), [key]: !(savedTips.highlightedTips?.[key]) };
    setSavedTips(prev => ({ ...prev, highlightedTips: newHL }));
    await base44.entities.AIExamTips.update(savedTips.id, { highlightedTips: newHL });
  }

  async function saveNote(si, ti) {
    if (!savedTips) return;
    const key = `${si}-${ti}`;
    const newNotes = { ...notes, [key]: noteInput };
    setNotes(newNotes);
    setSavingNote(true);
    await base44.entities.AIExamTips.update(savedTips.id, { studentNotes: newNotes });
    setSavedTips(prev => ({ ...prev, studentNotes: newNotes }));
    setSavingNote(false);
    setEditingNote(null);
    setNoteInput('');
    toast.success('Note saved');
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!hasEntries) return <NoTimetableState />;

  const tipsData = savedTips?.tipsContent;
  const highlighted = savedTips?.highlightedTips || {};

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" />AI Exam Preparation Tips</h3>
          <p className="text-sm text-muted-foreground">Subject-specific tips saved to your account</p>
        </div>
        <Button onClick={getTips} disabled={generating} size="sm" className="h-7 gap-1.5 text-xs">
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : savedTips ? <RefreshCw className="w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
          {generating ? 'Generating…' : savedTips ? 'Regenerate Tips' : 'Get AI Tips'}
        </Button>
      </div>

      {/* Saved banner */}
      {savedTips && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>
            💡 Tips generated on {savedTips.created_date ? format(new Date(savedTips.created_date), 'MMM d, yyyy \'at\' h:mm a') : '—'} · {savedTips.sessionLabel}
          </span>
          <span className="ml-auto flex items-center gap-1 text-emerald-600"><Clock className="w-3 h-3" />Auto-saved</span>
        </div>
      )}

      {!savedTips && !generating && (
        <div className="text-center py-10 text-muted-foreground">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No tips saved yet. Click "Get AI Tips" to generate personalised exam preparation tips.</p>
        </div>
      )}

      {tipsData && (
        <div className="space-y-3">
          {tipsData.subjectTips?.map((s, si) => {
            const isOpen = expanded[si] !== false; // default open
            return (
              <Card key={si} className="border shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(prev => ({ ...prev, [si]: !isOpen }))}
                >
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold flex-1">{s.subject}</span>
                  <Badge variant={s.urgency === 'high' ? 'destructive' : s.urgency === 'medium' ? 'secondary' : 'outline'} className="text-xs">{s.urgency}</Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    {/* Strategies */}
                    {s.studyStrategies?.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">STUDY STRATEGIES</p>
                        <ul className="space-y-1.5">
                          {s.studyStrategies.map((tip, ti) => {
                            const key = `${si}-s${ti}`;
                            const hl = highlighted[key];
                            const note = notes[key];
                            return (
                              <li key={ti} className={`rounded-lg p-2 text-sm flex items-start gap-2 group ${hl ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-muted/30'}`}>
                                <span className="text-primary shrink-0">•</span>
                                <div className="flex-1">
                                  <span>{tip}</span>
                                  {note && <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 italic">📝 {note}</p>}
                                  {editingNote === key && (
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        autoFocus
                                        className="flex-1 text-xs border rounded px-2 py-1"
                                        value={noteInput}
                                        onChange={e => setNoteInput(e.target.value)}
                                        placeholder="Add your note…"
                                        onKeyDown={e => e.key === 'Enter' && saveNote(si, `s${ti}`)}
                                      />
                                      <button onClick={() => saveNote(si, `s${ti}`)} disabled={savingNote} className="text-xs text-primary hover:underline">
                                        {savingNote ? '…' : 'Save'}
                                      </button>
                                      <button onClick={() => setEditingNote(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={() => toggleHighlight(si, `s${ti}`)} title={hl ? 'Remove highlight' : 'Highlight'}>
                                    {hl ? <Star className="w-3.5 h-3.5 text-yellow-500" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </button>
                                  <button onClick={() => { setEditingNote(key); setNoteInput(notes[key] || ''); }} title="Add note">
                                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Focus Topics */}
                    {s.focusTopics?.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">FOCUS TOPICS</p>
                        <ul className="space-y-1.5">
                          {s.focusTopics.map((tip, ti) => {
                            const key = `${si}-f${ti}`;
                            const hl = highlighted[key];
                            const note = notes[key];
                            return (
                              <li key={ti} className={`rounded-lg p-2 text-sm flex items-start gap-2 group ${hl ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-muted/30'}`}>
                                <span className="text-emerald-500 shrink-0">✓</span>
                                <div className="flex-1">
                                  <span>{tip}</span>
                                  {note && <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 italic">📝 {note}</p>}
                                  {editingNote === key && (
                                    <div className="flex gap-2 mt-2">
                                      <input autoFocus className="flex-1 text-xs border rounded px-2 py-1" value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Add your note…" onKeyDown={e => e.key === 'Enter' && saveNote(si, `f${ti}`)} />
                                      <button onClick={() => saveNote(si, `f${ti}`)} disabled={savingNote} className="text-xs text-primary hover:underline">{savingNote ? '…' : 'Save'}</button>
                                      <button onClick={() => setEditingNote(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={() => toggleHighlight(si, `f${ti}`)}>{hl ? <Star className="w-3.5 h-3.5 text-yellow-500" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}</button>
                                  <button onClick={() => { setEditingNote(key); setNoteInput(notes[key] || ''); }}><MessageSquare className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" /></button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Common Mistakes */}
                    {s.commonMistakes?.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">AVOID THESE MISTAKES</p>
                        <ul className="space-y-1">
                          {s.commonMistakes.map((tip, ti) => (
                            <li key={ti} className="text-sm flex items-start gap-2 p-1.5 hover:bg-muted/30 rounded-lg">
                              <span className="text-red-400 shrink-0">✗</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exam Day Tip */}
                    {s.examDayTip && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-medium text-xs text-amber-700 mb-1">EXAM DAY TIP</p>
                        <p className="text-sm text-amber-800">{s.examDayTip}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {tipsData.generalWellnessTips?.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="font-semibold text-emerald-800 text-sm mb-2">Wellness During Exam Period</h4>
              <ul className="space-y-1">
                {tipsData.generalWellnessTips.map((tip, i) => (
                  <li key={i} className="text-sm text-emerald-700 flex items-start gap-2"><span>🌿</span>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}