/**
 * /admin/kdd — KDD v1: conversion revenus vérifiée + demande non servie.
 * Read-only; admin confirmed server-side (has_role + existing RLS). See docs/kdd-v1.md.
 */
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadKddV1, KddAccessDeniedError } from "@/services/kddV1Service";
import { torontoDate, type EvidenceStatus } from "@/lib/kdd/kddV1";

const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  verified: "Vérifié",
  partial: "Partiel",
  unknown: "Inconnu",
  declared: "Déclaré",
};
const EVIDENCE_VARIANT: Record<EvidenceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  verified: "default",
  partial: "secondary",
  unknown: "destructive",
  declared: "outline",
};
const STAGE_LABEL: Record<string, string> = {
  contacted_at: "Contacté", delivered_at: "Livré", opened_at: "Ouvert", clicked_at: "Clic",
  registered_at: "Inscrit", onboarded_at: "Profil", paid_at: "Payé (déclaré)", activated_at: "Activé (déclaré)",
};

const num = (n: number, d = 0) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
const money = (c: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(c / 100);
const pct = (r: number | null) => (r === null ? "inconnu" : `${num(r * 100, 1)} %`);
const day = (iso: string | null) => (iso ? torontoDate(iso) : "—");

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/40 bg-card/40 p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export default function PageAdminKddV1() {
  // Errors are returned as values so a failed load never leaves an unhandled rejection or a silent zero.
  const q = useQuery({
    queryKey: ["kdd-v1"],
    queryFn: async () => {
      try { return { data: await loadKddV1(), error: null as unknown }; }
      catch (error) { return { data: null, error }; }
    },
    retry: false,
    staleTime: 60_000,
  });
  const d = q.data?.data ?? null;
  const loadError = q.data?.error ?? (q.isError ? q.error : null);

  return (
    <>
      <Helmet>
        <title>KDD v1 — UNPRO Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="admin-theme min-h-screen p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">KDD v1 — Conversion et demande</h1>
            <p className="text-sm text-muted-foreground">
              Lecture seule. Chaque chiffre indique sa source, sa période et son niveau de preuve. Aucune action automatique.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? "Analyse en cours…" : "Actualiser"}
          </Button>
        </header>

        {q.isLoading && (
          <div className="rounded-[28px] border border-border/40 bg-card/40 p-6 text-sm text-muted-foreground" role="status">
            Analyse des journaux en cours…
          </div>
        )}

        {loadError && (
          <div className="rounded-[28px] border border-destructive/50 bg-destructive/10 p-6 space-y-3" role="alert">
            <p className="text-sm text-foreground">
              {loadError instanceof KddAccessDeniedError
                ? "Accès réservé aux administrateurs."
                : "Les données n'ont pas pu être chargées. Aucun chiffre n'est affiché pour éviter un faux zéro."}
            </p>
            {!(loadError instanceof KddAccessDeniedError) && (
              <Button size="sm" onClick={() => q.refetch()}>Réessayer</Button>
            )}
          </div>
        )}

        {d && (
          <>
            {d.truncated.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-secondary/40 p-3 text-sm text-foreground">
                Lecture partielle (limite atteinte) : {d.truncated.join(", ")}. Les totaux sont marqués « Partiel ».
              </div>
            )}

            <Section title="Constats et actions" subtitle={`Calculé le ${day(d.generatedAt)} (America/Toronto)`}>
              <ul className="space-y-3">
                {d.insights.map((i) => (
                  <li key={i.id} className="rounded-2xl border border-border/40 bg-background/40 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{i.title}</span>
                      <Badge variant={EVIDENCE_VARIANT[i.evidence]}>{EVIDENCE_LABEL[i.evidence]}</Badge>
                    </div>
                    <div className="text-base font-semibold text-foreground break-words">{i.value}</div>
                    {i.detail && <p className="text-xs text-muted-foreground">{i.detail}</p>}
                    <p className="text-xs text-muted-foreground">Source : {i.provenance.join(", ")} · Période : {i.window}</p>
                    <p className="text-sm text-foreground"><span className="font-medium">Action : </span>{i.action}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              title="Objectif 3 000 entreprises à 350 $ d'ici le 31 déc. 2026"
              subtitle="Compte unique par entreprise : droit d'activation + paiement Stripe LIVE signé, payé, 350,00 $ CAD avant taxes, non remboursé ni contesté."
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Entreprises vérifiées" value={num(d.entry.verifiedBusinesses)} hint={`sur ${num(d.pace.goal)}`} />
                <Stat label="Montant avant taxes" value={money(d.entry.verifiedPretaxCents)} />
                <Stat label="Écart" value={num(d.pace.gap)} hint={`${num(d.pace.daysRemaining)} jours restants`} />
                <Stat
                  label="Rythme requis"
                  value={d.pace.requiredPerDay === null ? "—" : `${num(d.pace.requiredPerDay, 1)}/jour`}
                  hint={`Observé (30 j) : ${num(d.pace.observedLast30PerDay, 2)}/jour`}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="text-left text-xs text-muted-foreground pb-2">Exclus de l'objectif</caption>
                  <tbody className="[&_td]:py-1.5 [&_td]:pr-3">
                    <tr><td className="text-muted-foreground">TEST / QA</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.test)}</td></tr>
                    <tr><td className="text-muted-foreground">Remboursés / contestés / désactivés</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.reversed)}</td></tr>
                    <tr><td className="text-muted-foreground">Mode LIVE inconnu</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.unknownLivemode)}</td></tr>
                    <tr><td className="text-muted-foreground">Droit sans preuve Stripe correspondante</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.ledgerProofMissing)}</td></tr>
                    <tr><td className="text-muted-foreground">Droit sans identité d'entreprise</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.ledgerIdentityMissing)}</td></tr>
                    <tr><td className="text-muted-foreground">Payé LIVE sans activation prouvée</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.livePaidWithoutActivation)}</td></tr>
                    <tr><td className="text-muted-foreground">Non payé / en attente</td><td className="tabular-nums text-foreground">{num(d.entry.excluded.unpaidOrPending)}</td></tr>
                    <tr><td className="text-muted-foreground">Événements Stripe dupliqués</td><td className="tabular-nums text-foreground">{num(d.entry.duplicateEvents)}</td></tr>
                    <tr><td className="text-muted-foreground">2e paiement même entreprise (signalé)</td><td className="tabular-nums text-foreground">{num(d.entry.duplicatePaidSessionsSameBusiness)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Autres offres payées (séparées)</h3>
                {d.entry.otherPaidOffers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune autre offre payée avec preuve LIVE.</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {d.entry.otherPaidOffers.map((o) => (
                      <li key={`${o.offer}-${o.excludedFromGoalReason}`} className="text-foreground">
                        {o.offer} — {num(o.sessions)} sessions · {money(o.amountSubtotalCents)} · <span className="text-muted-foreground">{o.excludedFromGoalReason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Dernier événement Stripe reçu : {day(d.entry.latestWebhookAt)}. Non lisible par l'administration : {d.unreadable.join(", ")}.
              </p>
            </Section>

            <Section
              title="Cohortes mensuelles (date de création du prospect)"
              subtitle="Horodatages déclarés par le suivi. « inconnu » = étape jamais instrumentée, pas zéro. Aucune causalité."
            >
              {d.cohorts.cohorts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune cohorte disponible.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="min-w-[720px] w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-2">Mois</th><th className="pr-2">Taille</th>
                        {d.cohorts.cohorts[0].stages.map((s) => <th key={s.stage} className="pr-2">{STAGE_LABEL[s.stage]}</th>)}
                        <th className="pr-2">350 $ vérifié</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.cohorts.cohorts.map((c) => (
                        <tr key={c.month} className="border-t border-border/30 text-foreground tabular-nums">
                          <td className="py-1.5 pr-2">{c.month}</td>
                          <td className="pr-2">{num(c.size)}</td>
                          {c.stages.map((s) => (
                            <td key={s.stage} className="pr-2">
                              {s.status === "unknown" ? <span className="text-muted-foreground">inconnu</span> : `${num(s.count)} (${pct(s.rate)})`}
                            </td>
                          ))}
                          <td className="pr-2">{num(c.verifiedPaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Source : acquisition_funnel_state · Période {day(d.cohorts.window.from)} → {day(d.cohorts.window.to)} ·
                {" "}{num(d.cohorts.rowsWithoutIdentity)} lignes sans identité · {num(d.cohorts.duplicateRows)} doublons ·
                {" "}{num(d.cohorts.verifiedNotInFunnel)} activations vérifiées sans ligne de cohorte (jointure manquante).
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Instantané des étapes actuelles</h3>
                  <p className="text-xs text-muted-foreground mb-2">Photo à {day(d.cohorts.snapshotAt)}, pas une cohorte.</p>
                  <ul className="text-sm space-y-1">
                    {d.cohorts.snapshot.map((s) => (
                      <li key={s.stage} className="flex justify-between text-foreground"><span>{s.stage}</span><span className="tabular-nums">{num(s.count)}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Journal d'activation (événements)</h3>
                  <p className="text-xs text-muted-foreground mb-2">Source : activation_flow_events. Événements ≠ entreprises uniques.</p>
                  {d.flowSteps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun événement.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {d.flowSteps.map((s) => (
                        <li key={s.step} className="text-foreground">
                          {s.step} — {num(s.events)} év. · {num(s.uniqueIdentities)} identités · {num(s.eventsWithoutIdentity)} sans identité
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Section>

            <Section
              title="Demande non servie — priorités service × ville"
              subtitle="Demandes réelles de propriétaires sans entrepreneur disponible. Synthétiques et résolues exclues quand la preuve existe."
            >
              {d.demand.priorities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune demande non servie admissible pour la période.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[560px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2">Service</th><th className="pr-2">Ville</th><th className="pr-2">Demandes uniques</th>
                        <th className="pr-2">Événements</th><th className="pr-2">Sans identité</th><th className="pr-2">Dernière</th><th className="pr-2">Résolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.demand.priorities.map((p) => (
                        <tr key={p.key} className="border-t border-border/30 text-foreground tabular-nums">
                          <td className="py-1.5 pr-2">{p.service}</td><td className="pr-2">{p.city}</td>
                          <td className="pr-2">{num(p.uniqueDemands)}</td><td className="pr-2">{num(p.events)}</td>
                          <td className="pr-2">{num(p.unidentifiedEvents)}</td><td className="pr-2">{day(p.lastSeen)}</td>
                          <td className="pr-2 text-muted-foreground">{p.resolutionTracked ? "suivie" : "non suivie"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Sources : {"alex_no_match_cases, alex_waitlist_requests"} · Période {day(d.demand.window.from)} → {day(d.demand.window.to)} ·
                {" "}Exclus : {num(d.demand.excludedSynthetic)} synthétiques, {num(d.demand.excludedResolved)} résolus, {num(d.demand.missingServiceOrCity)} incomplets.
              </p>
              <p className="text-sm text-foreground">
                Action : revoir chaque priorité dans <Link to="/admin/no-match-monitoring" className="underline">Sans match</Link>; aucun envoi, jumelage ou licence n'est modifié depuis ce panneau.
              </p>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
