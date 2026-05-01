import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 72; // px to pull before triggering

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) { startY.current = null; return; }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      e.preventDefault();
      setPulling(true);
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
    startY.current = null;
  }, [pulling, pullDistance, onRefresh]);

  return { containerRef, pullDistance, pulling, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}