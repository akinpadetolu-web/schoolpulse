import React from 'react';
import BrandMark from '@/components/common/BrandMark';

/**
 * SEP brand splash — shown only while the application genuinely loads.
 */
/** Compact inline loader for route transitions. */
export function SepInlineLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full py-20">
      <div className="glass rounded-2xl px-6 py-5 flex items-center gap-3">
        <BrandMark size="sm" />
        <div className="h-1 w-24 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 sep-loading-bar" />
        </div>
      </div>
    </div>
  );
}

export default function SepLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="absolute inset-0 sep-aurora" />
      <div className="relative glass-strong rounded-3xl px-10 py-8 flex flex-col items-center gap-4 shadow-glass">
        <BrandMark size="lg" />
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.28em] text-foreground">SEP</p>
          <p className="text-xs text-muted-foreground mt-1">School Educational Pulse</p>
        </div>
        <div className="h-1 w-32 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 sep-loading-bar" />
        </div>
      </div>
    </div>
  );
}