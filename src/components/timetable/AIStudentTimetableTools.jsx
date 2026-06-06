import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2, Loader2, BookOpen, Lightbulb, CheckSquare, Square,
  Calendar, RefreshCw, Star, StarOff, MessageSquare, ChevronDown, ChevronUp, Save, Clock, AlertCircle, History, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StudyPlanCustomizer from './StudyPlanCustomizer';

// ─── Availability check helper ────────────────────────────────────
// Returns { allowed: bool, message: string, lessonPlansBySubject: {} }
function checkAvailability(entries, lessonPlans) {
  // CHECK 1 — timetable entries exist for student's class
  if (!entries || entries.length === 0) {
    return {
      allowed: false,
      message: 'No exam timetable has been created yet. AI Study Plan and AI Exam Tips will be available once your school admin creates an exam timetable.',
    };
  }

  // CHECK 2 — lesson plans exist
  if (!lessonPlans || lessonPlans.length === 0) {
    return {
      allowed: false,
      message: 'AI features cannot be generated yet. Your teachers have not uploaded lesson plans for your subjects. Please check back later.',
    };
  }

  // Group lesson plans by subjectId
  const bySubject = {};
  for (const lp of lessonPlans) {
    if (!bySubject[lp.subjectId]) bySubject[lp.subjectId] = [];
    bySubject[lp.subjectId].push(lp);
  }

  // CHECK 3 — at least one entry's subject has lesson plans
  const coveredSubjectIds = new Set(Object.keys(bySubject));
  const entriesWithPlans = entries.filter(e => coveredSubjectIds.has(e.subjectId));
  if (entriesWithPlans.length === 0) {
    return {
      allowed: false,
      message: 'AI features cannot be generated yet. Your teachers have not uploaded lesson plans for any of your scheduled exam subjects. Please check back later.',
    };
  }

  return { allowed: true, lessonPlansBySubject: bySubject, coveredEntries: entriesWithPlans };
}

// ─── Blocked message UI ───────────────────────────────────────────
function BlockedState({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <p className="font-medium text-foreground">Not Available Yet</p>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

// ─── Build lesson plan context string for AI prompt ───────────────
function buildLessonPlanContext(lessonPlansBySubject, entries) {
  const lines = [];
  for (const entry of entries) {
    const plans = lessonPlansBySubject[entry.subjectId];
    if (!plans?.length) continue;
    lines.push(`\n[${entry.subjectName}] - ${plans.length} lesson plan(s) uploaded by ${[...new Set(plans.map(p => p.teacherName).filter(Boolean))].join(', ') || 'teacher'}:`);
    for (const lp of plans) {
      lines.push(`  • "${lp.title}" (${lp.date || 'date n/a'})`);
      if (lp.objectives?.length) lines.push(`    Objectives: ${lp.objectives.join('; ')}`);
      if (lp.activities?.length) lines.push(`    Topics: ${lp.activities.map(a => a.title).filter(Boolean).join(', ')}`);
      if (lp.notes) lines.push(`    Teacher notes: ${lp.notes}`);
    }
  }
  return lines.join('\n') || 'No lesson plan details available.';
}

// ─── Build grades context string ──────────────────────────────────
function buildGradesContext(grades) {
  if (!grades?.length) return 'No grade data available.';
  const bySubject = {};
  for (const g of grades) {
    if (!bySubject[g.subjectName]) bySubject[g.subjectName] = [];
    bySubject[g.subjectName].push(g);
  }
  return Object.entries(bySubject).map(([subj, gs]) => {
    const avg = gs.reduce((s, g) => s + (g.score / (g.maxScore || 100)) * 100, 0) / gs.length;
    return `${subj}: avg ${avg.toFixed(0)}% (${gs.length} assessments)`;
  }).join(', ');
}

// ─── AI Study Plan ────────────────────────────────────────────────
const DEFAULT_PREFS = {
  specialInstructions: '', preferredTime: '', sessionDuration: '', blockedDays: [],
  intensity: '', subjectPrefs: {}, activities: '', concerns: '', focusTopics: '', medicalConsiderations: ''
};

export function AIStudyPlanGenerator({ entries, grades, lessonPlans, studentId, schoolId, studentName, parentPrompts = [] }) {
  const [hoursPerDay, setHoursPerDay] = useState('3');
  const [savedPlan, setSavedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const availability = checkAvailability(entries, lessonPlans);
  const sessionLabel = `Exam Session — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    loadSavedPlan();
  }, [studentId]);

  async function loadSavedPlan() {
    setLoading(true);
    const plans = await base44.entities.AIStudyPlan.filter({ studentId, schoolId, status: 'active' });
    if (plans?.length > 0) {
      const sorted = [...plans].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setSavedPlan(sorted[0]);
      setPromptHistory(sorted[0].promptHistory || []);
    }
    setLoading(false);
  }

  function buildPrefsContext() {
    const lines = [];
    if (prefs.preferredTime) lines.push(`Preferred study time: ${prefs.preferredTime}`);
    if (prefs.sessionDuration) lines.push(`Session duration preference: ${prefs.sessionDuration}`);
    if (prefs.intensity) lines.push(`Study intensity: ${prefs.intensity}`);
    if (prefs.blockedDays?.length) lines.push(`Days NOT available: ${prefs.blockedDays.join(', ')}`);
    if (prefs.activities) lines.push(`Activities limiting study time: ${prefs.activities}`);
    if (prefs.concerns) lines.push(`Biggest exam concerns: ${prefs.concerns}`);
    if (prefs.focusTopics) lines.push(`Topics to focus on most: ${prefs.focusTopics}`);
    if (prefs.medicalConsiderations) lines.push(`Medical/personal considerations: ${prefs.medicalConsiderations}`);
    if (prefs.specialInstructions) lines.push(`Special instructions: ${prefs.specialInstructions}`);
    // Subject preferences
    const subjectPrefsText = Object.entries(prefs.subjectPrefs || {}).map(([subjId, sp]) => {
      const entry = entries.find(e => e.subjectId === subjId);
      const name = entry?.subjectName || subjId;
      const flags = [sp.extraFocus && 'needs extra focus', sp.difficult && 'student finds difficult', sp.confident && 'student is confident'].filter(Boolean).join(', ');
      return `${name}: ${flags || 'no preference'}${sp.note ? ` — note: ${sp.note}` : ''}`;
    }).join('\n');
    if (subjectPrefsText) lines.push(`Subject-specific preferences:\n${subjectPrefsText}`);
    // Parent prompts
    if (parentPrompts?.length) lines.push(`Parent additional requests:\n${parentPrompts.map(p => `- ${p.text}`).join('\n')}`);
    return lines.join('\n');
  }

  async function generate() {
    if (!availability.allowed) return;
    if (savedPlan) {
      if (!window.confirm('You already have a saved study plan. Generating a new one will replace it. Continue?')) return;
    }
    setGenerating(true);

    const { lessonPlansBySubject, coveredEntries } = availability;
    const lpContext = buildLessonPlanContext(lessonPlansBySubject, coveredEntries);
    const gradeContext = buildGradesContext(grades);
    const examList = coveredEntries.map(e => `${e.subjectName} (${e.dayOfWeek}${e.startTime ? ' at ' + e.startTime : ''})`).join(', ');
    const missingSubjects = entries.filter(e => !lessonPlansBySubject[e.subjectId]).map(e => e.subjectName);
    const prefsContext = buildPrefsContext();

    const prompt = `You are a personalised student study planner. Generate a day-by-day study plan using ONLY the lesson plan content provided below. Do NOT introduce any topic, concept or resource that does not appear in the lesson plans.

Student: ${studentName || 'Student'}
School: ${schoolId}
Available study hours per day: ${hoursPerDay}
Today: ${new Date().toLocaleDateString()}

STUDENT PREFERENCES AND CONSTRAINTS:
${prefsContext || 'No special preferences provided.'}

EXAM TIMETABLE (subjects with lesson plans only):
${examList}

TEACHER LESSON PLANS (use ONLY these topics):
${lpContext}

STUDENT GRADE HISTORY (to prioritise weak areas):
${gradeContext}

${missingSubjects.length ? `NOTE: The following subjects have NO lesson plans and must be EXCLUDED: ${missingSubjects.join(', ')}` : ''}

Generate a 14-day study plan. For each day:
- Respect ALL student preferences and constraints above
- Reference specific topics from the teacher's lesson plans by name
- Prioritise topics where the student has low grades or marked as difficult
- Add a revision day before each exam
- Skip blocked days entirely
- Each task must cite which lesson plan/topic it comes from`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          readinessSummary: { type: 'string' },
          subjectsCovered: { type: 'array', items: { type: 'string' } },
          subjectsExcluded: { type: 'array', items: { type: 'string' } },
          plan: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'number' },
                date: { type: 'string' },
                subject: { type: 'string' },
                topic: { type: 'string' },
                task: { type: 'string' },
                lessonPlanRef: { type: 'string' },
                hours: { type: 'number' },
                priority: { type: 'string' },
              }
            }
          },
          dataSources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                teacherName: { type: 'string' },
                topicsCount: { type: 'number' },
                dateRange: { type: 'string' },
              }
            }
          },
        }
      }
    });

    const newHistoryEntry = { text: prefs.specialInstructions || '(initial generation)', timestamp: new Date().toISOString(), version: (savedPlan?.version || 0) + 1, type: 'generate' };
    const newHistory = [...promptHistory, newHistoryEntry];

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
      hoursPerDay,
      promptHistory: newHistory,
      studyPrefs: prefs,
    });

    setSavedPlan(newPlan);
    setPromptHistory(newHistory);
    setGenerating(false);
    toast.success('Study plan generated and saved!');
  }

  async function refine() {
    if (!savedPlan || !refineText.trim()) return;
    setRefining(true);
    const currentPlan = JSON.stringify(savedPlan.planContent?.plan || []);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are updating an existing student study plan based on a new request.

Current plan (JSON):
${currentPlan}

Student request: "${refineText}"

Apply ONLY the requested changes. Keep unchanged days identical. Return the full updated plan in the same format.`,
      response_json_schema: {
        type: 'object',
        properties: {
          readinessSummary: { type: 'string' },
          subjectsCovered: { type: 'array', items: { type: 'string' } },
          subjectsExcluded: { type: 'array', items: { type: 'string' } },
          changesSummary: { type: 'string', description: 'Brief summary of what changed, e.g. "Moved 3 Mathematics sessions to mornings"' },
          plan: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'number' }, date: { type: 'string' }, subject: { type: 'string' },
                topic: { type: 'string' }, task: { type: 'string' }, lessonPlanRef: { type: 'string' },
                hours: { type: 'number' }, priority: { type: 'string' },
              }
            }
          },
          dataSources: { type: 'array', items: { type: 'object' } },
        }
      }
    });

    const newHistoryEntry = { text: refineText, timestamp: new Date().toISOString(), version: savedPlan.version, type: 'refine', changesSummary: res?.changesSummary };
    const newHistory = [...promptHistory, newHistoryEntry];

    await base44.entities.AIStudyPlan.update(savedPlan.id, {
      planContent: res,
      promptHistory: newHistory,
    });
    setSavedPlan(prev => ({ ...prev, planContent: res }));
    setPromptHistory(newHistory);
    toast.success(res?.changesSummary || 'Study plan updated!');
    setRefineText('');
    setRefining(false);
  }

  async function toggleComplete(idx) {
    if (!savedPlan) return;
    const newProgress = { ...(savedPlan.progress || {}), [idx]: !(savedPlan.progress?.[idx]) };
    const total = savedPlan.planContent?.plan?.length || 0;
    const done = Object.values(newProgress).filter(Boolean).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    setSavedPlan(prev => ({ ...prev, progress: newProgress, completionPercentage: pct }));
    setSavingProgress(true);
    await base44.entities.AIStudyPlan.update(savedPlan.id, { progress: newProgress, completionPercentage: pct });
    setSavingProgress(false);
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!availability.allowed) return <BlockedState message={availability.message} />;

  const plan = savedPlan?.planContent;
  const progress = savedPlan?.progress || {};
  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalTasks = plan?.plan?.length || 0;
  const completionPct = savedPlan?.completionPercentage || 0;

  // Subjects missing lesson plans — show warning
  const { lessonPlansBySubject, coveredEntries } = availability;
  const missingSubjects = entries.filter(e => !lessonPlansBySubject[e.subjectId]).map(e => e.subjectName);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" />AI Study Plan</h3>
          <p className="text-sm text-muted-foreground">Generated from your teachers' lesson plans</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
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

      {/* Customizer panel */}
      <StudyPlanCustomizer entries={entries} prefs={prefs} onChange={setPrefs} />

      {/* Parent prompts notice */}
      {parentPrompts?.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Your parent has added {parentPrompts.length} preference{parentPrompts.length !== 1 ? 's' : ''} to your study plan: <em>{parentPrompts.map(p => p.text).join('; ')}</em></span>
        </div>
      )}

      {/* Missing lesson plans warning */}
      {missingSubjects.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Study plan covers <strong>{coveredEntries.length}</strong> of <strong>{entries.length}</strong> subjects. <strong>{missingSubjects.join(', ')}</strong> {missingSubjects.length === 1 ? 'has' : 'have'} no lesson plans uploaded yet and will be excluded.</span>
        </div>
      )}

      {/* Saved banner */}
      {savedPlan && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>📅 Saved on {savedPlan.created_date ? format(new Date(savedPlan.created_date), 'MMM d, yyyy \'at\' h:mm a') : '—'} · {savedPlan.sessionLabel}</span>
          <span className="ml-auto flex items-center gap-1 text-emerald-600">
            {savingProgress ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : <><Clock className="w-3 h-3" />Auto-saved</>}
          </span>
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

          {/* Sessions */}
          <div className="space-y-2">
            {plan.plan?.map((item, i) => {
              const done = !!progress[i];
              return (
                <div key={i}
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
                    {item.topic && <p className="text-xs font-medium text-primary mt-0.5">📖 {item.topic}</p>}
                    <p className={`text-sm mt-0.5 ${done ? 'line-through text-muted-foreground' : ''}`}>{item.task}</p>
                    {item.lessonPlanRef && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.lessonPlanRef}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data sources */}
          {plan.dataSources?.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wide">Data Sources Used</h4>
              <ul className="space-y-1">
                {plan.dataSources.map((src, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span>📚</span>
                    <span><strong>{src.subject}</strong> — {src.teacherName}'s lesson plans · {src.topicsCount} topics · {src.dateRange}</span>
                  </li>
                ))}
              </ul>
              {grades?.length > 0 && <p className="text-xs text-slate-500 mt-2">Priority levels based on grade data from this school.</p>}
            </div>
          )}
        </div>
      )}

      {/* Refine My Study Plan */}
      {savedPlan && (
        <div className="border rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" />Refine My Study Plan</h4>
          <p className="text-xs text-muted-foreground">Type a follow-up request to update the plan without regenerating from scratch.</p>
          <div className="flex gap-2">
            <textarea
              className="flex-1 border rounded-lg p-2 text-xs resize-none min-h-[56px] focus:outline-none focus:ring-1 focus:ring-ring bg-background"
              placeholder={`e.g. Move all Mathematics sessions to mornings\nAdd more revision time before the Physics exam\nI finished all Chemistry topics, remove them\nAdd a full revision day before each exam`}
              value={refineText}
              onChange={e => setRefineText(e.target.value)}
            />
            <Button size="sm" className="self-end gap-1.5" onClick={refine} disabled={refining || !refineText.trim()}>
              {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {refining ? 'Updating…' : 'Update Plan'}
            </Button>
          </div>
        </div>
      )}

      {/* Prompt History */}
      {promptHistory.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button className="w-full flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 text-left transition-colors"
            onClick={() => setShowHistory(h => !h)}>
            <History className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">Prompt History ({promptHistory.length})</span>
            {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showHistory && (
            <div className="p-3 space-y-2">
              {[...promptHistory].reverse().map((h, i) => (
                <div key={i} className="p-2.5 border rounded-lg bg-card text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={h.type === 'refine' ? 'secondary' : 'default'} className="text-xs">{h.type === 'refine' ? 'Refinement' : 'Generation'}</Badge>
                    <span className="text-muted-foreground">{h.timestamp ? format(new Date(h.timestamp), 'MMM d, yyyy h:mm a') : ''}</span>
                    {h.version && <span className="text-muted-foreground">v{h.version}</span>}
                  </div>
                  <p className="text-foreground">{h.text}</p>
                  {h.changesSummary && <p className="text-primary italic">AI: {h.changesSummary}</p>}
                  <button className="text-primary hover:underline text-xs" onClick={() => setRefineText(h.text)}>Use This Prompt Again</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!savedPlan && !generating && (
        <div className="text-center py-10 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No study plan yet. Click "Generate Plan" to create your personalised study schedule from your teachers' lesson plans.</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Exam Tips ─────────────────────────────────────────────────
export function AIExamPreparationTips({ entries, grades, lessonPlans, studentId, schoolId, studentName }) {
  const [savedTips, setSavedTips] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [notes, setNotes] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const availability = checkAvailability(entries, lessonPlans);
  const sessionLabel = `Exam Session — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
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
    if (!availability.allowed) return;
    if (savedTips) {
      if (!window.confirm('Regenerate AI tips? This will replace your current saved tips.')) return;
    }
    setGenerating(true);

    const { lessonPlansBySubject, coveredEntries } = availability;
    const lpContext = buildLessonPlanContext(lessonPlansBySubject, coveredEntries);
    const gradeContext = buildGradesContext(grades);
    const missingSubjects = entries.filter(e => !lessonPlansBySubject[e.subjectId]).map(e => e.subjectName);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a student exam preparation coach. Generate exam tips using ONLY the teacher lesson plan content below. Do NOT introduce any topic or concept not present in the lesson plans.

Student: ${studentName || 'Student'}
School: ${schoolId}
Today: ${new Date().toLocaleDateString()}

TEACHER LESSON PLANS (use ONLY these for tip content):
${lpContext}

STUDENT GRADE HISTORY (use to prioritise weak areas):
${gradeContext}

${missingSubjects.length ? `NOTE: Exclude these subjects — no lesson plans: ${missingSubjects.join(', ')}` : ''}

For each subject with lesson plans, generate tips that:
- Reference specific topics by name from the lesson plans
- Prioritise topics where student scored low
- Include learning objectives from the lesson plans
- Each tip must cite its source lesson plan/topic`,
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
                teacherName: { type: 'string' },
                topicsCovered: { type: 'number' },
                studyStrategies: { type: 'array', items: { type: 'string' } },
                focusTopics: { type: 'array', items: { type: 'string' } },
                commonMistakes: { type: 'array', items: { type: 'string' } },
                examDayTip: { type: 'string' },
                sourceNote: { type: 'string', description: 'e.g. Based on 5 lesson plans by Mr. Smith covering Jan–May 2026' },
              }
            }
          },
          generalWellnessTips: { type: 'array', items: { type: 'string' } },
          subjectsExcluded: { type: 'array', items: { type: 'string' } },
        }
      }
    });

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

  async function toggleHighlight(key) {
    if (!savedTips) return;
    const newHL = { ...(savedTips.highlightedTips || {}), [key]: !(savedTips.highlightedTips?.[key]) };
    setSavedTips(prev => ({ ...prev, highlightedTips: newHL }));
    await base44.entities.AIExamTips.update(savedTips.id, { highlightedTips: newHL });
  }

  async function saveNote(key) {
    if (!savedTips) return;
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

  if (!availability.allowed) return <BlockedState message={availability.message} />;

  const tipsData = savedTips?.tipsContent;
  const highlighted = savedTips?.highlightedTips || {};

  // Missing subjects
  const { lessonPlansBySubject, coveredEntries } = availability;
  const missingSubjects = entries.filter(e => !lessonPlansBySubject[e.subjectId]).map(e => e.subjectName);

  function TipItem({ tip, tipKey }) {
    const hl = highlighted[tipKey];
    const note = notes[tipKey];
    const isEditing = editingNote === tipKey;
    return (
      <li className={`rounded-lg p-2 text-sm flex items-start gap-2 group ${hl ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-muted/30'}`}>
        <div className="flex-1">
          <span>{tip}</span>
          {note && <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 italic">📝 {note}</p>}
          {isEditing && (
            <div className="flex gap-2 mt-2">
              <input autoFocus className="flex-1 text-xs border rounded px-2 py-1" value={noteInput}
                onChange={e => setNoteInput(e.target.value)} placeholder="Add your note…"
                onKeyDown={e => e.key === 'Enter' && saveNote(tipKey)} />
              <button onClick={() => saveNote(tipKey)} disabled={savingNote} className="text-xs text-primary hover:underline">{savingNote ? '…' : 'Save'}</button>
              <button onClick={() => setEditingNote(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => toggleHighlight(tipKey)} title={hl ? 'Remove highlight' : 'Highlight'}>
            {hl ? <Star className="w-3.5 h-3.5 text-yellow-500" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={() => { setEditingNote(tipKey); setNoteInput(notes[tipKey] || ''); }} title="Add note">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" />AI Exam Preparation Tips</h3>
          <p className="text-sm text-muted-foreground">Generated from your teachers' lesson plans only</p>
        </div>
        <Button onClick={getTips} disabled={generating} size="sm" className="h-7 gap-1.5 text-xs">
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : savedTips ? <RefreshCw className="w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
          {generating ? 'Generating…' : savedTips ? 'Regenerate' : 'Get AI Tips'}
        </Button>
      </div>

      {/* Missing lesson plans warning */}
      {missingSubjects.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Tips cover <strong>{coveredEntries.length}</strong> of <strong>{entries.length}</strong> subjects. <strong>{missingSubjects.join(', ')}</strong> {missingSubjects.length === 1 ? 'has' : 'have'} no lesson plans and will be excluded.</span>
        </div>
      )}

      {/* Saved banner */}
      {savedTips && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>💡 Saved on {savedTips.created_date ? format(new Date(savedTips.created_date), 'MMM d, yyyy \'at\' h:mm a') : '—'} · {savedTips.sessionLabel}</span>
          <span className="ml-auto flex items-center gap-1 text-emerald-600"><Clock className="w-3 h-3" />Auto-saved</span>
        </div>
      )}

      {!savedTips && !generating && (
        <div className="text-center py-10 text-muted-foreground">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No tips saved yet. Click "Get AI Tips" to generate personalised exam tips from your teachers' lesson plans.</p>
        </div>
      )}

      {tipsData && (
        <div className="space-y-3">
          {/* Excluded subjects notice */}
          {tipsData.subjectsExcluded?.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              ⚠️ Tips not available for: <strong>{tipsData.subjectsExcluded.join(', ')}</strong> — ask your teacher to upload lesson plans for these subjects.
            </div>
          )}

          {tipsData.subjectTips?.map((s, si) => {
            const isOpen = expanded[si] !== false;
            return (
              <Card key={si} className="border shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(prev => ({ ...prev, [si]: !isOpen }))}
                >
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold flex-1">{s.subject}</span>
                  {s.teacherName && <span className="text-xs text-muted-foreground hidden sm:block">{s.teacherName}</span>}
                  <Badge variant={s.urgency === 'high' ? 'destructive' : s.urgency === 'medium' ? 'secondary' : 'outline'} className="text-xs">{s.urgency}</Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    {/* Source note */}
                    {s.sourceNote && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">{s.sourceNote}</p>
                    )}

                    {s.studyStrategies?.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">STUDY STRATEGIES</p>
                        <ul className="space-y-1.5">
                          {s.studyStrategies.map((tip, ti) => (
                            <TipItem key={ti} tip={tip} tipKey={`${si}-s${ti}`} />
                          ))}
                        </ul>
                      </div>
                    )}

                    {s.focusTopics?.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">FOCUS TOPICS (from lesson plans)</p>
                        <ul className="space-y-1.5">
                          {s.focusTopics.map((tip, ti) => (
                            <li key={ti} className="text-sm flex items-start gap-2 p-1.5 hover:bg-muted/30 rounded-lg">
                              <span className="text-emerald-500 shrink-0">✓</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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