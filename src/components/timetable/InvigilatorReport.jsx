import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { base44 } from '@/api/base44Client';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

function getDuties(entries, teachers) {
  const map = {};
  for (const t of teachers) map[t.id] = { teacher: t, duties: [] };
  for (const entry of entries) {
    const invs = entry.invigilators?.length
      ? entry.invigilators
      : entry.invigilatorId ? [{ teacherId: entry.invigilatorId, teacherName: entry.invigilatorName, role: 'primary', confirmed: false }] : [];
    for (const inv of invs) {
      if (map[inv.teacherId]) {
        map[inv.teacherId].duties.push({ ...entry, role: inv.role, confirmed: inv.confirmed });
      }
    }
  }
  return Object.values(map);
}

export default function InvigilatorReport({ entries = [], teachers = [], onAutoAssign }) {
  const [autoAssigning, setAutoAssigning] = useState(false);

  const duties = useMemo(() => getDuties(entries, teachers), [entries, teachers]);
  const unassigned = entries.filter(e => !e.invigilatorId && !(e.invigilators?.length));
  const totalDuties = duties.reduce((s, d) => s + d.duties.length, 0);
  const confirmed = duties.reduce((s, d) => s + d.duties.filter(du => du.confirmed).length, 0);
  const confirmRate = totalDuties > 0 ? Math.round((confirmed / totalDuties) * 100) : 0;

  const chartData = duties
    .filter(d => d.duties.length > 0)
    .sort((a, b) => b.duties.length - a.duties.length)
    .map(d => ({ name: d.teacher.fullName?.split(' ').slice(-1)[0] || '', full: d.teacher.fullName, count: d.duties.length }));

  const avg = chartData.length > 0 ? totalDuties / chartData.length : 0;

  // Balance score: lower stddev = higher score
  const variance = chartData.length > 1
    ? chartData.reduce((s, d) => s + Math.pow(d.count - avg, 2), 0) / chartData.length : 0;
  const balanceScore = Math.max(0, Math.round(100 - Math.sqrt(variance) * 15));

  async function handleAutoAssign() {
    setAutoAssigning(true);
    const teacherList = teachers.map(t => `- ${t.fullName} (id: ${t.id})`).join('\n');
    const examList = entries.map(e => `Entry id: ${e.id}, Subject: ${e.subjectName}, Date: ${e.date}, Time: ${e.startTime}–${e.endTime}`).join('\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are helping auto-assign invigilators to school exams.

Teachers:
${teacherList}

Exam entries:
${examList}

Rules:
1. Distribute duties as evenly as possible across all teachers
2. Avoid assigning a teacher to two exams at the same time on the same date
3. Aim for each exam to have at least 1 invigilator

Return assignments for ALL entries.`,
      response_json_schema: {
        type: 'object',
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entryId: { type: 'string' },
                teacherId: { type: 'string' },
                teacherName: { type: 'string' },
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    setAutoAssigning(false);
    if (res?.assignments?.length) {
      onAutoAssign(res.assignments, res.summary || `AI assigned invigilators to ${res.assignments.length} exams.`);
    } else {
      toast.error('AI could not generate assignments. Try again.');
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Duties', val: totalDuties, color: 'text-primary' },
          { label: 'Unassigned Exams', val: unassigned.length, color: unassigned.length > 0 ? 'text-destructive' : 'text-emerald-600' },
          { label: 'Confirmation Rate', val: `${confirmRate}%`, color: confirmRate === 100 ? 'text-emerald-600' : 'text-amber-600' },
          { label: 'Balance Score', val: `${balanceScore}%`, color: balanceScore >= 80 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Auto-assign button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleAutoAssign} disabled={autoAssigning} className="gap-2">
          {autoAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          AI Auto-Assign All Invigilators
        </Button>
        <p className="text-xs text-muted-foreground">Automatically distributes duties fairly across all teachers, avoiding conflicts.</p>
      </div>

      {/* Unassigned exams */}
      {unassigned.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-700 text-sm mb-2">⚠️ {unassigned.length} exam{unassigned.length !== 1 ? 's' : ''} without an invigilator</p>
          <ul className="space-y-1">
            {unassigned.map((e, i) => (
              <li key={i} className="text-xs text-red-600">• {e.subjectName} — {e.date} {e.startTime && `at ${e.startTime}`} {(e.classNames || []).join(', ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Workload bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-3">Duties Per Teacher</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(val, _, props) => [val, props.payload.full]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.count > avg * 1.5 ? '#ef4444' : d.count < avg * 0.5 ? '#f59e0b' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">Average: {avg.toFixed(1)} duties per teacher · Purple = balanced · Red = high · Amber = low</p>
          </CardContent>
        </Card>
      )}

      {/* Per-teacher duty list */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">All Teacher Assignments</h4>
        {duties.filter(d => d.duties.length > 0).sort((a, b) => b.duties.length - a.duties.length).map(({ teacher, duties: duts }) => {
          const confirmedCount = duts.filter(d => d.confirmed).length;
          return (
            <Card key={teacher.id} className="border shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-sm flex-1">{teacher.fullName}</span>
                  <Badge variant="secondary">{duts.length} {duts.length === 1 ? 'duty' : 'duties'}</Badge>
                  <Badge className={confirmedCount === duts.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {confirmedCount}/{duts.length} confirmed
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {duts.map((d, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {d.subjectName} {d.date} {d.startTime}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {duties.filter(d => d.duties.length === 0).length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {duties.filter(d => d.duties.length === 0).length} teacher(s) have no duties assigned yet.
          </p>
        )}
      </div>
    </div>
  );
}