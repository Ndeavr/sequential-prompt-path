/**
 * UNPRO — Mode Action Affilié
 * Une seule mission à l'écran : Trouver → Appeler → Envoyer → Suivre → Gagner.
 * Mobile-first, 5 grosses cartes numérotées, CTA fixe en bas.
 * Toutes les données affichées sont réelles (aucune statistique inventée).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Phone, Send, Search, LineChart, Trophy, Loader2, Plus, SkipForward,
  Check, Clock, MailOpen, MessageSquare, ExternalLink, Copy, ListFilter, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SeoHead from "@/seo/components/SeoHead";
import { useAffiliateSelf } from "@/hooks/useAffiliateSelf";
import AddProspectSheet from "@/features/affiliate/actionMode/AddProspectSheet";
import {
  useNextProspect, sendAuditInvite, recordCallOutcome, logCallStarted,
  offerFreeAppointments, useDayStats, useRefreshStats,
  type ActionProspect, type ActionAudit, type FreeAppointmentOffer,
} from "@/features/affiliate/actionMode/useActionMode";
import { formatPhoneDisplay } from "@/features/affiliate/lib/phoneUtils";

type StepState = "todo" | "active" | "done";

const SKIP_REASONS = [
  { key: "mauvais_numero", label: "Mauvais numéro" },
  { key: "pas_pertinent", label: "Pas pertinent" },
  { key: "deja_contacte", label: "Déjà contacté" },
  { key: "pas_maintenant", label: "Pas maintenant" },
];

/** Refus serveur → message clair pour l'affilié. */
const OFFER_ERRORS: Record<string, string> = {
  city_cap_reached: "Les 10 places de cette ville sont déjà prises.",
  no_personal_contact_proof: "Appelez ou contactez d'abord ce prospect.",
  lead_city_missing: "Ce prospect n'a pas de ville — complétez sa fiche.",
  not_an_active_affiliate: "Votre compte affilié n'est pas actif.",
  lead_not_found: "Prospect introuvable.",
};


function StepCard({
  n, title, subtitle, state, children,
}: { n: number; title: string; subtitle: string; state: StepState; children?: React.ReactNode }) {
  const isActive = state === "active";
  const isDone = state === "done";
  return (
    <section
      className={[
        "rounded-3xl border p-5 transition-all",
        isActive ? "border-primary/50 bg-card shadow-lg shadow-primary/5" : "border-border/40 bg-card/60",
        state === "todo" ? "opacity-60" : "",
      ].join(" ")}
    >
      <header className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold",
            isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {isDone ? <Check className="h-5 w-5" /> : n}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export default function PageAffiliateActionMode() {
  const { data: affiliate, isLoading: loadingAffiliate } = useAffiliateSelf();
  const { loading, error, next, skip } = useNextProspect();
  const refreshStats = useRefreshStats();
  const { data: stats } = useDayStats(affiliate?.id);

  const [prospect, setProspect] = useState<ActionProspect | null>(null);
  const [audit, setAudit] = useState<ActionAudit | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [called, setCalled] = useState(false);
  const [sending, setSending] = useState<"sms" | "email" | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [offer, setOffer] = useState<FreeAppointmentOffer | null>(null);
  const [offering, setOffering] = useState(false);

  const loadNext = useCallback(
    async (excludeId?: string | null) => {
      const res = await next(excludeId ?? null);
      if (!res) return;
      setProspect(res.prospect);
      setAudit(res.audit ?? null);
      setRemaining(res.remaining ?? 0);
      setEmptyReason(res.prospect ? null : res.reason ?? "no_eligible_prospect");
      setCalled(false);
      setOffer(null);
    },
    [next]
  );

  useEffect(() => {
    if (affiliate?.id) void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliate?.id]);

  const name = useMemo(() => {
    if (!prospect) return "";
    return prospect.company_name || prospect.business_name || prospect.full_name || "Entreprise sans nom";
  }, [prospect]);

  const contactFirstName = prospect?.first_name || (prospect?.full_name ? prospect.full_name.split(" ")[0] : null);
  const phone = prospect?.phone_e164 || prospect?.phone || null;
  const sent = !!audit?.sent_at;
  const opened = !!audit?.opened_at;
  const started = !!audit?.started_at;
  const completed = !!audit?.completed_at;

  const step1: StepState = prospect ? "done" : "active";
  const step2: StepState = !prospect ? "todo" : called || sent ? "done" : "active";
  const step3: StepState = !prospect ? "todo" : sent ? "done" : called ? "active" : "todo";
  const step4: StepState = !sent ? "todo" : completed ? "done" : "active";
  const step5: StepState = completed ? "active" : "todo";

  const script = prospect
    ? `Bonjour${contactFirstName ? " " + contactFirstName : ""}, ici ${affiliate?.first_name ?? affiliate?.name ?? "UNPRO"}, je travaille avec UNPRO.\n\nOn vérifie comment ${name} est comprise et recommandée par les moteurs de recherche IA${prospect.city ? ` à ${prospect.city}` : ""}.\n\nJe peux vous envoyer l'évaluation gratuite par texto tout de suite — ça prend 2 minutes à regarder. Je vous l'envoie ?`
    : "";

  async function onCall() {
    if (!prospect || !affiliate) return;
    if (!phone) {
      toast.error("Aucun numéro", { description: "Envoyez l'évaluation par courriel." });
      setCalled(true);
      return;
    }
    await logCallStarted(affiliate.id, prospect.id);
    setCalled(true);
    refreshStats();
    window.location.href = `tel:${phone}`;
  }

  async function onOutcome(outcome: "send_audit" | "callback" | "no_answer" | "not_interested") {
    if (!prospect || !affiliate) return;
    await recordCallOutcome({ affiliateId: affiliate.id, leadId: prospect.id, outcome });
    refreshStats();
    if (outcome === "send_audit") {
      setCalled(true);
      toast.success("Parfait — envoyez l'évaluation à l'étape 3.");
      return;
    }
    toast.success("Résultat enregistré");
    void loadNext(prospect.id);
  }

  async function onSend(channel: "sms" | "email") {
    if (!prospect) return;
    setSending(channel);
    try {
      const res = await sendAuditInvite(prospect.id, channel, sent);
      toast.success(channel === "sms" ? "Évaluation envoyée par texto" : "Évaluation envoyée par courriel");
      setAudit((a) => ({
        ...(a ?? { id: res.audit_id, invite_token: null, opened_at: null, started_at: null, completed_at: null }),
        id: res.audit_id,
        channel,
        sent_at: new Date().toISOString(),
      } as ActionAudit));
      refreshStats();
    } catch (e) {
      toast.error("Envoi impossible", { description: e instanceof Error ? e.message : "Réessayez." });

    } finally {
      setSending(null);
    }
  }

  async function onSkip(reason: string) {
    if (!prospect) return;
    setSkipOpen(false);
    await skip(prospect.id, reason);
    refreshStats();
    void loadNext(prospect.id);
  }

  // Formulation honnête : l'offre est PROPOSÉE. Les rendez-vous ne sont accordés
  // qu'à l'activation du profil — jamais annoncés comme « réservés ».
  const offerScript = offer
    ? `Je vous propose 3 rendez-vous qualifiés offerts — aucun frais, aucun engagement. Ils sont accordés dès l'activation de votre profil.\n\nSi vous voulez plus de volume ensuite, UNPRO calcule votre plan personnalisé et mon code ${offer.promo_code} vous donne 50 % sur le premier mois payé (une seule fois).`
    : "";

  async function onOfferFree() {
    if (!prospect || !affiliate || offering) return;
    setOffering(true);
    try {
      const res = await offerFreeAppointments({
        affiliateId: affiliate.id,
        leadId: prospect.id,
        companyName: name || null,
      });
      setOffer(res);
      refreshStats();
      toast.success("Offre enregistrée", {
        description: `Code personnel : ${res.promo_code}${
          typeof res.city_slots_remaining === "number"
            ? ` · ${res.city_slots_remaining} place(s) restante(s) à ${res.city}`
            : ""
        }`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Réessayez.";
      toast.error("Offre impossible", { description: OFFER_ERRORS[message] ?? message });
    } finally {
      setOffering(false);
    }
  }


  if (loadingAffiliate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Accès affilié requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">Votre compte n'est pas encore relié à un profil affilié UNPRO.</p>
        <Button asChild className="mt-6 h-12 rounded-2xl"><Link to="/affiliate/login">Se connecter</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <SeoHead title="Mode Action — Affiliés UNPRO" description="Trouver, appeler, envoyer l'évaluation IA, faire le suivi. UNPRO prend la relève." noindex />

      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode Action</p>
            <p className="text-sm font-semibold text-foreground">{affiliate.first_name ?? affiliate.name}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link to="/affiliate/crm"><ListFilter className="h-4 w-4" />Tous mes prospects</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 py-5">
        {/* 1 — TROUVER */}
        <StepCard n={1} title="Trouver" subtitle="Le prochain prospect prioritaire" state={step1}>
          {loading && !prospect ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Sélection en cours…</div>
          ) : prospect ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-lg font-bold leading-tight text-foreground">{name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[contactFirstName, prospect.city, prospect.category_primary || prospect.trade].filter(Boolean).join(" · ") || "Détails limités"}
                </p>
                {phone ? <p className="mt-2 text-base font-semibold text-foreground">{formatPhoneDisplay(phone)}</p> : <p className="mt-2 text-sm text-amber-600">Aucun numéro — courriel seulement</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{remaining} prospect{remaining > 1 ? "s" : ""} en attente</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSkipOpen(true)} className="gap-1.5"><SkipForward className="h-4 w-4" />Passer</Button>
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Ajouter</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {emptyReason === "no_eligible_prospect" ? "Aucun prospect à contacter maintenant. Ajoutez-en un pour continuer." : error ?? "Aucun prospect disponible."}
              </p>
              <Button onClick={() => setAddOpen(true)} className="h-12 w-full gap-2 rounded-2xl"><Plus className="h-4 w-4" />Ajouter un prospect</Button>
            </div>
          )}
        </StepCard>

        {/* 2 — APPELER */}
        <StepCard n={2} title="Appeler" subtitle="Un appel court, un objectif : envoyer l'évaluation" state={step2}>
          {prospect ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{script}</p>
                <Button variant="ghost" size="sm" className="mt-2 gap-1.5 px-0 text-xs text-muted-foreground" onClick={() => { navigator.clipboard.writeText(script); toast.success("Script copié"); }}>
                  <Copy className="h-3.5 w-3.5" />Copier le script
                </Button>
              </div>
              <Button onClick={onCall} disabled={!phone} className="h-14 w-full gap-2 rounded-2xl text-base font-semibold">
                <Phone className="h-5 w-5" />Appeler maintenant
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="h-12 rounded-xl" onClick={() => onOutcome("send_audit")}>Intéressé</Button>
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => onOutcome("callback")}>À rappeler</Button>
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => onOutcome("no_answer")}>Pas de réponse</Button>
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => onOutcome("not_interested")}>Pas intéressé</Button>
              </div>
            </div>
          ) : null}
        </StepCard>

        {/* 3 — ENVOYER */}
        <StepCard n={3} title="Envoyer l'évaluation IA" subtitle="Un lien unique, gratuit, à son nom" state={step3}>
          {prospect ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => onSend("sms")} disabled={!phone || sending !== null} className="h-14 gap-2 rounded-2xl text-base font-semibold">
                  {sending === "sms" ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}Texto
                </Button>
                <Button onClick={() => onSend("email")} disabled={!prospect.email || sending !== null} variant="secondary" className="h-14 gap-2 rounded-2xl text-base font-semibold">
                  {sending === "email" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}Courriel
                </Button>
              </div>
              {sent ? (
                <p className="text-sm text-muted-foreground">
                  Envoyée {audit?.channel === "email" ? "par courriel" : "par texto"} · <button className="underline" onClick={() => onSend((audit?.channel === "email" ? "email" : "sms") as "sms" | "email")}>renvoyer un rappel</button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Le lien est unique et vous est attribué automatiquement.</p>
              )}

              {/* Offre affilié — 3 rendez-vous offerts + 50 % du premier mois payé */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gift className="h-4 w-4 text-amber-500" />3 rendez-vous qualifiés offerts
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Réservé à vos appels personnels. S'il veut plus de volume ensuite, son plan
                  personnalisé est calculé et votre code donne 50 % du premier mois payé.
                </p>
                {offer ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                      <span className="font-mono text-base font-bold tracking-wider text-foreground">{offer.promo_code}</span>
                      <Button
                        variant="ghost" size="sm" className="gap-1.5 text-xs"
                        onClick={() => { navigator.clipboard.writeText(offer.promo_code); toast.success("Code copié"); }}
                      >
                        <Copy className="h-3.5 w-3.5" />Copier
                      </Button>
                    </div>
                    <Button
                      variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                      onClick={() => { navigator.clipboard.writeText(offerScript); toast.success("Message copié"); }}
                    >
                      <Copy className="h-3.5 w-3.5" />Copier le message d'offre
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={onOfferFree}
                    disabled={offering}
                    className="mt-3 h-12 w-full gap-2 rounded-2xl bg-amber-500 text-black hover:bg-amber-500/90"
                  >
                    {offering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    Offrir 3 rendez-vous
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </StepCard>


        {/* 4 — SUIVRE */}
        <StepCard n={4} title="Faire le suivi" subtitle="Voyez ce qui se passe vraiment" state={step4}>
          {sent ? (
            <div className="space-y-2">
              {[
                { label: "Évaluation envoyée", ok: sent, icon: Send },
                { label: "Lien ouvert", ok: opened, icon: MailOpen },
                { label: "Évaluation commencée", ok: started, icon: Clock },
                { label: "Évaluation terminée", ok: completed, icon: Check },
              ].map(({ label, ok, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-border/40 px-4 py-3">
                  <Icon className={ok ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
                  <span className={ok ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}>{label}</span>
                  {ok ? <Badge variant="secondary" className="ml-auto">Fait</Badge> : <span className="ml-auto text-xs text-muted-foreground">En attente</span>}
                </div>
              ))}
              {audit?.invite_token ? (
                <Button asChild variant="ghost" size="sm" className="gap-1.5 px-0 text-xs text-muted-foreground">
                  <a href={`/entrepreneurs/audit-ia?t=${audit.invite_token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Voir le lien envoyé</a>
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Le suivi s'active dès que l'évaluation est envoyée.</p>
          )}
        </StepCard>

        {/* 5 — GAGNER */}
        <StepCard n={5} title="UNPRO prend la relève" subtitle="Votre journée, en chiffres réels" state={step5}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Contactés", value: stats?.contacted ?? 0, icon: Phone },
              { label: "Évaluations envoyées", value: stats?.auditsSent ?? 0, icon: Send },
              { label: "Ouvertes", value: stats?.auditsOpened ?? 0, icon: MailOpen },
              { label: "Terminées", value: stats?.auditsCompleted ?? 0, icon: LineChart },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {stats?.conversions ? `${stats.conversions} activation${stats.conversions > 1 ? "s" : ""} aujourd'hui` : "Aucune activation aujourd'hui"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.commissionCents ? `${(stats.commissionCents / 100).toFixed(2)} $ de commission attribuée` : "Vos commissions confirmées apparaissent ici."}
              </p>
            </div>
          </div>
        </StepCard>
      </main>

      {/* CTA fixe */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-16 w-full gap-2 rounded-2xl text-base font-bold"
            disabled={loading}
            onClick={() => {
              if (!prospect) { void loadNext(); return; }
              if (!called && phone) { void onCall(); return; }
              void loadNext(prospect.id);
            }}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : !prospect ? <Search className="h-5 w-5" /> : !called && phone ? <Phone className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}
            {!prospect ? "TROUVER UN PROSPECT" : !called && phone ? "📞 CONTACTER LE PROCHAIN PROSPECT" : "PROSPECT SUIVANT"}
          </Button>
        </div>
      </div>

      <AddProspectSheet open={addOpen} onOpenChange={setAddOpen} affiliateId={affiliate.id} onCreated={() => void loadNext()} />

      <AlertDialog open={skipOpen} onOpenChange={setSkipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pourquoi passer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>Votre réponse améliore la prochaine sélection.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {SKIP_REASONS.map((r) => (
              <Button key={r.key} variant="outline" className="h-12 justify-start rounded-xl" onClick={() => onSkip(r.key)}>{r.label}</Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => onSkip("autre")}>Passer quand même</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
