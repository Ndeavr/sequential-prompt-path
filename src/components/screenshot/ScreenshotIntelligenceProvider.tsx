/**
 * UNPRO — Screenshot Intelligence Provider
 * Wraps the app to handle mobile screenshot detection + smart share.
 */
import { useState, useCallback } from "react";
import { useScreenshotDetectionBridge } from "@/hooks/screenshot/useScreenshotDetectionBridge";
import { usePromptCooldownGuard } from "@/hooks/screenshot/usePromptCooldownGuard";
import { useScreenshotEventTracker } from "@/hooks/screenshot/useScreenshotEventTracker";
import { isFeatureEnabled } from "@/lib/feature-flags";
import ScreenshotShareBottomSheet from "./ScreenshotShareBottomSheet";
import type { ScreenContext } from "@/types/screenshot";

export default function ScreenshotIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCtx, setActiveCtx] = useState<ScreenContext | null>(null);
  const { canShowPrompt, markShown } = usePromptCooldownGuard();
  const { trackShareAction, updateScreenshotEvent } = useScreenshotEventTracker();

  const handleScreenshot = useCallback((ctx: ScreenContext) => {
    if (!isFeatureEnabled("smart_share_prompt")) return;
    if (!ctx.isShareWorthy) return;
    if (!canShowPrompt()) return;

    setActiveCtx(ctx);
    setSheetOpen(true);
    markShown();
  }, [canShowPrompt, markShown]);

  useScreenshotDetectionBridge(handleScreenshot);

  return (
    <>
      {children}
      {activeCtx && (
        <ScreenshotShareBottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          screenContext={activeCtx}
          onShared={(method, url) => {
            trackShareAction({
              screenKey: activeCtx.screenKey,
              routePath: activeCtx.routePath,
              entityType: activeCtx.entityType,
              shareMethod: method as any,
              shareLinkUrl: url,
            });
          }}
          onDismissed={() => {
            // Track dismissal
          }}
        />
      )}
    </>
  );
}
