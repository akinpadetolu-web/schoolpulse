import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PullToRefreshWrapper({
  children,
  containerRef,
  pullDistance,
  pulling,
  refreshing,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  const THRESHOLD = 72;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pulling || refreshing;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overscroll-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: pulling ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: showIndicator ? `${Math.max(pullDistance, refreshing ? 48 : 0)}px` : '0px' }}
      >
        <div
          className="w-8 h-8 rounded-full bg-background border border-border shadow flex items-center justify-center"
          style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
        >
          {refreshing
            ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
            : <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4" />
              </svg>
          }
        </div>
      </div>
      {children}
    </div>
  );
}