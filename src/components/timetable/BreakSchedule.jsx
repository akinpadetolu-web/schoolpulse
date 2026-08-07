import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Coffee, X } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Allocates Short Break / Long Break times BEFORE a timetable is generated.
// Each break has default times plus optional per-day overrides (e.g. a shorter
// Friday). Breaks are reserved — no subject may overlap them — and recognised
// by name in the clash resolver so they keep their original slots.
export default function BreakSchedule({ breaks, onChange }) {
  function patch(idx, updater) {
    onChange(breaks.map((b, i) => (i === idx ? updater(b) : b)));
  }
  function setField(idx, field, val) {
    patch(idx, b => ({ ...b, [field]: val }));
  }
  function toggleOverride(idx, day) {
    patch(idx, b => {
      const overrides = { ...(b.overrides || {}) };
      if (overrides[day]) {
        delete overrides[day];
      } else {
        overrides[day] = { start: b.start, end: b.end };
      }
      return { ...b, overrides };
    });
  }
  function setOverride(idx, day, field, val) {
    patch(idx, b => {
      const overrides = { ...(b.overrides || {}) };
      const cur = overrides[day] || { start: b.start, end: b.end };
      overrides[day] = { ...cur, [field]: val };
      return { ...b, overrides };
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Coffee className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Break Schedule</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Set default break times. Tap a day to give it different break times (e.g. a shorter Friday). Breaks are reserved — no subject will be scheduled during them.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          {breaks.map((b, idx) => {
            const overrides = b.overrides || {};
            const overrideDays = DAYS.filter(day => overrides[day]);
            return (
              <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-amber-800">{b.name}</Label>
                  <span className="text-[11px] text-muted-foreground">default · all days</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Default start</Label>
                    <Input type="time" value={b.start || ''} onChange={e => setField(idx, 'start', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Default end</Label>
                    <Input type="time" value={b.end || ''} onChange={e => setField(idx, 'end', e.target.value)} />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-1.5">Per-day overrides (tap a day):</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DAYS.map(day => {
                    const active = !!overrides[day];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleOverride(idx, day)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-muted-foreground border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {overrideDays.length > 0 && (
                  <div className="space-y-2">
                    {overrideDays.map(day => (
                      <div key={day} className="flex items-end gap-2 rounded-md bg-white border border-amber-200 p-2">
                        <span className="text-xs font-medium text-amber-800 w-16 flex-shrink-0 pb-2">{day}</span>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Start</Label>
                          <Input type="time" value={overrides[day].start} onChange={e => setOverride(idx, day, 'start', e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">End</Label>
                          <Input type="time" value={overrides[day].end} onChange={e => setOverride(idx, day, 'end', e.target.value)} className="h-8 text-xs" />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleOverride(idx, day)}
                          className="ml-auto pb-2 text-muted-foreground hover:text-destructive"
                          title="Use default for this day"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}