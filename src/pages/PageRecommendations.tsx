/**
 * PageRecommendations — reveals the single real recommendation persisted for
 * the authenticated homeowner's lead.
 *
 * Truth rules (no stub, ever):
 *  - the match is read from the real `matches` rows of the user's own lead
 *  - the contractor must still pass the hard eligibility gates
 *    (active account, verified, accepting appointments, booking enabled,
 *     valid and non-expired RBQ)
 *  - if no such recommendation exists, the honest waiting state is shown and
 *    no booking CTA is rendered.
 */
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/layouts/PageShell";
import PrimaryCTA from "@/components/cta/PrimaryCTA";

interface EligibleRecommendation {
  contractorId: string;
  name: string;
  city: string | null;
  score: number;
  reason: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isEligible(pro: Record<string, unknown>): boolean {
  const rbqValid =
    typeof pro.rbq_number === "string" &&
    pro.rbq_number.trim().length > 0 &&
    pro.rbq_compliance_status === "verified" &&
    (!pro.rbq_expiry_date ||
      new Date(String(pro.rbq_expiry_date)).getTime() > Date.now());

  return (
    pro.account_status === "active" &&
    pro.verification_status === "verified" &&
    pro.is_accepting_appointments === true &&
    pro.booking_enabled === true &&
    rbqValid
  );
}

export default function PageRecommendations() {
  const [params] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const projectParam = params.get("project") ?? "";
  const leadParam = params.get("lead") ?? "";
  const projectId = UUID_RE.test(projectParam) ? projectParam : "";
  const leadId = UUID_RE.test(leadParam) ? leadParam : "";
  const hasContext = !!(projectId || leadId);

  const { data, isLoading } = useQuery({
    queryKey: ["recommendation", user?.id, leadId, projectId],
    enabled: !!user?.id && hasContext,
    queryFn: async (): Promise<EligibleRecommendation | null> => {
      // 1. Resolve the homeowner's own lead (RLS scopes to owner_profile_id).
      let resolvedLeadId = leadId;
      if (!resolvedLeadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("owner_profile_id", user!.id)
          .eq("payload->>project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lead?.id) return null;
        resolvedLeadId = lead.id as string;
      } else {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("id", resolvedLeadId)
          .eq("owner_profile_id", user!.id)
          .maybeSingle();
        if (!lead?.id) return null;
      }

      // 2. Real persisted matches for that lead only.
      const { data: matches, error } = await supabase
        .from("matches")
        .select("contractor_id, score, reasons, status")
        .eq("lead_id", resolvedLeadId)
        .order("score", { ascending: false })
        .limit(5);
      if (error || !matches?.length) return null;

      for (const match of matches) {
        if (!match.contractor_id) continue;
        if (match.status === "rejected" || match.status === "expired") continue;

        // 3. Hard eligibility gates on the real contractor.
        const { data: pro } = await supabase
          .from("contractors")
          .select(
            "id, business_name, city, account_status, verification_status, is_accepting_appointments, booking_enabled, rbq_number, rbq_compliance_status, rbq_expiry_date",
          )
          .eq("id", match.contractor_id)
          .maybeSingle();
        if (!pro || !isEligible(pro as unknown as Record<string, unknown>)) continue;

        const reasons = match.reasons as unknown;
        const reason = Array.isArray(reasons)
          ? String(reasons[0] ?? "") || null
          : typeof reasons === "string"
            ? reasons
            : null;

        return {
          contractorId: pro.id as string,
          name: (pro.business_name as string) || "Entrepreneur compatible",
          city: (pro.city as string) ?? null,
          score: Number(match.score ?? 0),
          reason,
        };
      }
      return null;
    },
  });

  const waitingHref = projectId
    ? `/dashboard/projects/${encodeURIComponent(projectId)}/waiting`
    : "/dashboard";

  const showLoading = isAuthenticated && hasContext && isLoading;
  const top = data ?? null;

  return (
    <PageShell id="recommendations" variant="app" cta={false}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-white">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Recommandation principale
        </h1>
        <p className="mt-2 text-white/70">
          Un seul entrepreneur, choisi pour votre projet — jamais une liste
          partagée.
        </p>

        <div
          className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
          data-testid="recommendation-panel"
        >
          {showLoading ? (
            <p className="text-white/60">Analyse en cours…</p>
          ) : top ? (
            <div data-testid="recommendation-result">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">{top.name}</h2>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                  Score {Math.round(top.score)}
                </span>
              </div>
              {top.city && <p className="mt-1 text-sm text-white/60">{top.city}</p>}
              {top.reason && <p className="mt-3 text-sm text-white/70">{top.reason}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`/book/${encodeURIComponent(top.contractorId)}${
                    projectId ? `?project=${encodeURIComponent(projectId)}` : ""
                  }`}
                  data-cta-canonical="book"
                  data-testid="cta-book"
                  className="inline-flex h-14 items-center justify-center rounded-[18px] bg-white px-8 font-medium text-black transition-all hover:-translate-y-[2px]"
                >
                  Prendre rendez-vous
                </Link>
                <PrimaryCTA
                  cta="alex"
                  size="lg"
                  variant="secondary"
                  label="Poser une question à Clara"
                />
              </div>
            </div>
          ) : (
            <div className="text-white/70" data-testid="recommendation-empty">
              <p className="font-medium text-white">
                Aucun entrepreneur compatible confirmé pour l'instant.
              </p>
              <p className="mt-1 text-sm">
                Votre demande reste active. Dès qu'un entrepreneur vérifié et
                disponible correspond à votre projet, nous vous l'annonçons.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={waitingHref}
                  data-testid="cta-waiting"
                  className="inline-flex h-14 items-center justify-center rounded-[18px] border border-white/15 bg-white/5 px-8 font-medium text-white transition-all hover:-translate-y-[2px]"
                >
                  Suivre ma demande
                </Link>
                <PrimaryCTA
                  cta="alex"
                  size="lg"
                  variant="secondary"
                  label="Poser une question à Clara"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
