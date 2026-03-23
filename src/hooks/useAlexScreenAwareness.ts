/**
 * useAlexScreenAwareness — Tracks current UI state for Alex context.
 * Returns a ScreenContext object so Alex never suggests irrelevant actions.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export interface ScreenContext {
  currentPage: string;
  visibleSection: string | null;
  hasScore: boolean;
  hasUploadedPhoto: boolean;
  hasBooking: boolean;
  isOnboarding: boolean;
  isPricing: boolean;
  isDashboard: boolean;
  isPublicProfile: boolean;
}

interface ScreenAwarenessOptions {
  hasScore?: boolean;
  hasUploadedPhoto?: boolean;
  hasBooking?: boolean;
  visibleSection?: string | null;
}

export function useAlexScreenAwareness(options: ScreenAwarenessOptions = {}): ScreenContext {
  const { pathname } = useLocation();

  return useMemo<ScreenContext>(() => ({
    currentPage: pathname,
    visibleSection: options.visibleSection ?? null,
    hasScore: options.hasScore ?? false,
    hasUploadedPhoto: options.hasUploadedPhoto ?? false,
    hasBooking: options.hasBooking ?? false,
    isOnboarding: pathname.startsWith("/onboarding"),
    isPricing: pathname.includes("pricing"),
    isDashboard: pathname.startsWith("/dashboard"),
    isPublicProfile: pathname.startsWith("/pro/"),
  }), [pathname, options.hasScore, options.hasUploadedPhoto, options.hasBooking, options.visibleSection]);
}
