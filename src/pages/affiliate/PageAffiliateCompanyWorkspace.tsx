/**
 * UNPRO — Affiliate Company Workspace (The Money Screen)
 * Route: /affiliate/company/:id
 *
 * Single scroll showing everything an affiliate needs to close a lead:
 *  - Contact card (tap-to-call phone, email, website)
 *  - SMS history timeline (body snapshot, sent_at, clicked_at)
 *  - Sticky revenue intelligence panel with recommended plan + commission
 *  - Action bar (log call, mark won/lost)
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AffiliateRevenueIntelligencePanel from "@/features/affiliate/components/AffiliateRevenueIntelligencePanel";
import { Phone, Mail, Globe, MapPin, ArrowLeft, MessageSquare, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PageAffiliateCompanyWorkspace() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["prospect", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contractors_prospects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: assignment } = useQuery({
    queryKey: ["assignment-for-prospect", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_assignments")
        .select("*")
        .eq("prospect_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: smsHistory } = useQuery({
    queryKey: ["outreach", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("outreach_logs")
        .select("id, channel, template_id, body_snapshot, sent_at, clicked, clicked_at, opened")
        .eq("prospect_id", id)
        .order("sent_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_activities")
        .select("*")
        .eq("prospect_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!assignment?.id) throw new Error("Aucune assignation.");
      const payload: any = { status, last_activity_at: new Date().toISOString() };
      if (status === "won") payload.won_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("affiliate_assignments")
        .update(payload)
        .eq("id", assignment.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast.success(`Statut mis à jour : ${status}`);
      qc.invalidateQueries({ queryKey: ["assignment-for-prospect", id] });
      qc.invalidateQueries({ queryKey: ["affiliate-assignments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const logCall = useMutation({
    mutationFn: async (outcome: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user?.id || !id) throw new Error("Non authentifié.");
      const { error } = await (supabase as any).from("affiliate_activities").insert({
        affiliate_id: u.user.id,
        prospect_id: id,
        activity_type: "call",
        outcome,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appel enregistré");
      qc.invalidateQueries({ queryKey: ["activities", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const signals = useMemo(() => {
    return {
      reviewCount: prospect?.reviews_count ?? prospect?.review_count ?? 0,
      unproScore: prospect?.aipp_score ?? null,
      demandLevel: "medium" as const,
      territorySize: "medium" as const,
      recommendedPlanSlug: assignment?.recommended_plan_slug ?? null,
    };
  }, [prospect, assignment]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Entrepreneur introuvable ou non assigné.</p>
          <Link to="/affiliate" className="text-primary underline text-sm">
            Retour à la salle de guerre
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <Link
          to="/affiliate"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left + Center */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {prospect.business_name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[prospect.category, prospect.city, prospect.region]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {prospect.aipp_score != null && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {prospect.aipp_score}
                    </div>
                    <div className="text-xs text-muted-foreground">Score UNPRO</div>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/40">
                {prospect.phone && (
                  <a
                    href={`tel:${prospect.phone}`}
                    className="flex items-center gap-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors px-4 py-3"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Appeler</div>
                      <div className="font-mono font-medium text-foreground">
                        {prospect.phone}
                      </div>
                    </div>
                  </a>
                )}
                {prospect.email && (
                  <a
                    href={`mailto:${prospect.email}`}
                    className="flex items-center gap-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors px-4 py-3"
                  >
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Courriel</div>
                      <div className="text-sm truncate">{prospect.email}</div>
                    </div>
                  </a>
                )}
                {prospect.website && (
                  <a
                    href={prospect.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors px-4 py-3"
                  >
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Site</div>
                      <div className="text-sm truncate">{prospect.website}</div>
                    </div>
                  </a>
                )}
                {prospect.service_area && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Zone</div>
                      <div className="text-sm">{prospect.service_area}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action bar */}
            {assignment && (
              <div className="rounded-2xl border border-border/40 bg-card p-4 flex flex-wrap gap-2">
                <button
                  onClick={() => logCall.mutate("connected")}
                  disabled={logCall.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  <PhoneCall className="h-4 w-4" /> Enregistrer un appel
                </button>
                <button
                  onClick={() => updateStatus.mutate("proposal_sent")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Proposition envoyée
                </button>
                <button
                  onClick={() => updateStatus.mutate("won")}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  <CheckCircle2 className="h-4 w-4" /> Gagné
                </button>
                <button
                  onClick={() => updateStatus.mutate("lost")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <XCircle className="h-4 w-4" /> Perdu
                </button>
              </div>
            )}

            {/* SMS history */}
            <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Historique SMS
              </h2>
              {!smsHistory || smsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun SMS envoyé à cet entrepreneur.
                </p>
              ) : (
                <ul className="space-y-3">
                  {smsHistory.map((m: any) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(m.sent_at).toLocaleString("fr-CA")}</span>
                        <span className="flex items-center gap-2">
                          {m.clicked || m.clicked_at ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">
                              Cliqué
                            </span>
                          ) : m.opened ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-medium">
                              Ouvert
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Envoyé
                            </span>
                          )}
                        </span>
                      </div>
                      {m.body_snapshot && (
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {m.body_snapshot}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Activity log */}
            {activities && activities.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Activité
                </h2>
                <ul className="space-y-2 text-sm">
                  {activities.map((a: any) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>
                        {a.activity_type} {a.outcome ? `— ${a.outcome}` : ""}
                      </span>
                      <span className="text-xs">
                        {new Date(a.created_at).toLocaleString("fr-CA")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right sticky */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <AffiliateRevenueIntelligencePanel
                companyName={prospect.business_name}
                signals={signals}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
