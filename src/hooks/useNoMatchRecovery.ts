/**
 * useNoMatchRecovery — hook for no-match detection, waitlist, and recovery flow.
 */
import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alexNoMatchService, type NoMatchCase, type WaitlistRequest } from "@/services/alexNoMatchService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type NoMatchStep = "idle" | "detected" | "alternatives" | "waitlist_form" | "waitlist_confirmed" | "retrying" | "matched";

export function useNoMatchRecovery(sessionId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<NoMatchStep>("idle");
  const [noMatchContext, setNoMatchContext] = useState<{ service: string; city: string; reason: string } | null>(null);

  const detectMutation = useMutation({
    mutationFn: (data: NoMatchCase) => alexNoMatchService.detectNoMatch(data),
    onSuccess: (_, vars) => {
      setNoMatchContext({ service: vars.service, city: vars.city, reason: vars.detected_reason || "no_available_contractor" });
      setStep("detected");
    },
    onError: () => toast.error("Erreur lors de la détection."),
  });

  const waitlistMutation = useMutation({
    mutationFn: (data: WaitlistRequest) => alexNoMatchService.createWaitlist(data),
    onSuccess: () => {
      setStep("waitlist_confirmed");
      toast.success("Vous êtes sur la liste d'attente. On vous contacte bientôt!");
    },
    onError: () => toast.error("Erreur lors de l'ajout à la liste d'attente."),
  });

  const detect = useCallback((service: string, city: string, radiusKm?: number, reason?: string) => {
    detectMutation.mutate({
      alex_session_id: sessionId,
      service, city, radius_km: radiusKm,
      detected_reason: reason,
    });
  }, [sessionId, detectMutation]);

  const joinWaitlist = useCallback((data: { firstName?: string; phone?: string; email?: string; service: string; city: string; radiusKm?: number; flexibility?: string; urgency?: string }) => {
    waitlistMutation.mutate({
      alex_session_id: sessionId,
      user_id: user?.id,
      first_name: data.firstName,
      phone: data.phone,
      email: data.email,
      service: data.service,
      city: data.city,
      radius_km: data.radiusKm,
      flexibility_level: data.flexibility,
      urgency_level: data.urgency,
    });
  }, [sessionId, user, waitlistMutation]);

  const showAlternatives = useCallback(() => setStep("alternatives"), []);
  const showWaitlistForm = useCallback(() => setStep("waitlist_form"), []);
  const reset = useCallback(() => { setStep("idle"); setNoMatchContext(null); }, []);

  const alexMessage = noMatchContext
    ? alexNoMatchService.getAlexVoiceResponse(noMatchContext.service, noMatchContext.city)
    : null;

  const statusCopy = noMatchContext
    ? alexNoMatchService.getNoMatchCopy(noMatchContext.reason)
    : null;

  return {
    step, noMatchContext, alexMessage, statusCopy,
    detect, joinWaitlist, showAlternatives, showWaitlistForm, reset,
    isDetecting: detectMutation.isPending,
    isJoining: waitlistMutation.isPending,
  };
}

export function useNoMatchStats() {
  return useQuery({
    queryKey: ["no-match-stats"],
    queryFn: () => alexNoMatchService.getStats(),
    refetchInterval: 60_000,
  });
}
