/**
 * UNPRO — Smart Share Hook
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ScreenContext, ScreenshotShareVariant } from "@/types/screenshot";

function generateShareUrl(ctx: ScreenContext): string {
  const base = window.location.origin;
  return `${base}${ctx.routePath}`;
}

function resolveVariant(screenKey: string): ScreenshotShareVariant {
  const map: Record<string, ScreenshotShareVariant> = {
    contractor_profile_screen: "contractor_profile",
    aipp_score_result_screen: "aipp_result",
    booking_confirmation_screen: "booking_confirmation",
    alex_match_result_screen: "alex_match",
    plan_comparison_screen: "plan_comparison",
  };
  return map[screenKey] ?? "default";
}

export function useSmartShare() {
  const [isSharing, setIsSharing] = useState(false);

  const shareLink = useCallback(async (ctx: ScreenContext) => {
    const url = generateShareUrl(ctx);
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: ctx.screenName, url });
        toast.success("Lien partagé !");
        return { method: "native_share" as const, url };
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié !");
        return { method: "copy_link" as const, url };
      }
    } catch {
      toast.error("Erreur de partage");
      return null;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const copyLink = useCallback(async (ctx: ScreenContext) => {
    const url = generateShareUrl(ctx);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
      return { method: "copy_link" as const, url };
    } catch {
      toast.error("Impossible de copier");
      return null;
    }
  }, []);

  return { shareLink, copyLink, isSharing, generateShareUrl, resolveVariant };
}
