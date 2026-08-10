import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG = {
  positive: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  neutral: { icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

function formatWhen(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function InsightCard({ insight, showSubject = true }) {
  if (!insight) return null;
  const cfg = TYPE_CONFIG[insight.insightType] || TYPE_CONFIG.neutral;
  const Icon = cfg.icon;
  const when = formatWhen(insight.created_date || insight.updated_date);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex gap-3`}>
      <div className={`shrink-0 w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Kairos Insight</span>
          {showSubject && insight.subjectName && (
            <span className="text-xs text-muted-foreground">• {insight.subjectName}</span>
          )}
          {insight.studentName && !showSubject && (
            <span className="text-xs text-muted-foreground">• {insight.studentName}</span>
          )}
          {when && <span className="text-xs text-muted-foreground ml-auto">{when}</span>}
        </div>
        <p className="text-sm text-foreground leading-relaxed">{insight.insightText}</p>
        {(insight.preExamAverage != null || insight.requiredExamScore != null) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {insight.preExamAverage != null && (
              <span>Pre-exam: <strong>{insight.preExamAverage}%</strong></span>
            )}
            {insight.requiredExamScore === -1 ? (
              <span className="text-amber-700 font-medium">Cannot pass with exam alone</span>
            ) : insight.requiredExamScore != null && insight.requiredExamScore > 0 ? (
              <span>Needs <strong>{insight.requiredExamScore}%</strong> on exam</span>
            ) : null}
            {insight.trendDirection && insight.trendDirection !== 'new' && (
              <span className="capitalize">Trend: {insight.trendDirection}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}