/**
 * useEntrepreneurMessaging — React hook to resolve strategic copy by context.
 *
 * Future-proof: trade, territory, plan, scarcity, AIPP can all drive variants.
 */
import { useMemo } from "react";
import {
  entrepreneurMessaging,
  resolveHeroVariant,
  type MessagingContext,
} from "@/lib/copy/entrepreneurs";

interface Options {
  context?: MessagingContext;
}

export function useEntrepreneurMessaging({ context = "default" }: Options = {}) {
  return useMemo(
    () => ({
      ...entrepreneurMessaging,
      hero: {
        ...entrepreneurMessaging.hero,
        active: resolveHeroVariant(context),
      },
    }),
    [context]
  );
}
