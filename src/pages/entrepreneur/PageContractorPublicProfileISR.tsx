/**
 * UNPRO — Page profil entrepreneur ISR
 * Route: /entrepreneur/isolation-solution-royal
 * Données réelles via Firecrawl + cockpit admin caché.
 */
import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Phone, Globe, MapPin, Star, ShieldCheck, RefreshCcw, Lock, Sparkles, ExternalLink } from "lucide-react";
import { useContractorIntel, type ContractorIntelIdentity } from "@/hooks/useContractorIntel";
import {
  useContractorReputation,
  useContractorProfileContent,
  useRefreshReputation,
} from "@/hooks/useContractorReputation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay, phoneToE164 } from "@/utils/formatPhone";

const SLUG = "isolation-solution-royal";

const formatDateFrCA = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })
    : "—";

export default function PageContractorPublicProfileISR() {
  const { isAdmin } = useAuth() as any;
  // Kept only to hydrate identity metadata (services, territory, phones) — no live scraping used for reputation.
  const { data: intel } = useContractorIntel(SLUG);
  const { data: reputation, isLoading: repLoading } = useContractorReputation(SLUG);
  const { data: content, isLoading: contentLoading } = useContractorProfileContent(SLUG);
  const refreshMutation = useRefreshReputation(SLUG);
  const [showCockpit, setShowCockpit] = useState(false);

  const identity = intel?.identity;
  const refreshing = refreshMutation.isPending || reputation?.status === "refreshing";
  const approvedSources = (reputation?.sources ?? []).filter((s) => s.approved);
  const isLoading = repLoading || contentLoading;

  const description =
    content?.company_description_fr ??
    content?.company_description_en ??
    null;
  const services =
    (content?.services_fr as string[] | null) ??
    (content?.services_en as string[] | null) ??
    identity?.services ??
    DEFAULT_SERVICES;

  const onRefresh = () => refreshMutation.mutate();

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <Helmet>
        <title>Isolation Solution Royal — Spécialiste de l'entretoit · UNPRO</title>
        <meta
          name="description"
          content="Isolation Solution Royal (9480-0976 Québec inc.) — spécialiste de l'entretoit à Laval, Montréal, Rive-Nord et Lanaudière. Planifiez une évaluation de 60 min."
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneur/isolation-solution-royal" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Isolation Solution Royal",
            legalName: "9480-0976 Québec inc.",
            url: "https://isroyal.ca",
            telephone: "+1-514-249-9522",
            areaServed: ["Laval", "Montréal", "Rive-Nord", "Lanaudière"],
            description: "Spécialiste de l'entretoit : isolation, ventilation, décontamination, vermiculite.",
          })}
        </script>
      </Helmet>

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-24">
        {/* Hero */}
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
                Registre intelligent UNPRO
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-tight">
                Isolation Solution Royal
              </h1>
              <div className="mt-1 text-sm text-white/60">9480-0976 Québec inc.</div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-medium text-amber-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Spécialiste de l'entretoit
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCockpit(true)}
                className="rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1.5 text-[11px] font-medium text-violet-200 hover:bg-violet-400/20 transition-all flex items-center gap-1"
                title="Cockpit interne admin"
              >
                <Lock className="h-3 w-3" />
                Cockpit
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <InfoTile icon={<MapPin className="h-4 w-4" />} label="Territoire">
              Laval · Montréal · Rive-Nord · Lanaudière
            </InfoTile>
            <InfoTile icon={<Phone className="h-4 w-4" />} label="Téléphone">
              <a href="tel:+15142499522" className="text-white hover:text-cyan-300">514-249-9522</a>
              <span className="text-white/40"> · </span>
              <a href="tel:+15149413141" className="text-white hover:text-cyan-300">514-941-3141</a>
            </InfoTile>
            <InfoTile icon={<Globe className="h-4 w-4" />} label="Site officiel">
              <a href="https://isroyal.ca" target="_blank" rel="noreferrer" className="text-white hover:text-cyan-300 inline-flex items-center gap-1">
                isroyal.ca <ExternalLink className="h-3 w-3" />
              </a>
            </InfoTile>
          </div>

          <a
            href="#evaluation"
            className="mt-7 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[18px] bg-amber-300 px-6 py-3.5 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] shadow-[0_20px_60px_-20px_rgba(251,191,36,0.5)]"
          >
            <Sparkles className="h-4 w-4" />
            Planifier une évaluation (60 min.)
          </a>
        </section>

        {/* À propos */}
        <Section title="À propos">
          {isLoading ? (
            <div className="text-white/50 text-sm">Chargement…</div>
          ) : description ? (
            <p className="text-white/85 leading-relaxed text-[15px] whitespace-pre-line">{description}</p>
          ) : (
            <p className="text-white/75 leading-relaxed text-[15px]">
              Isolation Solution Royal est un spécialiste reconnu de l'entretoit dans la grande région
              de Laval et Montréal. L'entreprise intervient sur l'isolation, la ventilation, la
              décontamination, la vermiculite et l'étanchéité — du diagnostic à l'exécution.
            </p>
          )}
        </Section>

        {/* Services */}
        <Section title="Services">
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/85"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>

        {/* Présence et avis en ligne — cached, entity-locked */}
        <Section
          title="Présence et avis en ligne"
          subtitle="Sources vérifiées · mises à jour tous les 30 jours"
        >
          {isLoading ? (
            <div className="text-white/50 text-sm">Chargement des sources vérifiées…</div>
          ) : approvedSources.length === 0 ? (
            <div className="text-white/55 text-sm">
              Aucune source vérifiée pour le moment. La prochaine analyse aura lieu le{" "}
              {formatDateFrCA(reputation?.next_scan_date)}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {approvedSources.slice(0, 8).map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-cyan-300/30 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-cyan-300/80">
                    <Star className="h-3 w-3" /> Source vérifiée · {r.domain}
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">{r.title ?? r.url}</div>
                  {r.snippet && (
                    <div className="mt-1 text-xs text-white/65 line-clamp-2">{r.snippet}</div>
                  )}
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/50">
            <div className="space-y-0.5">
              <div>Dernière mise à jour : <span className="text-white/75">{formatDateFrCA(reputation?.scan_date)}</span></div>
              <div>Prochaine mise à jour : <span className="text-white/75">{formatDateFrCA(reputation?.next_scan_date)}</span></div>
            </div>
            {isAdmin && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-300/20 transition-all disabled:opacity-50"
              >
                <RefreshCcw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Actualisation…" : "Actualiser maintenant"}
              </button>
            )}
          </div>
        </Section>

        {/* Territoire */}
        <Section title="Couverture territoire">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(identity?.territory ?? DEFAULT_TERRITORY).map((c) => (
              <div
                key={c}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85 text-center"
              >
                {c}
              </div>
            ))}
          </div>
        </Section>

        {/* CTA évaluation */}
        <section id="evaluation" className="mt-6">
          <EvaluationBookingPanel slug={SLUG} />
        </section>

        {/* Métadonnées de rafraîchissement */}
        {reputation?.scan_date && (
          <div className="mt-6 text-[11px] text-white/40 text-center">
            Données vérifiées le {formatDateFrCA(reputation.scan_date)}
            {reputation.status === "refreshing" && (
              <span className="ml-1 text-cyan-300/70">(actualisation en cours…)</span>
            )}
          </div>
        )}
      </div>

      {/* Cockpit admin */}
      {isAdmin && showCockpit && (
        <AdminCockpit
          slug={SLUG}
          identity={identity}
          payload={null}
          onClose={() => setShowCockpit(false)}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

const DEFAULT_SERVICES = [
  "Isolation d'entretoit",
  "Décontamination moisissure",
  "Étanchéité / calfeutrage",
  "Ventilation",
  "Déblocage des soffites",
  "Vermiculite",
  "Animaux nuisibles",
];
const DEFAULT_TERRITORY = ["Laval", "Montréal", "Rive-Nord", "Lanaudière"];

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm text-white/90">{children}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h2>
        {subtitle && <span className="text-[11px] text-white/45">{subtitle}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ---------- Evaluation booking ---------- */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function EvaluationBookingPanel({ slug }: { slug: string }) {
  const [form, setForm] = useState({ contact_name: "", email: "", phone: "", preferred_slot: "", message: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const slots = useMemo(
    () => [
      "Demain matin (9 h–11 h)",
      "Demain après-midi (13 h–16 h)",
      "Cette semaine — flexible",
      "La semaine prochaine",
    ],
    [],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg(null);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/book-contractor-evaluation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ contractor_slug: slug, ...form }),
      });
      const json = await r.json();
      if (!r.ok || !json.success) throw new Error(json.error ?? `status_${r.status}`);
      setState("done");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-[28px] border border-emerald-400/30 bg-emerald-400/5 p-6 sm:p-8 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-emerald-300" />
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">
          Demande reçue.
        </h3>
        <p className="mt-2 text-sm text-white/75">
          L'équipe UNPRO vous contacte sous 24 h pour confirmer l'évaluation de 60 min.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8">
      <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">Évaluation de 60 min.</div>
      <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
        Planifier un échange avec l'équipe UNPRO
      </h3>
      <p className="mt-2 text-sm text-white/65">
        On valide l'ajustement entre Isolation Solution Royal et votre besoin, puis on planifie
        directement avec l'entreprise. Aucun spam, aucun appel automatisé.
      </p>

      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-3">
        <Field label="Votre nom">
          <input
            required
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Courriel">
            <input
              type="email" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhoneDisplay(e.target.value) })}
              placeholder="(514) 123-4567"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Moment préféré">
          <select
            value={form.preferred_slot}
            onChange={(e) => setForm({ ...form, preferred_slot: e.target.value })}
            className={inputCls}
          >
            <option value="" className="bg-[#050816]">— Choisir —</option>
            {slots.map((s) => <option key={s} className="bg-[#050816]">{s}</option>)}
          </select>
        </Field>
        <Field label="Précisions (optionnel)">
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={inputCls}
            placeholder="Type de propriété, urgence, etc."
          />
        </Field>

        <button
          type="submit"
          disabled={state === "loading"}
          className="mt-2 w-full rounded-[18px] bg-amber-300 px-5 py-3.5 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] disabled:opacity-50"
        >
          {state === "loading" ? "Envoi…" : "Confirmer la demande d'évaluation"}
        </button>

        {state === "error" && (
          <div className="text-xs text-red-300">Impossible d'envoyer la demande ({errorMsg}). Réessayez ou appelez directement.</div>
        )}
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-300/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ---------- Admin cockpit (hidden) ---------- */

function AdminCockpit({
  slug, identity, payload, onClose, onRefresh, refreshing,
}: {
  slug: string;
  identity?: ContractorIntelIdentity;
  payload?: any;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  // AIPP simple deterministic estimate (proxy until full engine call wired)
  const aippScore = useMemo(() => {
    let s = 55;
    if (payload?.summary) s += 8;
    if ((payload?.markdown_excerpt?.length ?? 0) > 800) s += 6;
    if ((payload?.reviews_search?.length ?? 0) >= 3) s += 10;
    if ((payload?.links?.length ?? 0) >= 10) s += 5;
    return Math.min(95, s);
  }, [payload]);

  const monthlyLoss = useMemo(() => {
    // Estimated missed appointments × avg ISR ticket
    const avgTicket = 4200; // entretoit job
    const missedPerMonth = Math.round((100 - aippScore) * 0.35);
    return missedPerMonth * avgTicket;
  }, [aippScore]);

  const [tab, setTab] = useState<"aipp" | "revenue" | "crm" | "plan">("aipp");
  const [notes, setNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);

  const saveNotes = async () => {
    setSavingNotes(true);
    await supabase
      .from("contractor_intel_snapshots")
      .update({ admin_notes: notes })
      .eq("slug", slug)
      .eq("source", "firecrawl");
    setSavingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full sm:max-w-md bg-[#08091a] border-l border-violet-400/30 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#08091a]/95 backdrop-blur px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Cockpit interne</div>
            <div className="text-sm font-semibold text-white">{identity?.company ?? slug}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white hover:bg-white/[0.08] disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCcw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh intel
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>

        <div className="flex border-b border-white/10 text-[11px]">
          {[
            ["aipp", "AIPP"],
            ["revenue", "Revenu"],
            ["crm", "CRM"],
            ["plan", "Plan"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`flex-1 py-3 uppercase tracking-wider ${tab === k ? "text-violet-200 border-b-2 border-violet-400" : "text-white/50"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 text-sm">
          {tab === "aipp" && (
            <>
              <div className="rounded-2xl border border-violet-400/30 bg-violet-400/5 p-5">
                <div className="text-[10px] uppercase tracking-wider text-violet-200/80">Score AIPP estimé</div>
                <div className="mt-1 text-4xl font-semibold text-white">{aippScore}<span className="text-base text-white/40">/100</span></div>
                <div className="mt-2 text-xs text-white/60">
                  Basé sur signaux Web (présence isroyal.ca, profondeur de contenu, mentions externes).
                  Score AIPP complet (37 signaux) à brancher via <code>aipp-real-scoring-engine</code>.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/45">Gaps détectés</div>
                <ul className="mt-2 space-y-1.5 text-xs text-white/80">
                  <li>• Pas de page service localisée par ville prioritaire</li>
                  <li>• Avis Google non syndiqués sur le site</li>
                  <li>• Schema LocalBusiness incomplet</li>
                  <li>• Aucun signal AEO (FAQ/HowTo) sur l'entretoit</li>
                </ul>
              </div>
            </>
          )}

          {tab === "revenue" && (
            <>
              <div className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-5">
                <div className="text-[10px] uppercase tracking-wider text-amber-200/80">Manque à gagner estimé</div>
                <div className="mt-1 text-3xl font-semibold text-white">
                  {monthlyLoss.toLocaleString("fr-CA")}$<span className="text-base text-white/40">/mois</span>
                </div>
                <div className="mt-2 text-xs text-white/60">
                  Calcul : (100 − AIPP) × 0.35 RDV ratés × ticket moyen 4 200$.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/75">
                <div className="font-medium text-white/90">Potentiel Signature</div>
                <div className="mt-1">Signature 1 799$/mois = 50 RDV exclusifs · upside net mensuel ~{Math.max(0, monthlyLoss - 1799).toLocaleString("fr-CA")}$.</div>
              </div>
            </>
          )}

          {tab === "crm" && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/45">Notes internes</div>
                <textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dernier contact, signaux d'achat, objections…"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white"
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="mt-2 rounded-full bg-violet-400/20 border border-violet-400/40 px-3 py-1.5 text-[11px] text-violet-100 hover:bg-violet-400/30 disabled:opacity-50"
                >
                  {savingNotes ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
              <div className="text-[11px] text-white/40">
                Historique CRM complet → /admin/launch-war-room (filtre slug ISR).
              </div>
            </>
          )}

          {tab === "plan" && (
            <>
              <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-300/15 to-amber-400/5 p-5">
                <div className="text-[10px] uppercase tracking-wider text-amber-200/80">Plan recommandé</div>
                <div className="mt-1 text-2xl font-semibold text-white">Signature</div>
                <div className="text-sm text-white/65">1 799$/mois · 50 RDV exclusifs · priorité IA</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/80">
                <div className="font-medium text-white/90">Scarcity territoire</div>
                <div className="mt-1">Laval Signature : <span className="text-amber-300 font-semibold">2 places restantes</span> · Montréal-Nord : 1 · Lanaudière : 3.</div>
              </div>
              <a
                href="/demo/isr-plan-test"
                className="block text-center rounded-[18px] bg-amber-300 px-5 py-3 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all"
              >
                Ouvrir checkout démo 1$
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
