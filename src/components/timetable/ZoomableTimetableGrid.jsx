import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Coffee, Minus, Plus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DAYS, isBreakEntry, mergeBreakRows, buildGrid, buildCellMap } from '@/lib/timetableGrid';

// Unscaled width of the grid. The view scales it down so the whole week fits a
// phone screen at once; pinch (or the buttons) zoom back in to read details.
const NATURAL_WIDTH = 560;
const TIME_COL = 52;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function ZoomableTimetableGrid({ entries, breaks }) {
  const scrollRef = useRef(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const merged = useMemo(() => mergeBreakRows(entries, breaks), [entries, breaks]);
  const { times } = useMemo(() => buildGrid(merged), [merged]);
  const cells = useMemo(() => buildCellMap(merged), [merged]);

  const scale = fit * zoom;

  // Fit the whole week to the screen width, and keep it fitted on resize/rotate.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setFit(clamp(el.clientWidth / NATURAL_WIDTH, 0.3, 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pinch to zoom — native listeners so we can stop the page's own zoom/scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    const distance = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length === 2) { startDist = distance(e.touches); startZoom = zoomRef.current; }
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || !startDist) return;
      e.preventDefault();
      setZoom(clamp(startZoom * (distance(e.touches) / startDist), MIN_ZOOM, MAX_ZOOM));
    };
    const onTouchEnd = (e) => { if (e.touches.length < 2) startDist = 0; };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  if (merged.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No timetable entries available</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-muted/50 border-b border-border">
        <span className="text-[11px] text-muted-foreground">Pinch to zoom</span>
        <div className="flex items-center gap-1">
          <Button
            type="button" size="icon" variant="outline" className="h-7 w-7"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom(z => clamp(z - 0.25, MIN_ZOOM, MAX_ZOOM))}
            aria-label="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] w-10 text-center tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button
            type="button" size="icon" variant="outline" className="h-7 w-7"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom(z => clamp(z + 0.25, MIN_ZOOM, MAX_ZOOM))}
            aria-label="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
            disabled={zoom === MIN_ZOOM}
            onClick={() => setZoom(MIN_ZOOM)}
          >
            <Maximize className="w-3.5 h-3.5 mr-1" /> Fit
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto" style={{ touchAction: 'pan-x pan-y' }}>
        <div style={{ zoom: scale }}>
          <div
            className="inline-grid gap-px bg-border p-px"
            style={{ width: NATURAL_WIDTH, gridTemplateColumns: `${TIME_COL}px repeat(5, 1fr)` }}
          >
            <div className="bg-slate-50 dark:bg-slate-800 h-7" />
            {DAYS.map(day => (
              <div key={day} className="bg-slate-50 dark:bg-slate-800 h-7 flex items-center justify-center text-[11px] font-semibold text-foreground">
                {day.slice(0, 3)}
              </div>
            ))}

            {times.map(time => (
              <React.Fragment key={time}>
                <div className="bg-card dark:bg-slate-900 min-h-[52px] flex items-center justify-center text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {time}
                </div>

                {DAYS.map(day => {
                  const slot = cells[day][time] || [];
                  const hasBreak = slot.some(e => isBreakEntry(e) || e.isBreakRow);
                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`min-h-[52px] p-1 flex flex-col items-center justify-center text-center ${
                        hasBreak ? 'bg-amber-100 dark:bg-amber-900/30' : slot.length ? 'bg-primary/10 dark:bg-primary/20' : 'bg-background dark:bg-slate-950'
                      }`}
                    >
                      {slot.map((entry, i) => {
                        const brk = isBreakEntry(entry) || entry.isBreakRow;
                        return (
                          <div key={entry.id || i} className={`w-full ${i > 0 ? 'border-t border-border/60 pt-0.5 mt-0.5' : ''}`}>
                            {brk && <Coffee className="w-3 h-3 mx-auto text-amber-600 dark:text-amber-400" />}
                            <span className={`block text-[10px] font-semibold leading-tight break-words ${brk ? 'text-amber-800 dark:text-amber-200' : 'text-foreground'}`}>
                              {entry.subjectName}
                            </span>
                            {entry.teacherName && <span className="block text-[9px] text-muted-foreground leading-tight break-words">{entry.teacherName}</span>}
                            {!brk && entry.className && <span className="block text-[9px] text-muted-foreground leading-tight break-words">{entry.className}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}