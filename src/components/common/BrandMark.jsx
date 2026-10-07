import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7' },
  xl: { box: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10' },
};

/**
 * SEP brand mark — a crisp vector tile with the "pulse" glyph.
 * Replaces the raster logo everywhere so the identity stays sharp at any size.
 */
export default function BrandMark({ size = 'sm', className }) {
  const s = SIZES[size] || SIZES.sm;
  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow',
        s.box,
        className
      )}
    >
      <Activity className={s.icon} strokeWidth={2.5} aria-hidden="true" />
    </div>
  );
}