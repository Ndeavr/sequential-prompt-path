/**
 * UNPRO — État du Profil de compatibilité (excavation / fondations / drainage).
 * Autosave debounce vers l'edge function `contractor-compatibility-save`
 * (le contractor_id est résolu et validé côté serveur, jamais accepté du client seul).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  TOTAL_COMPAT_STEPS,
  type PrequalLevel,
  type Stance,
  type TerritoryTier,
  type TriAnswer,
} from "@/config/compatibilityExcavation";

export interface TerritoryPref {
  city_name: string;
  city_slug: string;
  tier: TerritoryTier;
  min_project_cents?: number | null;
}

export interface CompatibilityAnswers {
  services: Record<string, { stance: Stance; min_project_cents?: number | null }>;
  projects: Record<string, { answer: TriAnswer; condition_note?: string }>;
  money: {
    floor_project_cents?: number | null;
    ideal_min_cents?: number | null;
    ideal_max_cents?: number | null;
    volume_preference?: string;
  };
  territories: TerritoryPref[];
  capacity: {
    projects_per_month?: number | null;
    lead_time_weeks?: number | null;
    accepts_emergency?: boolean;
    responds_24_48?: boolean;
    weekend?: boolean;
    winter?: boolean;
    paused?: boolean;
  };
  prequal: Record<string, PrequalLevel>;
  critical_notes: string[];
  learning_opt_in: boolean;
}

export const EMPTY_ANSWERS: CompatibilityAnswers = {
  services: {},
  projects: {},
  money: {},
  territories: [],
  capacity: {},
  prequal: {},
  critical_notes: ["", "", ""],
  learning_opt_in: true,
};

function mergeAnswers(raw: unknown): CompatibilityAnswers {
  const a = (raw ?? {}) as Partial<CompatibilityAnswers>;
  return {
    ...EMPTY_ANSWERS,
    ...a,
    services: a.services ?? {},
    projects: a.projects ?? {},
    money: a.money ?? {},
    territories: a.territories ?? [],
    capacity: a.capacity ?? {},
    prequal: a.prequal ?? {},
    critical_notes: a.critical_notes?.length ? a.critical_notes : ["", "", ""],
  };
}

interface Options {
  /** Admin : édition d'une fiche entrepreneur précise. */
  contractorId?: string;
}

export function useContractorCompatibility(options: Options = {}) {
  const { contractorId } = options;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<CompatibilityAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contractor-compatibility", contractorId ?? user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let cid = contractorId ?? null;
      if (!cid) {
        const { data: c } = await supabase
          .from("contractors")
          .select("id, city, service_areas")
          .eq("user_id", user!.id)
          .maybeSingle();
        cid = c?.id ?? null;
      }
      if (!cid) return { contractor_id: null, profile: null, areas: [] as any[] };

      const [{ data: profile }, { data: areas }] = await Promise.all([
        supabase
          .from("contractor_compatibility_profiles")
          .select("*")
          .eq("contractor_id", cid)
          .maybeSingle(),
        supabase
          .from("contractor_service_areas")
          .select("id, city_name")
          .eq("contractor_id", cid),
      ]);
      return { contractor_id: cid, profile, areas: areas ?? [] };
    },
  });

  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    if (data.profile) {
      setAnswers(mergeAnswers(data.profile.answers));
      setStep(Math.min(Math.max(data.profile.current_step ?? 1, 1), TOTAL_COMPAT_STEPS));
    }
  }, [data]);

  const persist = useCallback(
    async (next: CompatibilityAnswers, nextStep: number, finalize = false) => {
      setSaving(true);
      try {
        const { data: res, error } = await supabase.functions.invoke(
          finalize ? "contractor-compatibility-finalize" : "contractor-compatibility-save",
          { body: { contractor_id: contractorId ?? null, answers: next, current_step: nextStep } },
        );
        if (error) throw error;
        setSavedAt(new Date());
        if (finalize) {
          qc.invalidateQueries({ queryKey: ["contractor-compatibility"] });
        }
        return res as { ok: boolean; completion_pct: number; summary?: any };
      } catch (e: any) {
        toast.error("Sauvegarde impossible pour l'instant. Vos réponses restent à l'écran.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [contractorId, qc],
  );

  /** Mise à jour + autosave debounce (1,2 s). */
  const update = useCallback(
    (patch: Partial<CompatibilityAnswers> | ((a: CompatibilityAnswers) => CompatibilityAnswers)) => {
      setAnswers((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist(next, step), 1200);
        return next;
      });
    },
    [persist, step],
  );

  const goToStep = useCallback(
    async (n: number) => {
      const clamped = Math.min(Math.max(n, 1), TOTAL_COMPAT_STEPS);
      setStep(clamped);
      if (timer.current) clearTimeout(timer.current);
      await persist(answers, clamped);
    },
    [answers, persist],
  );

  const finalize = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return persist(answers, step, true);
  }, [answers, step, persist]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return {
    contractorId: data?.contractor_id ?? null,
    profile: data?.profile ?? null,
    existingAreas: (data?.areas ?? []) as { id: string; city_name: string }[],
    answers,
    update,
    step,
    goToStep,
    finalize,
    saving,
    savedAt,
    isLoading,
  };
}

/** Lecture seule — utilisée par l'admin et par la carte du tableau de bord pro. */
export function useCompatibilitySnapshot(contractorId?: string | null) {
  return useQuery({
    queryKey: ["contractor-compatibility-snapshot", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const [profile, services, projects, territories, prequal, rules] = await Promise.all([
        supabase.from("contractor_compatibility_profiles").select("*").eq("contractor_id", contractorId!).maybeSingle(),
        supabase.from("contractor_service_preferences").select("*").eq("contractor_id", contractorId!),
        supabase.from("contractor_project_preferences").select("*").eq("contractor_id", contractorId!),
        supabase.from("contractor_territory_preferences").select("*").eq("contractor_id", contractorId!),
        supabase.from("contractor_prequalification_requirements").select("*").eq("contractor_id", contractorId!),
        supabase.from("contractor_matching_rules").select("*").eq("contractor_id", contractorId!).eq("is_active", true),
      ]);
      return {
        profile: profile.data,
        services: services.data ?? [],
        projects: projects.data ?? [],
        territories: territories.data ?? [],
        prequal: prequal.data ?? [],
        rules: rules.data ?? [],
      };
    },
  });
}
