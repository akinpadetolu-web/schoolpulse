import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

// Floating chat button + panel for any user type
export function AITimetableChatbot({ entries, userRole, userName, subjects, grades }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: getRoleGreeting(userRole, userName) }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function getRoleGreeting(role, name) {
    const greetings = {
      admin: `Hi! I'm your AI Timetable Assistant. I can help you analyse the timetable, find conflicts, answer questions about schedules, and more. What would you like to know?`,
      teacher: `Hello ${name || ''}! I can help you find your invigilation duties, check your schedule, and answer questions about your classes. What would you like to know?`,
      student: `Hi ${name || ''}! I can help you with your exam schedule, study tips, countdown to exams, and more. What would you like to ask?`,
      parent: `Hello ${name || ''}! I can help you understand your child's exam schedule, readiness, and how to support them. What would you like to know?`,
    };
    return greetings[role] || 'Hi! How can I help you with the timetable?';
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const context = `
Role: ${userRole}
User name: ${userName || 'Unknown'}
Timetable entries (${entries.length} total): ${JSON.stringify(entries.slice(0, 30))}
${grades ? `Recent grades: ${JSON.stringify(grades.slice(0, 10))}` : ''}
Today's date: ${new Date().toLocaleDateString()}
`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful school timetable AI assistant for a ${userRole}. 
Answer the following question based on the timetable data provided.
Be concise, friendly, and specific. Format dates and times clearly.
If asked to make changes, explain what changes you'd recommend (you cannot directly edit the database).

Context:
${context}

Question: ${userMsg}`,
      response_json_schema: { type: 'object', properties: { answer: { type: 'string' } } }
    });

    setMessages(prev => [...prev, { role: 'assistant', text: res?.answer || 'I couldn\'t process that. Please try again.' }]);
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        title="AI Timetable Assistant"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: 420 }}>
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            <span className="font-semibold text-sm">AI Timetable Assistant</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-xl px-3 py-2 text-sm max-w-[90%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div>
              </div>
            )}
          </div>
          <div className="p-2 border-t flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 px-3" onClick={send} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '→'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Admin: AI Generator Panel ────────────────────────────────────
export function AIExamTimetableGenerator({ classes, subjects, onApply }) {
  const [form, setForm] = useState({
    examDays: 10,
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '16:00',
    maxExamsPerDay: 2,
    examDurationMinutes: 120,
    breakDays: '',
    conflictSubjects: '',
    fixedSlots: '',
    venues: 'Hall A, Hall B, Lab 1',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setResult(null);
    const subjectList = subjects.map(s => s.name).join(', ');
    const classList = classes.map(c => c.className).join(', ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert school exam timetable scheduler. 
Generate a complete, conflict-free exam timetable based on these requirements:

- Exam period: ${form.startDate || 'starting soon'} to ${form.endDate || `${form.examDays} days`}
- Subjects: ${subjectList}
- Classes/Grades: ${classList}
- Available venues: ${form.venues}
- Exam hours: ${form.startTime} to ${form.endTime}
- Max exams per class per day: ${form.maxExamsPerDay}
- Exam duration: ${form.examDurationMinutes} minutes each
- Break/rest days (no exams): ${form.breakDays || 'none'}
- Subjects that MUST NOT be on the same day: ${form.conflictSubjects || 'none specified'}
- Fixed slots: ${form.fixedSlots || 'none'}

Rules to follow:
1. No class has more than ${form.maxExamsPerDay} exams per day
2. No two exams for the same class clash at the same time
3. No venue is double-booked
4. Mathematics, Physics, Chemistry (high difficulty) should NOT be on consecutive days for the same class
5. Space difficult subjects apart - at least 1 day gap
6. Students need at least 1 free day per 3 exam days

Return a JSON timetable schedule.`,
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
              }
            }
          },
          summary: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    setResult(res);
    setLoading(false);
  }

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><p className="text-xs text-muted-foreground mb-1">Exam Days</p><Input type="number" value={form.examDays} onChange={e => upd('examDays', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">Start Date</p><Input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">End Date</p><Input type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">Exam Start Time</p><Input type="time" value={form.startTime} onChange={e => upd('startTime', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">Exam End Time</p><Input type="time" value={form.endTime} onChange={e => upd('endTime', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">Duration (mins)</p><Input type="number" value={form.examDurationMinutes} onChange={e => upd('examDurationMinutes', e.target.value)} className="h-8 text-sm" /></div>
        <div><p className="text-xs text-muted-foreground mb-1">Max Exams/Class/Day</p><Input type="number" value={form.maxExamsPerDay} onChange={e => upd('maxExamsPerDay', e.target.value)} className="h-8 text-sm" /></div>
        <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Available Venues (comma-separated)</p><Input value={form.venues} onChange={e => upd('venues', e.target.value)} className="h-8 text-sm" /></div>
        <div className="col-span-3"><p className="text-xs text-muted-foreground mb-1">Rest/Break Days (e.g. "June 14, June 21")</p><Input value={form.breakDays} onChange={e => upd('breakDays', e.target.value)} placeholder="Leave blank if none" className="h-8 text-sm" /></div>
        <div className="col-span-3"><p className="text-xs text-muted-foreground mb-1">Subjects that must NOT be on the same day (e.g. "Mathematics & Physics")</p><Input value={form.conflictSubjects} onChange={e => upd('conflictSubjects', e.target.value)} placeholder="Optional" className="h-8 text-sm" /></div>
        <div className="col-span-3"><p className="text-xs text-muted-foreground mb-1">Fixed slots (e.g. "Mathematics on June 10, English on June 12")</p><Input value={form.fixedSlots} onChange={e => upd('fixedSlots', e.target.value)} placeholder="Optional" className="h-8 text-sm" /></div>
      </div>

      <Button onClick={generate} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? 'Generating AI Timetable…' : 'Generate Timetable with AI'}
      </Button>

      {result && (
        <div className="space-y-4">
          {result.summary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{result.summary}</div>
          )}
          {result.warnings?.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{w}</div>
              ))}
            </div>
          )}
          {result.timetable?.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>{['Day','Date','Class','Subject','Time','Venue'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {result.timetable.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                      <td className="px-3 py-2">{row.day}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{row.className}</Badge></td>
                      <td className="px-3 py-2 font-medium">{row.subject}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.startTime}–{row.endTime}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.venue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={generate} className="gap-2"><RefreshCw className="w-4 h-4" />Regenerate</Button>
            <Button onClick={() => { onApply && onApply(result.timetable); toast.success('Timetable preview applied — review and save manually'); }} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />Accept Timetable
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin: AI Insights Tab ──────────────────────────────────────
export function AITimetableInsights({ entries, subjects, teachers, classes }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  async function analyse() {
    setLoading(true);
    setInsights(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert school timetable analyser. Analyse this timetable and provide detailed insights.

Timetable data: ${JSON.stringify(entries.slice(0, 50))}
Total entries: ${entries.length}
Classes: ${classes.map(c => c.className).join(', ')}
Subjects: ${subjects.map(s => s.name).join(', ')}
Teachers: ${teachers.map(t => t.fullName).join(', ')}

Provide:
1. An overall timetable health score out of 100 with explanation
2. Student workload distribution score out of 100
3. Venue/resource utilisation score out of 100  
4. Teacher load balance score out of 100
5. 3-5 specific improvement recommendations with actionable fixes
6. Subject difficulty balance analysis (identify high/medium/low difficulty subjects and whether they're well-spaced)
7. Any conflicts or problems detected`,
      response_json_schema: {
        type: 'object',
        properties: {
          healthScore: { type: 'number' },
          healthNote: { type: 'string' },
          workloadScore: { type: 'number' },
          workloadNote: { type: 'string' },
          venueScore: { type: 'number' },
          venueNote: { type: 'string' },
          teacherLoadScore: { type: 'number' },
          teacherLoadNote: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, fix: { type: 'string' }, priority: { type: 'string' } } } },
          difficultyAnalysis: { type: 'string' },
          conflicts: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    setInsights(res);
    setLoading(false);
  }

  function ScoreCard({ label, score, note, color }) {
    const scoreNum = Math.round(score || 0);
    const bg = scoreNum >= 80 ? 'bg-emerald-50 border-emerald-200' : scoreNum >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
    const text = scoreNum >= 80 ? 'text-emerald-700' : scoreNum >= 60 ? 'text-amber-700' : 'text-red-700';
    return (
      <div className={`border rounded-xl p-4 ${bg}`}>
        <div className={`text-3xl font-black ${text}`}>{scoreNum}<span className="text-lg font-medium">/100</span></div>
        <div className="font-semibold text-sm mt-1">{label}</div>
        {note && <div className={`text-xs mt-1 ${text} opacity-80`}>{note}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Timetable Insights</h3>
          <p className="text-sm text-muted-foreground">AI analysis of your current timetable structure</p>
        </div>
        <Button onClick={analyse} disabled={loading || entries.length === 0} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Analysing…' : 'Analyse Timetable'}
        </Button>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">Add timetable entries first to get AI insights.</div>
      )}

      {insights && (
        <div className="space-y-5">
          {/* Score cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScoreCard label="Overall Health" score={insights.healthScore} note={insights.healthNote} />
            <ScoreCard label="Student Workload" score={insights.workloadScore} note={insights.workloadNote} />
            <ScoreCard label="Venue Utilisation" score={insights.venueScore} note={insights.venueNote} />
            <ScoreCard label="Teacher Balance" score={insights.teacherLoadScore} note={insights.teacherLoadNote} />
          </div>

          {/* Conflicts */}
          {insights.conflicts?.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <h4 className="font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Conflicts Detected</h4>
              {insights.conflicts.map((c, i) => <p key={i} className="text-sm text-red-600">{c}</p>)}
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">AI Recommendations</h4>
              <div className="space-y-3">
                {insights.recommendations.map((r, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={r.priority === 'high' ? 'destructive' : r.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs">{r.priority || 'info'}</Badge>
                          </div>
                          <p className="font-medium text-sm">{r.issue}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.fix}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty analysis */}
          {insights.difficultyAnalysis && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-semibold text-blue-800 mb-2">Subject Difficulty Balance</h4>
              <p className="text-sm text-blue-700">{insights.difficultyAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin: Performance Predictions ─────────────────────────────
export function AIPerformancePrediction({ entries, subjects, classes, grades }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  async function predict() {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert school performance analyst. Based on the historical grade data and upcoming exam timetable, predict exam performance.

Timetable entries: ${JSON.stringify(entries.slice(0, 30))}
Historical grades (recent): ${JSON.stringify((grades || []).slice(0, 50))}
Subjects: ${subjects.map(s => s.name).join(', ')}
Classes: ${classes.map(c => c.className).join(', ')}

Provide:
1. Predicted pass rate (%) for each subject based on historical performance
2. Classes likely to underperform and why
3. Overall school predicted performance
4. Key recommendations for admin`,
      response_json_schema: {
        type: 'object',
        properties: {
          subjectPredictions: { type: 'array', items: { type: 'object', properties: { subject: { type: 'string' }, predictedPassRate: { type: 'number' }, risk: { type: 'string' }, note: { type: 'string' } } } },
          atRiskClasses: { type: 'array', items: { type: 'object', properties: { className: { type: 'string' }, concern: { type: 'string' } } } },
          overallPrediction: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'string' } },
        }
      }
    });
    setPredictions(res);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Performance Predictions</h3>
          <p className="text-sm text-muted-foreground">Based on historical grade data</p>
        </div>
        <Button onClick={predict} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Analysing…' : 'Predict Performance'}
        </Button>
      </div>

      {predictions && (
        <div className="space-y-4">
          {predictions.overallPrediction && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">{predictions.overallPrediction}</div>
          )}
          {predictions.subjectPredictions?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Predicted Pass Rates by Subject</h4>
              <div className="space-y-2">
                {predictions.subjectPredictions.map((s, i) => {
                  const rate = Math.round(s.predictedPassRate || 0);
                  const barColor = rate >= 70 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm w-32 shrink-0">{s.subject}</span>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">{rate}%</span>
                      <Badge variant={s.risk === 'high' ? 'destructive' : s.risk === 'medium' ? 'secondary' : 'outline'} className="text-xs w-16 justify-center">{s.risk}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {predictions.atRiskClasses?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <h4 className="font-semibold text-amber-800">At-Risk Classes</h4>
              {predictions.atRiskClasses.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>{c.className}:</strong> {c.concern}</span>
                </div>
              ))}
            </div>
          )}
          {predictions.recommendations?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {predictions.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}