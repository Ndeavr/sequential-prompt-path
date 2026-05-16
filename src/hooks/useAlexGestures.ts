/**
 * useAlexGestures — premium pointer/touch gesture controller for AlexMorphingOrb.
 *
 * Recognises:
 *  - tap            (quick press & release, no drag)
 *  - double tap     (two taps within 280 ms)
 *  - long press     (held ≥ 450 ms without significant movement)
 *  - swipe up/down/left/right (after long press OR a fast flick > 36 px)
 *
 * Works on touch + mouse + pen. Never blocks page scroll until a long press
 * is actually engaged (then we capture the pointer + preventDefault).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type GestureDirection = "up" | "down" | "left" | "right" | null;

export interface AlexGestureCallbacks {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Fires every pointer move once long-press is engaged. */
  onLongPressMove?: (dx: number, dy: number, dir: GestureDirection) => void;
  /** Fires when long press ends (released or cancelled). */
  onLongPressEnd?: (dir: GestureDirection) => void;
}

export interface AlexGestureState {
  isGestureActive: boolean;
  gestureDirection: GestureDirection;
  /** Pointer offset from press origin, while long-press is active. */
  dragX: number;
  dragY: number;
}

interface Options extends AlexGestureCallbacks {
  longPressMs?: number;
  doubleTapMs?: number;
  moveTolerancePx?: number;
  swipeThresholdPx?: number;
  flickVelocity?: number; // px / ms
  disabled?: boolean;
}

const DEFAULTS = {
  longPressMs: 450,
  doubleTapMs: 280,
  moveTolerancePx: 8,
  swipeThresholdPx: 36,
  flickVelocity: 0.6,
};

function classify(dx: number, dy: number, threshold: number): GestureDirection {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export function useAlexGestures(opts: Options = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const {
    onTap,
    onDoubleTap,
    onLongPress,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onLongPressMove,
    onLongPressEnd,
    disabled,
  } = cfg;

  const [state, setState] = useState<AlexGestureState>({
    isGestureActive: false,
    gestureDirection: null,
    dragX: 0,
    dragY: 0,
  });

  const pressing = useRef(false);
  const longPressed = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const lastTapT = useRef(0);
  const longPressTimer = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const reset = useCallback(() => {
    pressing.current = false;
    longPressed.current = false;
    moved.current = false;
    pointerIdRef.current = null;
    clearLongPressTimer();
    setState({ isGestureActive: false, gestureDirection: null, dragX: 0, dragY: 0 });
  }, []);

  const fireSwipe = useCallback(
    (dir: GestureDirection) => {
      if (!dir) return;
      if (dir === "up") onSwipeUp?.();
      else if (dir === "down") onSwipeDown?.();
      else if (dir === "left") onSwipeLeft?.();
      else if (dir === "right") onSwipeRight?.();
    },
    [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      // Only primary button for mouse
      if (e.pointerType === "mouse" && e.button !== 0) return;

      targetRef.current = e.currentTarget;
      pointerIdRef.current = e.pointerId;
      pressing.current = true;
      longPressed.current = false;
      moved.current = false;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();

      clearLongPressTimer();
      longPressTimer.current = window.setTimeout(() => {
        if (!pressing.current || moved.current) return;
        longPressed.current = true;
        // Capture pointer so subsequent moves don't scroll the page
        try {
          targetRef.current?.setPointerCapture(pointerIdRef.current!);
        } catch {
          /* noop */
        }
        setState((s) => ({ ...s, isGestureActive: true }));
        onLongPress?.();
      }, cfg.longPressMs);
    },
    [disabled, cfg.longPressMs, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      const dist = Math.hypot(dx, dy);

      if (!longPressed.current) {
        if (dist > cfg.moveTolerancePx) {
          moved.current = true;
          // Movement before long-press triggers cancels the long-press timer
          // (we still allow a fast flick → swipe on release).
          clearLongPressTimer();
        }
        return;
      }

      // Long-press active → prevent page scroll, track drag, update direction
      if (e.cancelable) e.preventDefault();
      const dir = classify(dx, dy, cfg.swipeThresholdPx);
      setState({ isGestureActive: true, gestureDirection: dir, dragX: dx, dragY: dy });
      onLongPressMove?.(dx, dy, dir);
    },
    [cfg.moveTolerancePx, cfg.swipeThresholdPx, onLongPressMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      const dt = Math.max(1, performance.now() - startT.current);
      const dist = Math.hypot(dx, dy);
      const velocity = dist / dt;
      const wasLong = longPressed.current;

      try {
        if (pointerIdRef.current != null) {
          targetRef.current?.releasePointerCapture(pointerIdRef.current);
        }
      } catch {
        /* noop */
      }

      if (wasLong) {
        const dir = classify(dx, dy, cfg.swipeThresholdPx);
        fireSwipe(dir);
        onLongPressEnd?.(dir);
        reset();
        return;
      }

      // Fast flick → swipe (without long-press menu)
      if (velocity > cfg.flickVelocity && dist > cfg.swipeThresholdPx) {
        const dir = classify(dx, dy, cfg.swipeThresholdPx);
        fireSwipe(dir);
        reset();
        return;
      }

      // Tap or double-tap
      if (!moved.current && dt < cfg.longPressMs) {
        const now = performance.now();
        const since = now - lastTapT.current;
        if (since < cfg.doubleTapMs) {
          lastTapT.current = 0;
          onDoubleTap?.();
        } else {
          lastTapT.current = now;
          // Delay single-tap so a follow-up tap can override
          window.setTimeout(() => {
            if (lastTapT.current === now) onTap?.();
          }, cfg.doubleTapMs);
        }
      }
      reset();
    },
    [
      cfg.doubleTapMs,
      cfg.flickVelocity,
      cfg.longPressMs,
      cfg.swipeThresholdPx,
      fireSwipe,
      onDoubleTap,
      onLongPressEnd,
      onTap,
      reset,
    ],
  );

  const onPointerCancel = useCallback(() => {
    if (longPressed.current) onLongPressEnd?.(null);
    reset();
  }, [onLongPressEnd, reset]);

  // Cleanup on unmount
  useEffect(() => () => clearLongPressTimer(), []);

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave: onPointerCancel,
    },
  };
}

export default useAlexGestures;
