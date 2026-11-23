/**
 * UNPRO — Recrutement de représentants en développement des affaires
 * (/carrieres/representants-construction, /en/careers/construction-sales-representatives).
 * Rôle à commission, non salarié : statut et rémunération expliqués AVANT la candidature.
 * Candidature → edge `submit-representative-application` (CRM affiliate_applications); confirmation
 * affichée seulement après un identifiant renvoyé par le serveur. « Je suis entrepreneur » → entrée canonique.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { pickUtm } from "@/lib/salesTeamIntake";
import { CONTRACTOR_ENTRY_PATH } from "@/config/contractorFunnel";
import {
  EMPTY_REP_FORM, REP_EN_PATH, REP_EN_URL, REP_FR_PATH, REP_FR_URL, contractorEntryHref, toRepPayload, validateRepForm,
  type RepExperience, type RepForm,
} from "@/lib/representativeApplication";
import "../entrepreneur/thermopompes.css";
import "../sales/directeurVentes.css";
import "./representants.css";

type Lang = "fr" | "en";
const DRAFT_KEY = "unpro_rep_draft_v1";
const IDEM_KEY = "unpro_rep_idem_v1";
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

const C = {
  fr: {
    title: "Représentant en développement des affaires — construction | UNPRO",
    description: "Vous connaissez la construction et la rénovation au Québec? Représentez UNPRO auprès des entrepreneurs et bâtissez votre équipe. Rôle à commission.",
    eyebrow: "CARRIÈRES • RÉNOVATION • CONSTRUCTION • SERVICES",
    h1a: "Vous connaissez le monde de la construction?", h1b: "Bâtissez quelque chose de nouveau.",
    lead: "Un nouveau marché. Une nouvelle façon d'aider les entrepreneurs. Une occasion de grandir avec UNPRO.",
    ctaRep: "Je veux représenter UNPRO", ctaPro: "Je suis entrepreneur",
    oppTitle: "L'occasion",
    opp: [
      ["Un nouveau marché", "Les propriétaires demandent de plus en plus conseil à l'IA. UNPRO aide les entrepreneurs à y être bien présentés."],
      ["Une autre approche", "UNPRO met en relation le bon projet et le bon professionnel. Pas de demandes partagées entre plusieurs entrepreneurs."],
      ["Une conversation utile", "Vous montrez à un entrepreneur comment son entreprise apparaît, puis ce qu'UNPRO peut améliorer."],
    ],
    notTitle: "Ce que vous ne vendez pas",
    not: "Ni répondeur, ni logiciel d'automatisation, ni promesse de clients. Vous présentez la présence IA et la mise en relation UNPRO.",
    whoTitle: "Pour qui",
    who: ["Vous avez travaillé en construction, en rénovation, en vente de matériaux ou en services immobiliers.", "Vous avez un réseau d'entrepreneurs et leur confiance.", "Vous aimez ouvrir des portes et faire avancer les choses."],
    howTitle: "Comment ça fonctionne",
    how: [["Candidature", "Deux minutes. Aucun engagement."], ["Échange", "Un appel pour se connaître, votre région et votre réseau."], ["Entente écrite", "Statut, taux et territoire précisés par écrit avant de commencer."], ["Lancement", "Outils, formation et suivi de vos entrepreneurs dans votre espace."]],
    leadTitle: "Vous voulez bâtir une équipe?",
    lead2: "Certains représentants recrutent et accompagnent d'autres représentants dans leur région. Si c'est votre ambition, dites-le dans votre candidature. Les conditions propres au rôle de chef d'équipe sont précisées par écrit, au cas par cas.",
    payTitle: "Statut et rémunération",
    pay: [
      "Ce n'est pas un emploi salarié : aucun salaire de base, aucun horaire imposé.",
      "Rémunération à la commission, sur les inscriptions payées d'entrepreneurs qui vous sont attribuées.",
      "Aucun revenu garanti. Vos résultats dépendent de votre travail et de votre réseau.",
      "Le statut contractuel, le taux exact et les conditions vous sont remis par écrit avant toute entente.",
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      ["Est-ce un emploi?", "Non. C'est une collaboration rémunérée à la commission, sans salaire de base. Le statut exact est confirmé par écrit avant toute entente."],
      ["Combien vais-je gagner?", "Cela dépend des inscriptions payées qui vous sont attribuées. Nous ne promettons aucun revenu. Le taux exact vous est communiqué par écrit avant de commencer."],
      ["Dois-je acheter quelque chose?", "Non. La candidature et l'échange sont gratuits."],
      ["Dois-je être un expert de l'IA?", "Non. Votre connaissance du terrain compte le plus. UNPRO fournit les outils et la formation."],
      ["Je suis entrepreneur, pas représentant.", "Utilisez le bouton « Je suis entrepreneur » : il mène directement à l'inscription entrepreneur."],
    ],
    formTitle: "Je veux représenter UNPRO",
    formIntro: "Deux minutes. Nous vous répondons personnellement.",
    fName: "Nom complet", fEmail: "Courriel", fPhone: "Téléphone", fRegion: "Région ou ville", optional: "facultatif",
    fExp: "Votre expérience", exp: { construction: "Construction / rénovation", sales: "Vente B2B", both: "Les deux", other: "Autre" } as Record<RepExperience, string>,
    fTeam: "Je veux aussi bâtir et diriger une équipe.",
    fTerms: "J'ai lu : rôle à commission, non salarié, sans revenu garanti.",
    consent: "J'accepte qu'UNPRO conserve ces informations et me contacte au sujet de ma candidature.",
    submit: "Envoyer ma candidature", sending: "Envoi…",
    errSave: "Votre candidature n'a pas pu être enregistrée. Vos réponses sont conservées. Réessayez.",
    errRate: "Trop d'envois depuis cet appareil. Réessayez dans une heure.",
    doneTitle: "Candidature reçue.",
    done: "Elle est bien enregistrée. Nous communiquerons avec vous personnellement. Rien d'autre n'est envoyé automatiquement.",
    dup: "Nous avons déjà votre candidature. Inutile de recommencer : nous communiquerons avec vous.",
    proTitle: "Vous êtes entrepreneur?", proBody: "Activez votre profil et votre présence IA sur UNPRO.",
    other: "English", crumbs: [{ name: "Accueil", url: "https://unpro.ca/" }, { name: "Carrières", url: REP_FR_URL }],
  },
  en: {
    title: "Business development representative — construction | UNPRO",
    description: "Know construction and renovation in Quebec? Represent UNPRO with contractors and build your own team. Commission-based role.",
    eyebrow: "CAREERS • RENOVATION • CONSTRUCTION • SERVICES",
    h1a: "Know the construction world?", h1b: "Build something new.",
    lead: "A new market. A new way to help contractors. A chance to grow with UNPRO.",
    ctaRep: "I want to represent UNPRO", ctaPro: "I'm a contractor",
    oppTitle: "The opportunity",
    opp: [
      ["A new market", "Homeowners increasingly ask AI for advice. UNPRO helps contractors be well presented there."],
      ["A different approach", "UNPRO matches the right project with the right professional. No leads shared among several contractors."],
      ["A useful conversation", "You show a contractor how their business appears, then what UNPRO can improve."],
    ],
    notTitle: "What you don't sell",
    not: "No answering service, no automation software, no promise of clients. You present UNPRO's AI presence and matching.",
    whoTitle: "Who it's for",
    who: ["You have worked in construction, renovation, building supplies or real estate services.", "You have a network of contractors who trust you.", "You like opening doors and making things happen."],
    howTitle: "How it works",
    how: [["Apply", "Two minutes. No commitment."], ["Talk", "A call to get to know you, your region and your network."], ["Written agreement", "Status, rate and territory set in writing before you start."], ["Launch", "Tools, training and tracking of your contractors in your space."]],
    leadTitle: "Want to build a team?",
    lead2: "Some representatives recruit and coach other representatives in their region. If that's your ambition, say so in your application. Team-lead terms are set in writing, case by case.",
    payTitle: "Status and pay",
    pay: [
      "This is not a salaried job: no base salary, no set schedule.",
      "Commission-based pay on paid contractor sign-ups attributed to you.",
      "No guaranteed income. Results depend on your work and your network.",
      "Contract status, exact rate and terms are given to you in writing before any agreement.",
    ],
    faqTitle: "FAQ",
    faqs: [
      ["Is this a job?", "No. It's a commission-based collaboration with no base salary. The exact status is confirmed in writing before any agreement."],
      ["How much will I earn?", "It depends on the paid sign-ups attributed to you. We promise no income. The exact rate is given in writing before you start."],
      ["Do I have to buy anything?", "No. Applying and talking with us are free."],
      ["Do I need to be an AI expert?", "No. Field knowledge matters most. UNPRO provides the tools and training."],
      ["I'm a contractor, not a representative.", "Use the “I'm a contractor” button: it leads straight to contractor sign-up."],
    ],
    formTitle: "I want to represent UNPRO",
    formIntro: "Two minutes. We reply personally.",
    fName: "Full name", fEmail: "Email", fPhone: "Phone", fRegion: "Region or city", optional: "optional",
    fExp: "Your experience", exp: { construction: "Construction / renovation", sales: "B2B sales", both: "Both", other: "Other" } as Record<RepExperience, string>,
    fTeam: "I also want to build and lead a team.",
    fTerms: "I have read: commission-based, not salaried, no guaranteed income.",
    consent: "I agree that UNPRO may keep this information and contact me about my application.",
    submit: "Send my application", sending: "Sending…",
    errSave: "Your application could not be saved. Your answers are kept. Please try again.",
    errRate: "Too many submissions from this device. Try again in an hour.",
    doneTitle: "Application received.",
    done: "It is saved. We will contact you personally. Nothing else is sent automatically.",
    dup: "We already have your application. No need to apply again: we will contact you.",
    proTitle: "Are you a contractor?", proBody: "Activate your profile and AI presence on UNPRO.",
    other: "Français", crumbs: [{ name: "Home", url: "https://unpro.ca/" }, { name: "Careers", url: REP_EN_URL }],
  },
};

function LineArt() {
  return (
    <svg className="rep-art" viewBox="0 0 320 200" fill="none" aria-hidden="true">
      <path d="M20 180h280M60 180V96l70-56 70 56v84M110 180v-46h40v46M200 120l60-40 40 28v72" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M232 180v-30h28v30M80 112h28v22H80zM152 112h28v22h-28z" stroke="currentColor" strokeWidth="1.2" opacity=".7" />
      <circle cx="260" cy="44" r="5" fill="currentColor" /><path d="M260 49v18M130 40V24" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 4" />
    </svg>
  );
}

export default function PageRepresentantsConstruction({ lang = "fr" }: { lang?: Lang }) {
  const c = C[lang];
  const fr = lang === "fr";
  const location = useLocation();
  const utm = useMemo(() => pickUtm(location.search), [location.search]);
  const [form, setForm] = useState<RepForm>(() => {
    try { return { ...EMPTY_REP_FORM, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY_REP_FORM; }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "error" | "done" | "duplicate">("idle");
  const [serverMsg, setServerMsg] = useState("");
  const honey = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const started = useRef(false);
  const proHref = contractorEntryHref(CONTRACTOR_ENTRY_PATH);

  useEffect(() => { void logFunnelEvent({ event_type: "rep_page_view", metadata: { utm, lang } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* stockage indisponible */ } }, [form]);

  const set = <K extends keyof RepForm>(k: K, v: RepForm[K]) => {
    if (!started.current) { started.current = true; void logFunnelEvent({ event_type: "rep_form_started", metadata: { lang } }); }
    setForm(f => ({ ...f, [k]: v }));
  };
  const goForm = (position: string) => {
    void logFunnelEvent({ event_type: "rep_cta_clicked", metadata: { position, lang } });
    document.getElementById("candidature")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    const errs = validateRepForm(form, fr); setErrors(errs);
    if (Object.keys(errs).length) {
      void logFunnelEvent({ event_type: "rep_form_error", step: "validation", metadata: { fields: Object.keys(errs) } });
      document.getElementById(`rep-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setState("loading"); setServerMsg("");
    let key = sessionStorage.getItem(IDEM_KEY); if (!key) { key = newKey(); sessionStorage.setItem(IDEM_KEY, key); }
    let referrer_host: string | undefined;
    try { referrer_host = document.referrer ? new URL(document.referrer).host : undefined; } catch { /* ignore */ }
    const { data, error } = await supabase.functions.invoke("submit-representative-application", {
      body: {
        ...toRepPayload(form), idempotency_key: key, consent_text: c.consent, utm, locale: lang,
        journey: { landing_path: fr ? REP_FR_PATH : REP_EN_PATH, referrer_host, cta: "form" },
        hp: honey.current?.value ?? "", started_at: startedAt.current,
      },
    });
    const res = data as { ok?: boolean; id?: string; duplicate?: boolean } | null;
    if (error || !res?.ok || !res.id) {
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      void logFunnelEvent({ event_type: "rep_form_error", step: "server", metadata: { status: status ?? null } });
      setState("error"); setServerMsg(status === 429 ? c.errRate : c.errSave);
      return;
    }
    void logFunnelEvent({ event_type: "rep_application_submitted", dedupe_key: `rep_application:${res.id}`, metadata: { duplicate: !!res.duplicate, team_lead: form.wants_team_lead } });
    sessionStorage.removeItem(IDEM_KEY); sessionStorage.removeItem(DRAFT_KEY);
    setState(res.duplicate ? "duplicate" : "done");
  };

  const err = (k: string) => errors[k] ? <small id={`rep-${k}-err`} role="alert" className="spf-err">{errors[k]}</small> : null;
  const field = (k: "full_name" | "email" | "phone" | "region", label: string, type = "text", auto?: string, opt = false) => (
    <label className="dv-field" htmlFor={`rep-${k}`}>
      <strong>{label}{opt && <small> · {c.optional}</small>}</strong>
      <input id={`rep-${k}`} type={type} autoComplete={auto} value={form[k]} onChange={e => set(k, e.target.value)}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `rep-${k}-err` : undefined} />
      {err(k)}
    </label>
  );

  return (
    <div className="utp rep" lang={fr ? "fr-CA" : "en-CA"}>
      <SeoHead title={c.title} description={c.description} canonical={fr ? REP_FR_URL : REP_EN_URL}
        frenchCanonical={REP_FR_URL} englishCanonical={REP_EN_URL} lang={fr ? "fr-CA" : "en-CA"} />
      <SchemaStack breadcrumbs={c.crumbs} />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage", name: c.title, description: c.description,
        url: fr ? REP_FR_URL : REP_EN_URL, inLanguage: fr ? "fr-CA" : "en-CA",
        publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      })}</script>

      <header className="utp-header">
        <Link to="/" aria-label="UNPRO"><UnproLogo size={120} tone="dark" /></Link>
        <Link className="utp-link" to={fr ? REP_EN_PATH : REP_FR_PATH} hrefLang={fr ? "en-CA" : "fr-CA"}>{c.other}</Link>
      </header>

      <main>
        <section className="utp-wrap utp-section rep-hero">
          <div>
            <div className="utp-eyebrow">{c.eyebrow}</div>
            <h1>{c.h1a} <span>{c.h1b}</span></h1>
            <p className="utp-lead">{c.lead}</p>
            <div className="utp-actions">
              <button type="button" className="utp-button" onClick={() => goForm("hero")}>{c.ctaRep} <ArrowRight size={18} /></button>
              <Link className="dv-ghost rep-ghost" to={proHref} onClick={() => void logFunnelEvent({ event_type: "rep_contractor_cta_clicked", metadata: { position: "hero" } })}>{c.ctaPro}</Link>
            </div>
          </div>
          <LineArt />
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-opp">
          <h2 id="rep-opp">{c.oppTitle}</h2>
          <div className="rep-grid">{c.opp.map(([t, d]) => <article key={t} className="dv-card rep-card"><h3>{t}</h3><p>{d}</p></article>)}</div>
          <p className="rep-not"><strong>{c.notTitle}.</strong> {c.not}</p>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-who">
          <h2 id="rep-who">{c.whoTitle}</h2>
          <ul className="rep-list">{c.who.map(w => <li key={w}><CheckCircle2 size={18} aria-hidden="true" /> {w}</li>)}</ul>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-how">
          <h2 id="rep-how">{c.howTitle}</h2>
          <ol className="rep-steps">{c.how.map(([t, d], i) => <li key={t}><span>{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div></li>)}</ol>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-lead">
          <div className="dv-card"><h2 id="rep-lead">{c.leadTitle}</h2><p>{c.lead2}</p></div>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-pay" id="statut-remuneration">
          <h2 id="rep-pay">{c.payTitle}</h2>
          <ul className="rep-list">{c.pay.map(p => <li key={p}><CheckCircle2 size={18} aria-hidden="true" /> {p}</li>)}</ul>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="rep-faq">
          <h2 id="rep-faq">{c.faqTitle}</h2>
          <div className="rep-faq">{c.faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>

        <section className="utp-wrap utp-section" id="candidature" aria-labelledby="rep-form">
          <h2 id="rep-form">{state === "done" || state === "duplicate" ? c.doneTitle : c.formTitle}</h2>
          <div className="dv-card">
            {state === "done" || state === "duplicate" ? (
              <div role="status"><CheckCircle2 size={32} className="rep-ok" aria-hidden="true" /><p>{state === "done" ? c.done : c.dup}</p></div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="utp-fine">{c.formIntro}</p>
                <input ref={honey} name="website" className="spf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {field("full_name", c.fName, "text", "name")}
                {field("email", c.fEmail, "email", "email")}
                {field("phone", c.fPhone, "tel", "tel", true)}
                {field("region", c.fRegion, "text", "address-level2")}
                <fieldset className="dv-field"><legend><strong>{c.fExp}</strong></legend>
                  <div className="dv-chips" id="rep-experience" tabIndex={-1}>
                    {(Object.keys(c.exp) as RepExperience[]).map(k => <button key={k} type="button" aria-pressed={form.experience === k} onClick={() => set("experience", k)}>{c.exp[k]}</button>)}
                  </div>
                  {err("experience")}
                </fieldset>
                <label className="dv-check"><input type="checkbox" checked={form.wants_team_lead} onChange={e => set("wants_team_lead", e.target.checked)} /> {c.fTeam}</label>
                <label className="dv-check" htmlFor="rep-terms_acknowledged"><input id="rep-terms_acknowledged" type="checkbox" checked={form.terms_acknowledged} onChange={e => set("terms_acknowledged", e.target.checked)} aria-invalid={!!errors.terms_acknowledged} /> <span>{c.fTerms} <a className="utp-link rep-inline" href="#statut-remuneration">{c.payTitle}</a></span></label>
                {err("terms_acknowledged")}
                <label className="dv-check" htmlFor="rep-follow_up_consent"><input id="rep-follow_up_consent" type="checkbox" checked={form.follow_up_consent} onChange={e => set("follow_up_consent", e.target.checked)} aria-invalid={!!errors.follow_up_consent} /> {c.consent}</label>
                {err("follow_up_consent")}
                {state === "error" && <p role="alert" className="dv-alert">{serverMsg}</p>}
                <button type="submit" className="utp-button rep-submit" disabled={state === "loading"}>
                  {state === "loading" ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {c.sending}</> : <>{c.submit} <ArrowRight size={18} /></>}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="utp-wrap utp-section rep-pro">
          <h2>{c.proTitle}</h2><p>{c.proBody}</p>
          <Link className="utp-button" to={proHref} onClick={() => void logFunnelEvent({ event_type: "rep_contractor_cta_clicked", metadata: { position: "footer" } })}>{c.ctaPro} <ArrowRight size={18} /></Link>
        </section>
      </main>
      <footer className="utp-wrap utp-footer"><span>UNPRO · Québec</span><Link to="/pourquoi-unpro">{fr ? "Pourquoi UNPRO" : "Why UNPRO"}</Link></footer>
    </div>
  );
}
