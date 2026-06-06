import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, TrendingUp, TrendingDown, AlertTriangle, Heart } from 'lucide-react';

export default function AIParentInsights({ children, timetable, grades }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  async function analyse() {
    setLoading(true);
    setInsights(null);

    const childrenData = children.map(c => ({
      name: c.fullName,
      class: c.className,
      exams: timetable.filter(t => t.classId === c.classId).map(t => `${t.subjectName} (${t.dayOfWeek})`),
    }));

    const gradeContext = (grades || []).slice(0, 40).map(g =>
      `${g.studentName}: ${g.subjectName} ${g.score}/${g.maxScore}`
    ).join(', ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a school parent advisor. Analyse a parent's child/children exam readiness and provide actionable insights.

Children and their upcoming exams: ${JSON.stringify(childrenData)}
Recent grade history: ${gradeContext || 'Not available'}
Today: ${new Date().toLocaleDateString()}

For each child, provide:
1. An overall exam readiness score out of 10
2. Subjects the child is likely to excel in (based on grades)
3. Subjects the child may struggle with (flagged as concerns)
4. Predicted performance level (strong/average/needs support)
5. Specific parental action recommendations
6. General tips for supporting children during exam period`,
      response_json_schema: {
        type: 'object',
        properties: {
          childInsights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                childName: { type: 'string' },
                readinessScore: { type: 'number' },
                readinessSummary: { type: 'string' },
                strongSubjects: { type: 'array', items: { type: 'string' } },
                concernSubjects: { type: 'array', items: { type: 'object', properties: { subject: { type: 'string' }, concern: { type: 'string' }, examDate: { type: 'string' } } } },
                parentActions: { type: 'array', items: { type: 'string' } },
              }
            }
          },
          generalParentTips: { type: 'array', items: { type: 'string' } },
          wellnessTips: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    setInsights(res);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" />AI Parent Insights</h3>
          <p className="text-sm text-muted-foreground">AI analysis of your child's exam readiness and how you can help</p>
        </div>
        <Button onClick={analyse} disabled={loading || children.length === 0} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {loading ? 'Analysing…' : 'Get Insights'}
        </Button>
      </div>

      {children.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No linked children found.</p>
      )}

      {insights && (
        <div className="space-y-5">
          {insights.childInsights?.map((child, i) => {
            const score = Math.round(child.readinessScore || 0);
            const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-red-600';
            return (
              <Card key={i} className="border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-base">{child.childName}</h4>
                      {child.readinessSummary && <p className="text-sm text-muted-foreground mt-0.5">{child.readinessSummary}</p>}
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-black ${scoreColor}`}>{score}<span className="text-lg font-normal">/10</span></div>
                      <div className="text-xs text-muted-foreground">Readiness</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {child.strongSubjects?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />LIKELY TO EXCEL</p>
                        <div className="flex flex-wrap gap-1">
                          {child.strongSubjects.map((s, j) => <Badge key={j} className="bg-emerald-100 text-emerald-700 text-xs">{s}</Badge>)}
                        </div>
                      </div>
                    )}

                    {child.concernSubjects?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" />MAY NEED SUPPORT</p>
                        <div className="space-y-1">
                          {child.concernSubjects.map((s, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <Badge className="bg-red-100 text-red-700 text-xs shrink-0">{s.subject}</Badge>
                              <span className="text-xs text-muted-foreground">{s.concern}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {child.parentActions?.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-2">WHAT YOU CAN DO</p>
                      <ul className="space-y-1">
                        {child.parentActions.map((a, j) => (
                          <li key={j} className="text-sm text-blue-700 flex items-start gap-2"><span>→</span>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {insights.generalParentTips?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-semibold text-amber-800 text-sm mb-2">How to Support Your Child</h4>
              <ul className="space-y-1">
                {insights.generalParentTips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2"><span>💛</span>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.wellnessTips?.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="font-semibold text-emerald-800 text-sm mb-2">Wellness & Stress Management</h4>
              <ul className="space-y-1">
                {insights.wellnessTips.map((tip, i) => (
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