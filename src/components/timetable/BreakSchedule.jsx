import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Coffee } from 'lucide-react';

// Allocates Short Break / Long Break times BEFORE a timetable is generated.
// Breaks apply every day, are reserved (no subject may overlap them), and are
// recognised by name in the clash resolver so they keep their original slots.
export default function BreakSchedule({ breaks, onChange }) {
  function update(idx, field, val) {
    onChange(breaks.map((b, i) => (i === idx ? { ...b, [field]: val } : b)));
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Coffee className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Break Schedule</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Allocate break times before generating the timetable. These slots are reserved every day — the AI will not assign any subject during breaks, and manual entries are blocked from overlapping them.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {breaks.map((b, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-amber-800">{b.name}</Label>
                <span className="text-[11px] text-muted-foreground">applies every day</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input type="time" value={b.start || ''} onChange={e => update(i, 'start', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input type="time" value={b.end || ''} onChange={e => update(i, 'end', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}