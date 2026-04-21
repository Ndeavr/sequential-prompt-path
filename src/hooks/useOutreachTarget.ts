/**
 * UNPRO — Hook to resolve outreach target by slug + token
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OutreachPageViewModel, OutreachLandingPayload } from "@/types/outreachFunnel";

function buildDetectedSignals(payload: OutreachLandingPayload) {
  const signals: OutreachPageViewModel["detectedSignals"] = [];
  const ds = payload.detectedSignals;

  if (payload.websiteUrl) {
    signals.push({ label: "Site web détecté", status: ds?.websiteFound ? "detected" : "pending" });
    if (ds?.httpsEnabled) signals.push({ label: "HTTPS actif", status: "detected" });
  }
  if (ds?.googleProfileLikely) signals.push({ label: "Fiche Google potentielle trouvée", status: "detected" });
  if (ds?.phoneDetected || payload.phone) signals.push({ label: "Téléphone public détecté", status: "detected" });
  if (ds?.servicesDetected) signals.push({ label: "Pages de services détectées", status: "detected" });
  if (payload.rbqNumber) signals.push({ label: "RBQ à valider", status: ds?.rbqPending ? "pending" : "detected" });

  return signals;
}

function getCtaLabels(status: OutreachPageViewModel["preAuditStatus"]) {
  switch (status) {
    case "complete": return { primary: "Voir mon analyse", secondary: "Corriger mes blocages" };
    case "partial": return { primary: "Continuer l'analyse", secondary: undefined };
    case "prepared": return { primary: "Confirmer et lancer", secondary: undefined };
    default: return { primary: "Lancer mon analyse", secondary: undefined };
  }
}

export function useOutreachTarget(slug: string, token: string | null) {
  const [model, setModel] = useState<OutreachPageViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let query = supabase.from("outreach_targets" as any).select("*");
        if (token) {
          query = query.eq("secure_token", token);
        } else {
          query = query.eq("slug", slug);
        }
        const { data, error: err } = await query.maybeSingle();
        const row = data as any;
        if (err || !row) {
          setError("Target introuvable");
          return;
        }

        // Mark first view
        if (!row.first_viewed_at) {
          supabase.from("outreach_targets" as any).update({ first_viewed_at: new Date().toISOString() } as any).eq("id", row.id).then(() => {});
        }

        const payload = (row.payload || {}) as OutreachLandingPayload;
        const preAuditStatus = (payload.preAuditStatus || "not_started") as OutreachPageViewModel["preAuditStatus"];
        const ctas = getCtaLabels(preAuditStatus);

        setModel({
          businessName: row.business_name,
          city: row.city,
          websiteUrl: row.website_url,
          category: row.category,
          founderMode: payload.founderMode ?? false,
          preAuditStatus,
          detectedSignals: buildDetectedSignals({ ...payload, websiteUrl: row.website_url, phone: row.phone, rbqNumber: row.rbq_number }),
          primaryCtaLabel: ctas.primary,
          secondaryCtaLabel: ctas.secondary,
          confirmationRequired: preAuditStatus !== "complete",
          targetId: row.id,
          secureToken: row.secure_token,
          slug: row.slug,
          preAuditId: row.pre_audit_id,
          contractorId: row.contractor_id,
        });
      } catch {
        setError("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, token]);

  const trackEvent = useCallback(async (eventName: string, props: Record<string, unknown> = {}) => {
    if (!model) return;
    await supabase.from("outreach_page_events" as any).insert({
      target_id: model.targetId,
      event_name: eventName,
      event_props: props as any,
    } as any);
  }, [model]);

  const confirmIdentity = useCallback(async () => {
    if (!model) return;
    await supabase.from("outreach_targets" as any).update({
      claimed_at: new Date().toISOString(),
      landing_status: "claimed",
    } as any).eq("id", model.targetId);
    await trackEvent("identity_confirmed");
  }, [model, trackEvent]);

  return { model, loading, error, trackEvent, confirmIdentity };
}
