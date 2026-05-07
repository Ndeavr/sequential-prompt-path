/**
 * DeferredAfterInteractive
 * Renders children only after first user interaction OR requestIdleCallback,
 * whichever comes first. Used to keep heavy non-critical UI off the initial bundle/paint.
 */
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  timeoutMs?: number;
}

export default function DeferredAfterInteractive({ children, timeoutMs = 2500 }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((ev) => window.addEventListener(ev, trigger, { passive: true, once: true }));

    const idle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(trigger, { timeout: timeoutMs })
      : window.setTimeout(trigger, timeoutMs);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
      if ((window as any).cancelIdleCallback && typeof idle === "number") {
        (window as any).cancelIdleCallback(idle);
      } else {
        clearTimeout(idle as any);
      }
    };
  }, [ready, timeoutMs]);

  return ready ? <>{children}</> : null;
}
