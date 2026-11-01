import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import ContractorLayout from "@/layouts/ContractorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/ui/LanguageToggle";
import {
  EMPTY_LEAD_REFERRAL, TRANSFER_REASONS, submitLeadReferral, validateLeadReferral, type LeadReferralForm,
} from "@/lib/leadReferral";

const DRAFT_KEY = "unpro_lead_referral_draft";
type Row = { reference: string; service_requested: string; city_or_postal: string; status: string; credit_status: string; created_at: string };

const T = {
  fr: {
    title: "Recycler un lead", intro: "Une demande hors de votre territoire, de votre spécialité ou de vos disponibilités? Transmettez-la à UNPRO. Nous l’évaluons pour l’orienter vers un professionnel adapté.",
    credit: "Les crédits futurs sont évalués par UNPRO pour chaque demande acceptée. Aucun montant n’est garanti.",
    name: "Nom du client", phone: "Téléphone", email: "Courriel", contactHint: "Téléphone OU courriel valide requis.",
    city: "Ville ou code postal", address: "Adresse exacte (facultatif)", service: "Service recherché", desc: "Description du projet",
    timeline: "Échéancier (facultatif)", reason: "Raison du transfert", other: "Précisez la raison",
    reasons: { out_of_territory: "Hors territoire", out_of_specialty: "Hors spécialité", no_availability: "Pas de disponibilité", other: "Autre" },
    attest: "J’atteste que ce client m’a autorisé à transmettre à UNPRO ses coordonnées et les détails nécessaires pour l’orienter vers un professionnel adapté.",
    attestNote: "Attestation déclarée par vous; elle n’est pas une preuve de consentement vérifiée.",
    agreeDate: "Date de l’accord (facultatif)", agreeMode: "Mode de l’accord (facultatif)",
    modes: { "": "—", verbal: "En personne", phone: "Téléphone", written: "Écrit", email: "Courriel", other: "Autre" },
    submit: "Transmettre à UNPRO", sending: "Envoi…", fix: "Vérifiez les champs indiqués.",
    ok: "Demande reçue", dup: "Cette demande avait déjà été transmise", ref: "Référence", again: "Transmettre un autre lead",
    fail: "La demande n’a pas été enregistrée. Vos réponses sont conservées; réessayez.", noProfile: "Aucune fiche entrepreneur n’est liée à ce compte.",
    history: "Mes leads transmis", empty: "Aucun lead transmis pour le moment.", loading: "Chargement…", loadErr: "Historique indisponible.", retry: "Réessayer",
    status: { received: "Reçue", in_review: "En évaluation", accepted: "Acceptée", refused: "Refusée" },
    creditS: { to_evaluate: "Crédit : à évaluer", granted: "Crédit : accordé", not_granted: "Crédit : non accordé" },
    back: "Retour à mon espace",
  },
  en: {
    title: "Recycle a lead", intro: "A request outside your territory, specialty or availability? Send it to UNPRO. We review it to route it to a suitable professional.",
    credit: "Future credits are assessed by UNPRO for each accepted request. No amount is guaranteed.",
    name: "Client name", phone: "Phone", email: "Email", contactHint: "A valid phone OR email is required.",
    city: "City or postal code", address: "Exact address (optional)", service: "Service needed", desc: "Project description",
    timeline: "Timeline (optional)", reason: "Reason for transfer", other: "Specify the reason",
    reasons: { out_of_territory: "Outside territory", out_of_specialty: "Outside specialty", no_availability: "No availability", other: "Other" },
    attest: "I confirm this client authorized me to share their contact details and the information needed with UNPRO to route them to a suitable professional.",
    attestNote: "This is your declaration; it is not verified proof of consent.",
    agreeDate: "Date of agreement (optional)", agreeMode: "How agreement was given (optional)",
    modes: { "": "—", verbal: "In person", phone: "Phone", written: "Written", email: "Email", other: "Other" },
    submit: "Send to UNPRO", sending: "Sending…", fix: "Check the highlighted fields.",
    ok: "Request received", dup: "This request was already sent", ref: "Reference", again: "Send another lead",
    fail: "The request was not saved. Your answers are kept; try again.", noProfile: "No contractor profile is linked to this account.",
    history: "My sent leads", empty: "No leads sent yet.", loading: "Loading…", loadErr: "History unavailable.", retry: "Retry",
    status: { received: "Received", in_review: "In review", accepted: "Accepted", refused: "Refused" },
    creditS: { to_evaluate: "Credit: to be assessed", granted: "Credit: granted", not_granted: "Credit: not granted" },
    back: "Back to my dashboard",
  },
} as const;

const newKey = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9-]/g, "");

export default function PageRecyclerUnLead() {
  const { lang } = useLanguage();
  const L = lang === "en" ? "en" : "fr";
  const t = T[L];
  const [form, setForm] = useState<LeadReferralForm>(() => {
    try { return { ...EMPTY_LEAD_REFERRAL, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}"), attestation: false }; } catch { return EMPTY_LEAD_REFERRAL; }
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; duplicate?: boolean } | null>(null);
  const keyRef = useRef(newKey());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    // Brouillon limité à cet onglet (sessionStorage) : reprise après connexion, jamais l’attestation.
    const { attestation: _a, ...draft } = form;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* indisponible */ }
  }, [form]);

  const load = useCallback(async () => {
    setLoadErr(false); setRows(null);
    const { data, error } = await supabase.from("contractor_lead_referrals")
      .select("reference, service_requested, city_or_postal, status, credit_status, created_at")
      .order("created_at", { ascending: false }).limit(50);
    if (error) setLoadErr(true); else setRows((data ?? []) as Row[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<LeadReferralForm>) => { setForm((f) => ({ ...f, ...patch })); setFailure(null); };
  const bad = (k: string) => errors.includes(k);

  const submit = async () => {
    if (sending) return;
    const e = validateLeadReferral(form);
    setErrors(e);
    if (e.length) return;
    setSending(true); setFailure(null);
    const r = await submitLeadReferral(form, keyRef.current, L);
    setSending(false);
    if (r.ok === false) { setFailure(r.error === "no_contractor_profile" ? t.noProfile : t.fail); return; }
    setDone({ reference: r.reference, duplicate: r.duplicate });
    setForm(EMPTY_LEAD_REFERRAL);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* */ }
    keyRef.current = newKey();
    void load();
  };

  const field = "min-h-11 bg-background text-foreground";
  const label = "block text-sm font-medium text-foreground mb-1";
  const err = (k: string) => (bad(k) ? "border-destructive" : "");

  return (
    <ContractorLayout>
      <Helmet><title>{t.title} · UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <div className="dark max-w-xl mx-auto space-y-5 pb-24">
        <Link to="/pro" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        <p className="text-sm text-muted-foreground">{t.credit}</p>

        {done ? (
          <section role="status" data-testid="lead-referral-success" className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3">
            <p className="font-semibold text-foreground">{done.duplicate ? t.dup : t.ok}</p>
            <p className="text-sm text-foreground">{t.ref} : <strong>{done.reference}</strong> · {t.status.received}</p>
            <Button variant="outline" onClick={() => setDone(null)}>{t.again}</Button>
          </section>
        ) : (
          <form className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-label={t.title}>
            <div><label className={label} htmlFor="lr-name">{t.name}</label><Input id="lr-name" className={`${field} ${err("client_name")}`} autoComplete="off" value={form.client_name} onChange={(e) => set({ client_name: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="lr-phone">{t.phone}</label><Input id="lr-phone" type="tel" inputMode="tel" className={`${field} ${err("client_phone")} ${err("contact")}`} value={form.client_phone} onChange={(e) => set({ client_phone: e.target.value })} /></div>
              <div><label className={label} htmlFor="lr-email">{t.email}</label><Input id="lr-email" type="email" inputMode="email" className={`${field} ${err("client_email")} ${err("contact")}`} value={form.client_email} onChange={(e) => set({ client_email: e.target.value })} /></div>
            </div>
            <p className={`text-xs ${bad("contact") ? "text-destructive" : "text-muted-foreground"}`}>{t.contactHint}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="lr-city">{t.city}</label><Input id="lr-city" className={`${field} ${err("city_or_postal")}`} value={form.city_or_postal} onChange={(e) => set({ city_or_postal: e.target.value })} /></div>
              <div><label className={label} htmlFor="lr-address">{t.address}</label><Input id="lr-address" className={field} value={form.address} onChange={(e) => set({ address: e.target.value })} /></div>
            </div>
            <div><label className={label} htmlFor="lr-service">{t.service}</label><Input id="lr-service" className={`${field} ${err("service_requested")}`} value={form.service_requested} onChange={(e) => set({ service_requested: e.target.value })} /></div>
            <div><label className={label} htmlFor="lr-desc">{t.desc}</label><Textarea id="lr-desc" rows={4} className={`${field} ${err("project_description")}`} value={form.project_description} onChange={(e) => set({ project_description: e.target.value })} /></div>
            <div><label className={label} htmlFor="lr-timeline">{t.timeline}</label><Input id="lr-timeline" className={field} value={form.timeline} onChange={(e) => set({ timeline: e.target.value })} /></div>
            <fieldset>
              <legend className={label}>{t.reason}</legend>
              <div className={`grid grid-cols-2 gap-2 ${bad("transfer_reason") ? "rounded-lg ring-1 ring-destructive p-1" : ""}`}>
                {TRANSFER_REASONS.map((r) => (
                  <label key={r} className={`min-h-11 flex items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground ${form.transfer_reason === r ? "bg-primary/15 border-primary" : ""}`}>
                    <input type="radio" name="lr-reason" checked={form.transfer_reason === r} onChange={() => set({ transfer_reason: r })} /> {t.reasons[r]}
                  </label>
                ))}
              </div>
              {form.transfer_reason === "other" && <Input aria-label={t.other} placeholder={t.other} className={`${field} mt-2 ${err("transfer_reason_other")}`} value={form.transfer_reason_other} onChange={(e) => set({ transfer_reason_other: e.target.value })} />}
            </fieldset>
            <label className={`flex items-start gap-3 text-sm text-foreground ${bad("attestation") ? "text-destructive" : ""}`}>
              <input type="checkbox" className="mt-1 h-5 w-5" checked={form.attestation} onChange={(e) => set({ attestation: e.target.checked })} data-testid="lead-referral-attestation" />
              <span>{t.attest}<span className="block text-xs text-muted-foreground mt-1">{t.attestNote}</span></span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="lr-adate">{t.agreeDate}</label><Input id="lr-adate" type="date" className={field} value={form.declared_agreement_date} onChange={(e) => set({ declared_agreement_date: e.target.value })} /></div>
              <div><label className={label} htmlFor="lr-amode">{t.agreeMode}</label>
                <select id="lr-amode" className={`${field} w-full rounded-md border border-input px-3`} value={form.declared_agreement_mode} onChange={(e) => set({ declared_agreement_mode: e.target.value })}>
                  {Object.entries(t.modes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
            </div>
            {errors.length > 0 && <p role="alert" className="text-sm text-destructive">{t.fix}</p>}
            {failure && <p role="alert" data-testid="lead-referral-failure" className="text-sm text-destructive">{failure}</p>}
            <Button type="submit" size="lg" className="w-full min-h-12" disabled={sending}>{sending ? t.sending : t.submit}</Button>
          </form>
        )}

        <section className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3" aria-label={t.history} data-testid="lead-referral-history">
          <h2 className="font-semibold text-foreground">{t.history}</h2>
          {loadErr ? <div role="alert" className="text-sm text-destructive space-y-2"><p>{t.loadErr}</p><Button variant="outline" size="sm" onClick={() => void load()}>{t.retry}</Button></div>
            : rows === null ? <p role="status" className="text-sm text-muted-foreground">{t.loading}</p>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p>
            : <ul className="space-y-2">{rows.map((r) => (
                <li key={r.reference} className="text-sm text-foreground border-b border-border/40 pb-2">
                  <strong>{r.reference}</strong> · {r.service_requested} · {r.city_or_postal}
                  <span className="block text-muted-foreground">{t.status[r.status as keyof typeof t.status] ?? r.status} · {t.creditS[r.credit_status as keyof typeof t.creditS] ?? r.credit_status} · {new Date(r.created_at).toLocaleDateString(L === "fr" ? "fr-CA" : "en-CA")}</span>
                </li>))}</ul>}
        </section>
      </div>
    </ContractorLayout>
  );
}
