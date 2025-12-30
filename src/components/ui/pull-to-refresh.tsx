import { useState, useRef, useCallback, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const canPull = useRef(false);
  const isPulling = useRef(false);

  const threshold = 80;

  const isInteractiveTarget = (target: EventTarget | null, e?: React.TouchEvent) => {
    const selectors =
      "button, a, input, textarea, select, option, [role='button'], [role='link'], [data-no-pull]";

    // Prefer composedPath (more reliable on mobile + SVG)
    const path = (e?.nativeEvent as unknown as { composedPath?: () => EventTarget[] })?.composedPath?.();
    if (path?.length) {
      return path.some((n) => n instanceof Element && (n.matches(selectors) || !!n.closest(selectors)));
    }

    if (!(target instanceof Element)) return false;
    return !!target.closest(selectors);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only *arm* pull-to-refresh when starting at top and not interacting with controls.
    if (isInteractiveTarget(e.target, e)) {
      canPull.current = false;
      isPulling.current = false;
      return;
    }

    const atTop = (containerRef.current?.scrollTop ?? 0) <= 0;
    canPull.current = atTop;
    isPulling.current = false;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Never treat interaction with controls as a pull gesture
      if (isInteractiveTarget(e.target, e)) return;
      if (!canPull.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Activate pull only after a meaningful downward move (prevents taps being hijacked)
      if (diff <= 10) return;
      isPulling.current = true;

      // Apply resistance to pull
      const resistance = 0.4;
      setPullDistance(Math.min(diff * resistance, threshold * 1.5));
    },
    [isRefreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) {
      canPull.current = false;
      return;
    }

    canPull.current = false;
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none transition-opacity z-10"
        style={{
          top: pullDistance - 40,
          opacity: progress,
        }}
      >
        <div className={cn(
          "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center",
          isRefreshing && "animate-pulse"
        )}>
          <Loader2 
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transitionDuration: isPulling.current ? "0ms" : "200ms",
        }}
      >
        {children}
      </div>
    </div>
  );
}
