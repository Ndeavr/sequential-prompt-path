/**
 * useContractorMode — Central hook to detect contractor mode.
 *
 * Returns the resolved AlexModeDescriptor + booleans every surface
 * (chat, voice modal, admin preview, dashboard) MUST use to decide
 * whether to mount `PanelContractorAdvisorAlex` and lock out the
 * homeowner / generic-onboarding flows.
 *
 * Source of truth: src/config/alexModes.ts
 */

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContractorProfile } from "@/hooks/useContractor";
import { resolveAlexMode, type AlexModeContext, type AlexModeDescriptor } from "@/config/alexModes";

export interface UseContractorModeOptions {
  /** Set true on admin preview surfaces. */
  isAdminPreview?: boolean;
}

export interface UseContractorModeResult {
  isLoading: boolean;
  isContractorMode: boolean;
  descriptor: AlexModeDescriptor;
  context: AlexModeContext;
}

export function useContractorMode(opts: UseContractorModeOptions = {}): UseContractorModeResult {
  const { role, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useContractorProfile();

  const context: AlexModeContext = useMemo(
    () => ({
      role,
      hasContractorProfile: !!profile,
      isAdminPreview: !!opts.isAdminPreview,
    }),
    [role, profile, opts.isAdminPreview],
  );

  const descriptor = useMemo(() => resolveAlexMode(context), [context]);

  return {
    isLoading: authLoading || profileLoading,
    isContractorMode: descriptor.mode === "contractor" || descriptor.mode === "admin_preview",
    descriptor,
    context,
  };
}
