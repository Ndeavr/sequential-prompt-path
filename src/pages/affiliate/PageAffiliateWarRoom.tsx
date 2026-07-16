/**
 * UNPRO — Affiliate War Room (Daily Call List)
 * Route: /affiliate
 *
 * Answers, in <10 seconds:
 *  - Who do I call today?
 *  - Who clicked my SMS?
 *  - Who is waiting on a proposal?
 *  - Who is waiting on payment?
 *  - How much potential commission is on my desk?
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateSelf } from "@/hooks/useAffiliateSelf";
import {
  aggregatePipeline,
  recommendPlan,
} from "@/features/affiliate/revenueMath";
import { formatPrice } from "@/lib/formatPrice";
import { PhoneCall, MousePointerClick, FileText, CreditCard, DollarSign, ArrowRight, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddLeadSheet } from "@/features/affiliate/addLead/AddLeadSheet";

type Assignment = {
  id: string;
  prospect_id: string;
  status: string;
  priority: number;
  last_activity_at: string | null;
  recommended_plan_slug: string | null;
  prospect: {
    id: string;
    business_name: string;
    city: string | null;
    category: string | null;
    phone: string | null;
    aipp_score: number | null;
  } | null;
};

function StatTile({ icon: Icon, label, value, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "border-border/40 bg-card",
    accent: "border-primary/40 bg-primary/5",
    money: "border-emerald-500/40 bg-emerald-500/5",
  };
  return (
    <div className={`rounded-2xl border ${tones[tone]} p-5 flex flex-col gap-2`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export default function PageAffiliateWarRoom() {
  const { user } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["affiliate-assignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_assignments")
        .select(
          "id, prospect_id, status, priority, last_activity_at, recommended_plan_slug, prospect:contractors_prospects(id, business_name, city, category, phone, aipp_score)"
        )
        .order("priority", { ascending: false })
        .order("assigned_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const buckets = useMemo(() => {
    const list = rows ?? [];
    return {
      toCall: list.filter((a) => a.status === "to_call"),
      inProgress: list.filter((a) => a.status === "in_progress"),
      proposalSent: list.filter((a) => a.status === "proposal_sent"),
      awaitingPayment: list.filter((a) => a.status === "awaiting_payment"),
    };
  }, [rows]);

  const potentialPlans = useMemo(() => {
    return (rows ?? [])
      .filter((a) => a.status !== "won" && a.status !== "lost")
      .map((a) => {
        const slug =
          a.recommended_plan_slug ??
          recommendPlan({
            unproScore: a.prospect?.aipp_score ?? undefined,
          }).slug;
        return slug as any;
      });
  }, [rows]);

  const pipeline = aggregatePipeline(potentialPlans);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Salle de guerre affilié
          </h1>
          <p className="text-sm text-muted-foreground">
            Votre journée en un coup d'œil. Priorité au revenu.
          </p>
        </header>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatTile
            icon={PhoneCall}
            label="À appeler"
            value={buckets.toCall.length}
            tone="accent"
          />
          <StatTile
            icon={MousePointerClick}
            label="En cours"
            value={buckets.inProgress.length}
          />
          <StatTile
            icon={FileText}
            label="Proposition envoyée"
            value={buckets.proposalSent.length}
          />
          <StatTile
            icon={CreditCard}
            label="Attend paiement"
            value={buckets.awaitingPayment.length}
          />
          <StatTile
            icon={DollarSign}
            label="Commission potentielle"
            value={formatPrice(pipeline.potentialAnnual)}
            tone="money"
          />
        </div>

        {/* Call list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {buckets.toCall.length} entrepreneurs à appeler
            </h2>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : buckets.toCall.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun entrepreneur assigné pour l'instant. Un admin doit vous assigner
                des leads.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-card overflow-hidden">
              {buckets.toCall.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/affiliate/company/${a.prospect_id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {a.prospect?.business_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[a.prospect?.category, a.prospect?.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    {a.prospect?.phone && (
                      <div className="text-sm text-muted-foreground font-mono hidden sm:block">
                        {a.prospect.phone}
                      </div>
                    )}
                    {a.prospect?.aipp_score != null && (
                      <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {a.prospect.aipp_score}
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Waiting proposal */}
        {buckets.proposalSent.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {buckets.proposalSent.length} en attente de proposition
            </h2>
            <ul className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-card overflow-hidden">
              {buckets.proposalSent.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/affiliate/company/${a.prospect_id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0 font-medium text-foreground truncate">
                      {a.prospect?.business_name ?? "—"}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
