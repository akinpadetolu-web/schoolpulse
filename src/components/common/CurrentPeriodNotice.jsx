import React from 'react';
import { CalendarRange } from 'lucide-react';
import { periodLabel } from '@/lib/currentPeriod';

/**
 * Tells the user which session and term the page is showing, so an empty result
 * reads as "nothing recorded yet this term" rather than missing data.
 */
export default function CurrentPeriodNotice({ period }) {
  const label = periodLabel(period);
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
      <CalendarRange className="w-3.5 h-3.5 shrink-0" />
      <span>
        Showing <strong className="text-foreground font-medium">{label}</strong> only — previous sessions are not included.
      </span>
    </div>
  );
}