/**
 * Isolation Solution Royal — advertising landing (FR/EN) with a Clara intake
 * bound to this company only. Route: /c/isolation-solution-royal/:intentSlug
 * Requests are saved as "requested" through existing RLS; nothing is confirmed here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeoHead from "@/seo/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { saveReturnPath } from "@/lib/authReturn";
import { trackEvent } from "@/services/eventTrackingService";
import {
  ISR_AVAILABILITY, ISR_CONCERNS, ISR_COPY, ISR_DECLARED_SERVICES, ISR_DRAFT_KEY, ISR_QUESTION_COUNT, ISR_SLUG, ISR_TIMING,
  attributionFrom, buildIsrRequest, cityInTerritory, emptyAnswers, isrCampaignPath, isrEventMetadata, isrRequestsOpen,
  nextQuestion, optionLabel, parseIsrDraft, type IsrAnswers, type IsrCampaignKey, type IsrDraft, type IsrLang, type IsrProfileGate,
} from "@/lib/isrCampaign";

type Profile = IsrProfileGate & { name: string; website: string | null; logo: string | null; areas: string[] };
type SavedAddress = { id: string; full_address: string; city: string };

const LOGO = "/brands/isr/isr-logo-square.svg";

function readDraft(): IsrDraft | null {
  try { return parseIsrDraft(sessionStorage.getItem(ISR_DRAFT_KEY)); } catch { return null; }
}
function writeDraft(d: IsrDraft | null) {
  try { d ? sessionStorage.setItem(ISR_DRAFT_KEY, JSON.stringify(d)) : sessionStorage.removeItem(ISR_DRAFT_KEY); } catch { /* in-memory state remains */ }
}

export default function IsrCampaignLanding({ campaign, lang }: { campaign: IsrCampaignKey; lang: IsrLang }) {
  const fr = lang === "fr";
  const t = (f: string, e: string) => (fr ? f : e);
  const copy = ISR_COPY[campaign][lang];
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const intakeRef = useRef<HTMLElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState<IsrDraft>(() => {
    const saved = readDraft();
    const fresh: IsrDraft = { v: 1, contractorSlug: ISR_SLUG, campaign, lang, attribution: attributionFrom(params), answers: emptyAnswers(), step: 0, savedAt: Date.now(), requestId: null };
    // A saved draft keeps its original campaign + attribution (auth resume); a new ad click with UTMs starts over only if nothing was answered.
    if (saved && (saved.campaign === campaign || saved.requestId || saved.step > 0)) return saved;
    return fresh;
  });
  const [open, setOpen] = useState(() => draft.step > 0 || Boolean(draft.requestId));
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileState("loading");
    const { data, error } = await supabase.rpc("get_contractor_public_profile", { _slug: ISR_SLUG });
    const payload = data as { contractor?: Record<string, unknown>; service_areas?: { city_name?: string }[] } | null;
    const c = payload?.contractor;
    if (error || !c) { setProfileState("error"); return; }
    setProfile({
      contractorId: typeof c.id === "string" ? c.id : null,
      slug: typeof c.slug === "string" ? c.slug : null,
      publicStatus: typeof c.public_status === "string" ? c.public_status : null,
      bookingEnabled: typeof c.booking_enabled === "boolean" ? c.booking_enabled : null,
      accepting: typeof c.is_accepting_appointments === "boolean" ? c.is_accepting_appointments : null,
      name: typeof c.business_name === "string" && c.business_name ? c.business_name : "Isolation Solution Royal",
      website: typeof c.website === "string" ? c.website : null,
      logo: LOGO,
      areas: (payload?.service_areas ?? []).map(a => a.city_name ?? "").filter(Boolean),
    });
    setProfileState("ready");
  }, []);
  useEffect(() => { void loadProfile(); }, [loadProfile]);

  // Landing view: existing attribution table + platform events, campaign labels only.
  const viewLogged = useRef(false);
  useEffect(() => {
    if (viewLogged.current || !profile?.contractorId) return;
    viewLogged.current = true;
    let sessionId: string | null = null;
    try {
      sessionId = sessionStorage.getItem("unpro_campaign_session");
      if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem("unpro_campaign_session", sessionId); }
    } catch { /* optional */ }
    void supabase.from("campaign_attributions").insert({
      campaign_id: null, contractor_id: profile.contractorId, contractor_slug: ISR_SLUG, intent_slug: location.pathname.split("/").pop() ?? null,
      ...draft.attribution, landing_url: `${window.location.origin}${location.pathname}`, referrer: document.referrer ? new URL(document.referrer).origin : null, session_id: sessionId,
    } as never).then(() => undefined, () => undefined);
    void trackEvent({ eventType: "isr_campaign_landing_view", category: "contractor", entityType: "contractor", entityId: profile.contractorId, metadata: isrEventMetadata(draft) }, user?.id);
  }, [profile?.contractorId, draft, location.pathname, user?.id]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("homeowner_addresses").select("id, full_address, city").eq("homeowner_id", user.id).order("is_default", { ascending: false }).limit(5);
      setAddresses((data as SavedAddress[] | null) ?? []);
    })();
  }, [user]);

  const commit = (next: IsrDraft) => { setDraft(next); writeDraft(next); };
  const update = (patch: Partial<IsrAnswers>) => {
    const answers = { ...draft.answers, ...patch };
    const next: IsrDraft = { ...draft, answers, step: nextQuestion(answers, draft.campaign), savedAt: Date.now() };
    if (draft.step === 0 && next.step > 0 && !startedLogged.current) {
      startedLogged.current = true;
      void trackEvent({ eventType: "isr_campaign_intake_started", category: "contractor", entityType: "contractor", entityId: profile?.contractorId, metadata: isrEventMetadata(draft) }, user?.id);
    }
    commit(next);
  };
  const startedLogged = useRef(false);
  /** One step back: clears only that question's answer (address text is kept for editing). */
  const goBack = () => {
    const target = Math.max(0, draft.step - 1);
    const clear: Partial<IsrAnswers>[] = [{ addressId: null }, { concern: null }, { timing: null }, { availability: null }];
    if (target === 0) setEditingAddress(true);
    commit({ ...draft, answers: { ...draft.answers, ...clear[target] }, step: target, savedAt: Date.now() });
  };

  const requestsOpen = isrRequestsOpen(profile);
  const territory = cityInTerritory(draft.answers.addressId ? (addresses.find(a => a.id === draft.answers.addressId)?.city ?? "") : draft.answers.city, profile?.areas);
  const otherLangPath = `${isrCampaignPath(campaign, fr ? "en" : "fr")}${location.search}`;

  const startIntake = () => { setOpen(true); requestAnimationFrame(() => intakeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };

  async function submit() {
    if (!profile?.contractorId || !requestsOpen || submitting || draft.requestId) return;
    if (!user) {
      writeDraft(draft);
      const back = `${location.pathname}${location.search}`;
      saveReturnPath(back, "manual");
      navigate(`/login?returnTo=${encodeURIComponent(back)}`);
      return;
    }
    setSubmitting(true); setSubmitError(null);
    try {
      let addressId = draft.answers.addressId;
      if (!addressId) {
        const { data, error } = await supabase.from("homeowner_addresses").insert({ homeowner_id: user.id, full_address: draft.answers.address.trim(), city: draft.answers.city.trim(), is_default: addresses.length === 0 } as never).select("id").single();
        if (error || !data) throw error ?? new Error("address");
        addressId = (data as { id: string }).id;
      }
      const { data, error } = await supabase.from("appointments").insert(buildIsrRequest({ userId: user.id, contractorId: profile.contractorId, addressId, draft }) as never).select("id, status").single();
      if (error || !data) throw error ?? new Error("request");
      const row = data as { id: string; status: string };
      const next = { ...draft, answers: { ...draft.answers, addressId }, requestId: row.id };
      setDraft(next); writeDraft(next);
      void trackEvent({ eventType: "isr_campaign_request_saved", category: "contractor", entityType: "appointment", entityId: row.id, metadata: isrEventMetadata(draft) }, user.id);
      if (row.status === "scheduled" || row.status === "confirmed") void trackEvent({ eventType: "isr_campaign_appointment_confirmed", category: "contractor", entityType: "appointment", entityId: row.id, metadata: isrEventMetadata(draft) }, user.id);
    } catch {
      setSubmitError(t("Votre demande n’a pas pu être enregistrée. Vos réponses sont conservées; réessayez.", "Your request could not be saved. Your answers are kept; please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const step = draft.step;
  const concernOptions = ISR_CONCERNS[campaign === draft.campaign ? campaign : draft.campaign];
  const choice = (options: { value: string; fr: string; en: string }[], current: string | null, key: keyof IsrAnswers) => (
    <div className="grid gap-2">
      {options.map(o => (
        <Button key={o.value} type="button" variant={current === o.value ? "default" : "outline"} className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => update({ [key]: o.value } as Partial<IsrAnswers>)}>{o[lang]}</Button>
      ))}
    </div>
  );

  const name = profile?.name ?? "Isolation Solution Royal";
  return (
    <main className="min-h-screen bg-background text-foreground" lang={fr ? "fr-CA" : "en-CA"}>
      <SeoHead title={`${copy.title} | ${name}`} description={copy.subtitle} noindex />
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <img src={LOGO} alt={name} width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
          <span className="truncate text-sm font-semibold">{name}</span>
        </div>
        <Link to={otherLangPath} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline" hrefLang={fr ? "en" : "fr"}>{fr ? "English" : "Français"}</Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-8 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{copy.subtitle}</p>
        {profile && profile.areas.length > 0 && (
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t("Territoire desservi : ", "Service area: ")}{profile.areas.join(", ")}</p>
        )}
        {!open && !draft.requestId && (
          <Button size="lg" className="mt-7 h-auto min-h-14 w-full gap-2 whitespace-normal text-base font-semibold sm:w-auto" onClick={startIntake} data-testid="isr-cta">
            {t("Demander mon inspection", "Request my inspection")}<ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </section>

      <section ref={intakeRef} className="mx-auto max-w-3xl scroll-mt-4 px-5 pb-8" aria-live="polite">
        {open && profileState === "loading" && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("Chargement…", "Loading…")}</div>}
        {open && profileState === "error" && (
          <div className="rounded-2xl border border-border bg-card p-5" role="alert" data-testid="isr-profile-error">
            <p className="text-sm">{t("Les informations de l’entreprise n’ont pas pu être chargées.", "The company details could not be loaded.")}</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={() => void loadProfile()}>{t("Réessayer", "Try again")}</Button>
          </div>
        )}
        {open && profileState === "ready" && !requestsOpen && !draft.requestId && (
          <div className="rounded-2xl border border-border bg-card p-5" data-testid="isr-requests-closed">
            <p className="text-sm">{t(`Les demandes en ligne pour ${name} ne sont pas ouvertes pour le moment.`, `Online requests for ${name} are not open right now.`)}</p>
            {profile?.website && <a href={profile.website} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline" rel="noopener">{t("Visiter le site de l’entreprise", "Visit the company website")}</a>}
          </div>
        )}
        {draft.requestId && (
          <div className="rounded-[24px] border border-border bg-card p-5" data-testid="isr-request-saved">
            <p className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5 text-success" aria-hidden />{t("Demande enregistrée", "Request saved")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t(`Votre demande est transmise à ${name}. Le rendez-vous reste à confirmer avec vous.`, `Your request is with ${name}. The appointment still needs to be confirmed with you.`)}</p>
          </div>
        )}
        {open && profileState === "ready" && requestsOpen && !draft.requestId && (
          <div className="rounded-[24px] border border-border bg-card p-5" data-testid="isr-intake" data-step={step}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Clara · {name}</span>
              {step < ISR_QUESTION_COUNT && <span>{t("Question", "Question")} {step + 1}/{ISR_QUESTION_COUNT}</span>}
            </div>

            {step === 0 && (
              <div className="mt-4 space-y-3">
                <h2 className="text-lg font-semibold">{t("Quelle est l’adresse de la propriété?", "What is the property address?")}</h2>
                {addresses.length > 0 && !editingAddress && (
                  <div className="grid gap-2">
                    {addresses.map(a => <Button key={a.id} type="button" variant="outline" className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => update({ addressId: a.id, address: "", city: "" })}>{a.full_address}</Button>)}
                    <Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditingAddress(true)}>{t("Une autre adresse", "Another address")}</Button>
                  </div>
                )}
                {(addresses.length === 0 || editingAddress) && (
                  <AddressForm fr={fr} initial={draft.answers} onSubmit={(address, city) => update({ address, city, addressId: null })} />
                )}
              </div>
            )}
            {step === 1 && <div className="mt-4 space-y-3"><h2 className="text-lg font-semibold">{t("Qu’est-ce qui vous amène?", "What brings you here?")}</h2>{choice(concernOptions, draft.answers.concern, "concern")}</div>}
            {step === 2 && <div className="mt-4 space-y-3"><h2 className="text-lg font-semibold">{t("Quand souhaitez-vous l’inspection?", "When would you like the inspection?")}</h2>{choice(ISR_TIMING, draft.answers.timing, "timing")}</div>}
            {step === 3 && <div className="mt-4 space-y-3"><h2 className="text-lg font-semibold">{t("Quel moment vous convient le mieux?", "What time suits you best?")}</h2>{choice(ISR_AVAILABILITY, draft.answers.availability, "availability")}</div>}
            {step === 4 && (
              <div className="mt-4 space-y-3" data-testid="isr-review">
                <h2 className="text-lg font-semibold">{t("Votre demande", "Your request")}</h2>
                <dl className="space-y-2 text-sm">
                  <div><dt className="font-medium">{t("Adresse", "Address")}</dt><dd className="break-words text-muted-foreground">{draft.answers.addressId ? (addresses.find(a => a.id === draft.answers.addressId)?.full_address ?? t("Adresse enregistrée", "Saved address")) : `${draft.answers.address}, ${draft.answers.city}`}</dd></div>
                  <div><dt className="font-medium">{t("Besoin", "Need")}</dt><dd className="text-muted-foreground">{optionLabel(concernOptions, draft.answers.concern, lang)}</dd></div>
                  <div><dt className="font-medium">{t("Moment", "Timing")}</dt><dd className="text-muted-foreground">{optionLabel(ISR_TIMING, draft.answers.timing, lang)} · {optionLabel(ISR_AVAILABILITY, draft.answers.availability, lang)}</dd></div>
                </dl>
                {territory === false && <p className="text-sm text-muted-foreground" data-testid="isr-out-of-area">{t(`Cette ville ne figure pas dans le territoire publié de ${name}. L’entreprise vous dira si elle peut se déplacer.`, `This city is not in ${name}'s published service area. The company will tell you whether it can travel.`)}</p>}
                <p className="text-sm text-muted-foreground">{t(`Votre demande sera transmise à ${name} seulement. Le rendez-vous sera confirmé avec vous.`, `Your request goes to ${name} only. The appointment will be confirmed with you.`)}</p>
                {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
                <Button className="h-auto min-h-12 w-full whitespace-normal" disabled={submitting} onClick={() => void submit()} data-testid="isr-submit">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : user ? t("Envoyer ma demande", "Send my request") : t("Me connecter pour envoyer ma demande", "Sign in to send my request")}
                </Button>
              </div>
            )}
            {step > 0 && <Button type="button" variant="ghost" size="sm" className="mt-3 min-h-11 gap-1" onClick={goBack}><ArrowLeft className="h-4 w-4" aria-hidden />{t("Retour", "Back")}</Button>}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-10">
        <h2 className="text-lg font-semibold">{t("Travaux offerts", "Services offered")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {ISR_DECLARED_SERVICES[lang].map(s => <li key={s} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{s}</li>)}
        </ul>
      </section>

      <footer className="mx-auto max-w-3xl px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] text-xs text-muted-foreground">{t("Propulsé par UNPRO", "Powered by UNPRO")}</footer>
    </main>
  );
}

function AddressForm({ fr, initial, onSubmit }: { fr: boolean; initial: IsrAnswers; onSubmit: (address: string, city: string) => void }) {
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const valid = useMemo(() => address.trim().length >= 4 && city.trim().length >= 2, [address, city]);
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (valid) onSubmit(address.trim().slice(0, 300), city.trim().slice(0, 120)); }}>
      <div><label htmlFor="isr-address" className="mb-1 block text-sm">{fr ? "Adresse" : "Address"}</label><Input id="isr-address" autoComplete="street-address" value={address} maxLength={300} onChange={e => setAddress(e.target.value)} className="h-12" /></div>
      <div><label htmlFor="isr-city" className="mb-1 block text-sm">{fr ? "Ville" : "City"}</label><Input id="isr-city" autoComplete="address-level2" value={city} maxLength={120} onChange={e => setCity(e.target.value)} className="h-12" /></div>
      <Button type="submit" disabled={!valid} className="min-h-12 w-full">{fr ? "Continuer" : "Continue"}</Button>
    </form>
  );
}
