/**
 * UNPRO — Screenshot Event Tracker Hook
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ScreenshotEventPayload, ShareActionPayload } from "@/types/screenshot";

export function useScreenshotEventTracker() {
  const { user } = useAuth();

  const trackScreenshot = useCallback(async (payload: Omit<ScreenshotEventPayload, "userId">) => {
    const { error } = await supabase.from("screenshot_events").insert({
      user_id: user?.id ?? null,
      session_id: payload.sessionId ?? null,
      role: payload.role ?? null,
      platform: payload.platform,
      app_version: payload.appVersion ?? null,
      screen_key: payload.screenKey,
      screen_name: payload.screenName,
      route_path: payload.routePath,
      entity_type: payload.entityType ?? null,
      entity_id: payload.entityId ?? null,
      entity_slug: payload.entitySlug ?? null,
      share_prompt_shown: payload.sharePromptShown ?? false,
      share_prompt_variant: payload.sharePromptVariant ?? null,
      share_cta_clicked: payload.shareCtaClicked ?? false,
      share_method: payload.shareMethod ?? null,
      dismissed: payload.dismissed ?? false,
    });
    if (error) console.error("[ScreenshotTracker]", error.message);
    return !error;
  }, [user?.id]);

  const trackShareAction = useCallback(async (payload: Omit<ShareActionPayload, "userId">) => {
    const { error } = await supabase.from("share_link_events").insert({
      user_id: user?.id ?? null,
      session_id: payload.sessionId ?? null,
      screenshot_event_id: payload.screenshotEventId ?? null,
      screen_key: payload.screenKey,
      route_path: payload.routePath,
      entity_type: payload.entityType ?? null,
      entity_id: payload.entityId ?? null,
      share_method: payload.shareMethod,
      share_link_url: payload.shareLinkUrl ?? null,
    });
    if (error) console.error("[ShareTracker]", error.message);
    return !error;
  }, [user?.id]);

  const updateScreenshotEvent = useCallback(async (eventId: string, updates: Partial<ScreenshotEventPayload>) => {
    const { error } = await supabase.from("screenshot_events").update({
      share_prompt_shown: updates.sharePromptShown,
      share_cta_clicked: updates.shareCtaClicked,
      share_method: updates.shareMethod,
      dismissed: updates.dismissed,
    }).eq("id", eventId);
    if (error) console.error("[ScreenshotTracker:update]", error.message);
  }, []);

  return { trackScreenshot, trackShareAction, updateScreenshotEvent };
}
