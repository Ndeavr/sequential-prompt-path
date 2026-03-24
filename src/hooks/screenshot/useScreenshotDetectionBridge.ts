/**
 * UNPRO — Screenshot Detection Bridge
 * Connects to native mobile screenshot events.
 * On web: provides a mock trigger for dev/admin.
 */
import { useEffect, useCallback, useState } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { useCurrentScreenContext } from "./useCurrentScreenContext";
import { useScreenshotEventTracker } from "./useScreenshotEventTracker";
import type { ScreenContext } from "@/types/screenshot";

type ScreenshotCallback = (ctx: ScreenContext) => void;

export function useScreenshotDetectionBridge(onScreenshot?: ScreenshotCallback) {
  const screenCtx = useCurrentScreenContext();
  const { trackScreenshot } = useScreenshotEventTracker();
  const [lastEvent, setLastEvent] = useState<ScreenContext | null>(null);

  const handleScreenshot = useCallback(async (ctx: ScreenContext) => {
    if (!isFeatureEnabled("screenshot_detection_mobile")) return;

    setLastEvent(ctx);
    await trackScreenshot({
      platform: /android/i.test(navigator.userAgent) ? "android" : /iphone|ipad/i.test(navigator.userAgent) ? "ios" : "web",
      screenKey: ctx.screenKey,
      screenName: ctx.screenName,
      routePath: ctx.routePath,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      entitySlug: ctx.entitySlug,
    });
    onScreenshot?.(ctx);
  }, [trackScreenshot, onScreenshot]);

  // Listen for native bridge events
  useEffect(() => {
    const handler = (e: Event) => {
      if (screenCtx) handleScreenshot(screenCtx);
    };
    window.addEventListener("unpro:screenshot", handler);
    return () => window.removeEventListener("unpro:screenshot", handler);
  }, [screenCtx, handleScreenshot]);

  const simulateScreenshot = useCallback(() => {
    if (screenCtx) {
      handleScreenshot(screenCtx);
    }
  }, [screenCtx, handleScreenshot]);

  return { lastEvent, simulateScreenshot, currentScreen: screenCtx };
}
