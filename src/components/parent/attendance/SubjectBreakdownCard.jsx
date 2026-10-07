import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function getAttColor(pct) {
  if (pct === null) return { bar: 'bg-slate-200', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-600', border: 'border-slate-200' };
  if (pct >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' };
  if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' };
  return { bar: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700', border: 'border-red-200' };
}

const STATUS_CONFIG = {
  present: { label: 'Present', icon: CheckCircle2, cls: 'text-emerald-600' },
  absent:  { label: 'Absent',  icon: XCircle,      cls: 'text-red-600' },
  late:    { label: 'Late',    icon: Clock,        cls: 'text-amber-600' },
  excused: { label: 'Excused', icon: CheckCircle2, cls: 'text-blue-600' },
};

export default function SubjectBreakdownCard({ subjectName, teacherName, records }) {
  const [expanded, setExpanded] = useState(false);
  const total = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const attendedCount = presentCount + lateCount;
  const pct = total > 0 ? Math.round((attendedCount / total) * 100) : null;
  const colors = getAttColor(pct);

  const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className={`border shadow-sm ${colors.border}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight">{subjectName}</p>
            {teacherName && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" /> {teacherName}
              </p>
            )}
          </div>
          {pct !== null && (
            <Badge className={`text-sm font-bold px-2.5 shrink-0 ${colors.badge}`}>{pct}%</Badge>
          )}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="w-full bg-muted rounded-full h-2 mb-3 overflow-hidden">
            <div className={`h-2 rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1 text-center mb-3">
          {[
            { label: 'Total', value: total, cls: 'text-slate-700' },
            { label: 'Present', value: presentCount, cls: 'text-emerald-700' },
            { label: 'Absent', value: absentCount, cls: 'text-red-700' },
            { label: 'Late', value: lateCount, cls: 'text-amber-700' },
          ].map(s => (
            <div key={s.label} className="bg-muted/50 rounded-lg py-1.5">
              <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status label */}
        {pct !== null && (
          <p className={`text-xs font-medium ${colors.text} mb-3`}>
            {pct >= 75 ? '✓ Good attendance' : pct >= 50 ? '⚠ At risk — attendance low' : '✗ Critical — immediate attention needed'}
          </p>
        )}

        {/* View Details toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Hide Details</> : <><ChevronDown className="w-3.5 h-3.5 mr-1" /> View Details</>}
        </Button>

        {/* Expanded log */}
        {expanded && (
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No records.</p>
            ) : sorted.map(r => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.absent;
              const Icon = cfg.icon;
              return (
                <div key={r.id} className="flex items-center justify-between rounded-md px-3 py-2 bg-muted/40 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.cls}`} />
                    <div className="min-w-0">
                      <p className="font-medium">{r.date ? format(parseISO(r.date), 'EEE, MMM d') : '—'}</p>
                      {r.startTime && <p className="text-muted-foreground">{r.startTime}{r.endTime ? `–${r.endTime}` : ''}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                    <span className={`font-semibold ${cfg.cls}`}>{cfg.label}</span>
                    {r.minutesLate && <span className="text-muted-foreground">{r.minutesLate} min late</span>}
                    {r.note && <span className="text-muted-foreground truncate max-w-[90px]">{r.note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}