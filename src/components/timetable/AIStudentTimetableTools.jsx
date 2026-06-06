import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2, BookOpen, Lightbulb, CheckSquare, Square, Calendar } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── AI Study Plan Generator ─────────────────────────────────────
export function AIStudyPlanGenerator({ entries, grades, studentName }) {
  const [studyHours, setStudyHours] = useState('afternoon');
  const [hoursPerDay, setHoursPerDay] = useState('3');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState({});

  async function generate() {
    setLoading(true);
    setPlan(null);

    const examList = entries.map(e => `${e.subjectName} (${e.dayOfWeek}${e.startTime ? ' at ' + e.startTime : ''})`).join(', ');
    const gradeContext = grades?.length
      ? grades.slice(0, 20).map(g => `${g.subjectName}: ${g.score}/${g.maxScore}`).join(', ')
      : 'No grade history available';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a personalised student study planner. Create a day-by-day study plan for a student.

Student: ${studentName || 'Student'}
Upcoming exams: ${examList || 'No exams scheduled yet'}
Historical performance: ${gradeContext}
Preferred study time: ${studyHours}
Study hours available per day: ${hoursPerDay} hours
Today: ${new Date().toLocaleDateString()}

Generate a practical, realistic study plan for the next 14 days covering all exam subjects.
Prioritise subjects where the student has historically lower scores.
Include revision days the day before each exam.
Include rest recommendations.`,
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
                color: { type: 'string' },
              }
            }
          },
          generalTips: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    setPlan(res);
    setLoading(false);
  }

  const completedCount = Object.values(completed).filter(Boolean).length;
  const totalTasks = plan?.plan?.length || 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" />AI Study Plan</h3>
        <p className="text-sm text-muted-foreground">Personalised day-by-day study schedule based on your exams and performance</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Preferred study time</p>
          <Select value={studyHours} onValueChange={setStudyHours}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="any">Any time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Hours/day available</p>
          <Select value={hoursPerDay} onValueChange={setHoursPerDay}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="3">3 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="5">5+ hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generate} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {loading ? 'Generating…' : 'Generate Study Plan'}
        </Button>
      </div>

      {plan && (
        <div className="space-y-4">
          {plan.readinessSummary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{plan.readinessSummary}</div>
          )}

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Study Progress</span>
                <span>{completedCount}/{totalTasks} sessions</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(completedCount / totalTasks) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Daily plan */}
          <div className="space-y-2">
            {plan.plan?.map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-opacity ${completed[i] ? 'opacity-50' : ''}`}
                style={{ borderLeftColor: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#10b981', borderLeftWidth: 3 }}>
                <button onClick={() => setCompleted(prev => ({ ...prev, [i]: !prev[i] }))} className="mt-0.5 shrink-0">
                  {completed[i] ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Day {item.day}</span>
                    {item.date && <span className="text-xs font-medium">{item.date}</span>}
                    <Badge variant="outline" className="text-xs">{item.subject}</Badge>
                    <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">{item.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{item.hours}h</span>
                  </div>
                  <p className="text-sm mt-0.5">{item.task}</p>
                </div>
              </div>
            ))}
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
    </div>
  );
}

// ─── AI Exam Preparation Tips ────────────────────────────────────
export function AIExamPreparationTips({ entries }) {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);

  async function getTips() {
    setLoading(true);
    const examList = entries.map(e => {
      const daysLeft = 'upcoming';
      return `${e.subjectName} on ${e.dayOfWeek}${e.startTime ? ' at ' + e.startTime : ''}`;
    }).join('; ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a student exam preparation coach. Provide subject-specific preparation tips.

Upcoming exams: ${examList || 'No exams yet'}
Today: ${new Date().toLocaleDateString()}

For each upcoming exam subject, provide:
1. Subject-specific study strategies
2. Important topics to focus on for that subject type
3. Common mistakes students make in that subject
4. Time management tips for the actual exam
5. How urgent the preparation is based on when the exam is

Keep tips practical, encouraging, and specific.`,
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

    setTips(res);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" />AI Exam Preparation Tips</h3>
          <p className="text-sm text-muted-foreground">Personalised tips for each of your upcoming exams</p>
        </div>
        <Button onClick={getTips} disabled={loading || entries.length === 0} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {loading ? 'Loading…' : 'Get Tips'}
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No upcoming exams in your timetable yet.</p>
      )}

      {tips && (
        <div className="space-y-4">
          {tips.subjectTips?.map((s, i) => (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{s.subject}</span>
                  <Badge variant={s.urgency === 'high' ? 'destructive' : s.urgency === 'medium' ? 'secondary' : 'outline'} className="text-xs ml-auto">{s.urgency} urgency</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {s.studyStrategies?.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">STUDY STRATEGIES</p>
                      <ul className="space-y-1">{s.studyStrategies.map((t, j) => <li key={j} className="flex items-start gap-1.5"><span className="text-primary">•</span>{t}</li>)}</ul>
                    </div>
                  )}
                  {s.focusTopics?.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">FOCUS TOPICS</p>
                      <ul className="space-y-1">{s.focusTopics.map((t, j) => <li key={j} className="flex items-start gap-1.5"><span className="text-emerald-500">✓</span>{t}</li>)}</ul>
                    </div>
                  )}
                  {s.commonMistakes?.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">AVOID THESE MISTAKES</p>
                      <ul className="space-y-1">{s.commonMistakes.map((t, j) => <li key={j} className="flex items-start gap-1.5"><span className="text-red-400">✗</span>{t}</li>)}</ul>
                    </div>
                  )}
                  {s.examDayTip && (
                    <div className="sm:col-span-2 p-2 bg-amber-50 rounded-lg">
                      <p className="font-medium text-xs text-amber-700 mb-1">EXAM DAY TIP</p>
                      <p className="text-amber-800">{s.examDayTip}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {tips.generalWellnessTips?.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="font-semibold text-emerald-800 text-sm mb-2">Wellness During Exam Period</h4>
              <ul className="space-y-1">
                {tips.generalWellnessTips.map((tip, i) => (
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