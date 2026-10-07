import React from 'react';
import { cn } from '@/lib/utils';

/** Base shimmering block. */
export function SepBlock({ className, style }) {
  return <div className={cn('sep-skeleton', className)} style={style} />;
}

/** Statistics card placeholders (label / number / secondary line). */
export function SkeletonStatCards({ count = 4, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5">
          <SepBlock className="h-3 w-24" />
          <SepBlock className="h-8 w-20 mt-4" />
          <SepBlock className="h-3 w-28 mt-3" />
        </div>
      ))}
    </div>
  );
}

/** Glass panel placeholder for charts. */
export function SkeletonChart({ className }) {
  return (
    <div className={cn('glass rounded-2xl p-5', className)}>
      <SepBlock className="h-4 w-40" />
      <SepBlock className="h-3 w-56 mt-3" />
      <div className="flex items-end gap-2 mt-6 h-40">
        {[45, 70, 35, 85, 55, 65, 40].map((h, i) => (
          <SepBlock key={i} className="flex-1 rounded-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Table placeholder with header, rows and avatars. */
export function SkeletonTable({ rows = 6, columns = 4, className }) {
  return (
    <div className={cn('glass rounded-2xl overflow-hidden', className)}>
      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <SepBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0">
          <SepBlock className="h-8 w-8 rounded-full shrink-0" />
          {Array.from({ length: columns - 1 }).map((_, c) => (
            <SepBlock key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** List placeholder (icon / title / subtitle). */
export function SkeletonList({ rows = 4, className }) {
  return (
    <div className={cn('glass rounded-2xl p-5 space-y-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SepBlock className="h-9 w-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SepBlock className="h-3 w-2/5" />
            <SepBlock className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full dashboard placeholder. */
export function SepDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SepBlock className="h-7 w-64" />
        <SepBlock className="h-3 w-80" />
      </div>
      <SkeletonStatCards />
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonChart className="lg:col-span-2" />
        <SkeletonList />
      </div>
      <SkeletonTable />
    </div>
  );
}