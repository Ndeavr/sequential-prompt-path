import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProspectWithScore {
  id: string;
  business_name: string | null;
  main_city: string | null;
  email: string | null;
  telephone: string | null;
  service: string | null;
  domaine: string | null;
  status: string | null;
  langue_preferee: string;
  aipp_pre_score: number | null;
  created_at: string;
  score?: {
    score_visibilite: number;
    score_conversion: number;
    score_confiance: number;
    nombre_avis: number;
    revenu_manque_estime: number;
  } | null;
}

export function useProspectsWithScores() {
  return useQuery({
    queryKey: ["prospects-aipp-pipeline"],
    queryFn: async () => {
      const { data: prospects, error } = await supabase
        .from("prospects")
        .select("id, business_name, main_city, email, telephone, service, domaine, status, langue_preferee, aipp_pre_score, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const ids = (prospects || []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data: scores } = await supabase
        .from("scores_aipp_prospects")
        .select("prospect_id, score_visibilite, score_conversion, score_confiance, nombre_avis, revenu_manque_estime")
        .in("prospect_id", ids);

      const scoreMap = new Map(
        (scores || []).map((s) => [s.prospect_id, s])
      );

      return (prospects || []).map((p) => ({
        ...p,
        score: scoreMap.get(p.id) || null,
      })) as ProspectWithScore[];
    },
  });
}

export function useCampagnesAcquisition() {
  return useQuery({
    queryKey: ["campagnes-acquisition"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campagnes_acquisition")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProspectDetail(prospectId: string | null) {
  return useQuery({
    queryKey: ["prospect-detail", prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      if (!prospectId) return null;

      const [prospectRes, scoreRes, insightsRes, emailsRes, smsRes, screenshotsRes] = await Promise.all([
        supabase.from("prospects").select("*").eq("id", prospectId).single(),
        supabase.from("scores_aipp_prospects").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(1),
        supabase.from("insights_prospects").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(1),
        supabase.from("sequences_emails").select("*").eq("prospect_id", prospectId).order("etape", { ascending: true }),
        supabase.from("evenements_sms").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }),
        supabase.from("audits_screenshots").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }),
      ]);

      return {
        prospect: prospectRes.data,
        score: scoreRes.data?.[0] || null,
        insights: insightsRes.data?.[0] || null,
        emails: emailsRes.data || [],
        sms: smsRes.data || [],
        screenshots: screenshotsRes.data || [],
      };
    },
  });
}

export function useGenerateAIPPScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      // Mock AIPP score generation
      const visibilite = Math.round(Math.random() * 40 + 20);
      const conversion = Math.round(Math.random() * 30 + 10);
      const confiance = Math.round(Math.random() * 50 + 30);
      const avis = Math.floor(Math.random() * 80);
      const revenuManque = Math.round((100 - visibilite) * 450 + Math.random() * 5000);

      const { error } = await supabase.from("scores_aipp_prospects").insert({
        prospect_id: prospectId,
        score_visibilite: visibilite,
        score_conversion: conversion,
        score_confiance: confiance,
        nombre_avis: avis,
        revenu_manque_estime: revenuManque,
        ecart_conversion: visibilite - conversion,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects-aipp-pipeline"] });
      toast({ title: "Score AIPP généré", description: "L'analyse est terminée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de générer le score.", variant: "destructive" });
    },
  });
}

export function useGenerateEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ prospectId, langue }: { prospectId: string; langue: string }) => {
      const isFr = langue === "fr";
      const sujet = isFr
        ? "Votre visibilité en ligne peut être améliorée"
        : "Your online visibility can be improved";
      const contenu = isFr
        ? `<p>Bonjour,</p><p>Nous avons analysé votre présence en ligne et identifié des opportunités d'amélioration significatives pour votre entreprise.</p><p>Votre score AIPP indique un écart important entre votre visibilité et votre potentiel de conversion.</p><p>Souhaitez-vous en discuter ?</p><p>— L'équipe UNPRO</p>`
        : `<p>Hello,</p><p>We analyzed your online presence and identified significant improvement opportunities for your business.</p><p>Your AIPP score shows a notable gap between your visibility and conversion potential.</p><p>Would you like to discuss this?</p><p>— The UNPRO Team</p>`;

      const { error } = await supabase.from("sequences_emails").insert({
        prospect_id: prospectId,
        etape: 1,
        sujet,
        contenu,
        langue,
        statut: "brouillon",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect-detail"] });
      toast({ title: "Email généré", description: "Le brouillon est prêt pour révision." });
    },
  });
}
