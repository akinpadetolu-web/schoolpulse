import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, GraduationCap, ClipboardList, Loader2 } from 'lucide-react';
import { weekRange, openTopicPdf } from '@/lib/termPlanUtils';
import { toast } from 'sonner';

/** Read-only weekly topic list for one term plan (student, parent and admin views). */
export default function TermPlanWeeks({ plan, showTerm = false }) {
  const [busy, setBusy] = useState(null);

  async function download(week) {
    setBusy(week.weekNumber);
    try {
      await openTopicPdf(week);
    } catch {
      toast.error('Could not open that PDF');
    } finally {
      setBusy(null);
    }
  }

  const weeks = [...(plan?.weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div className="space-y-2">
      {showTerm && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {plan.termName}{plan.academicYear ? ` · ${plan.academicYear}` : ''} · {plan.teacherName}
        </p>
      )}

      {weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weeks scheduled yet.</p>
      ) : (
        weeks.map(week => (
          <div
            key={week.weekNumber}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              week.isExam ? 'border-red-100 bg-red-50/50' : week.isMidterm ? 'border-amber-100 bg-amber-50/50' : 'bg-card'
            }`}
          >
            <span className="text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-1 shrink-0">
              W{week.weekNumber}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{weekRange(week)}</span>
                {week.isMidterm && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                    <GraduationCap className="w-3 h-3 mr-1" /> Midterm
                  </Badge>
                )}
                {week.isExam && (
                  <Badge className="text-xs bg-red-100 text-red-700 border-0">
                    <ClipboardList className="w-3 h-3 mr-1" /> Exam week
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium mt-0.5">{week.topic || 'Topic to be confirmed'}</p>
              {week.objectives && <p className="text-sm text-muted-foreground mt-0.5">{week.objectives}</p>}
            </div>
            {week.pdfFileUri && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-primary"
                disabled={busy === week.weekNumber}
                onClick={() => download(week)}
                title={week.pdfFileName || 'Download topic PDF'}
              >
                {busy === week.weekNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}