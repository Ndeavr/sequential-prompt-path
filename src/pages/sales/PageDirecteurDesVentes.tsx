import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ArrowLeft, Share2, Loader2, CheckCircle2 } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  EMPTY_SALES_FORM, SALES_STEPS, validateSalesStep, simulateSales, parseAmount, fmtCad, fmtInt,
  toPayload, pickUtm, buildShareUrl, buildSalesClaraLink, type SalesTeamForm, type SalesObjective, type SalesRole,
} from "@/lib/salesTeamIntake";
import "../entrepreneur/thermopompes.css";
import "./directeurVentes.css";

const DRAFT_KEY = "unpro_sales_team_draft_v1";
const KEY_KEY = "unpro_sales_team_idem_v1";
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

export default function PageDirecteurDesVentes() {
  const { lang, setLang } = useLanguage();
  const fr = lang === "fr";
  const t = (a: string, b: string) => (fr ? a : b);
  const location = useLocation();
  const utm = useMemo(() => pickUtm(location.search), [location.search]);
  const [form, setForm] = useState<SalesTeamForm>(() => {
    try { return { ...EMPTY_SALES_FORM, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY_SALES_FORM; }
  });
  const [step, setStep] = useState<number | null>(null); // null = pas commencé ; SALES_STEPS = résumé
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [serverMsg, setServerMsg] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const honey = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void logFunnelEvent({ event_type: "sales_team_page_view", metadata: { utm } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* stockage indisponible */ } }, [form]);
  // Préremplissage fiable : courriel du compte connecté et fiche entrepreneur rattachée, sans écraser une saisie.
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: c } = await supabase.from("contractors").select("business_name, website").eq("user_id", user.id).maybeSingle();
      setForm(f => ({ ...f, email: f.email || user.email || "", company: f.company || c?.business_name || "", website: f.website || (c as { website?: string } | null)?.website || "" }));
    })();
  }, []);

  const set = <K extends keyof SalesTeamForm>(k: K, v: SalesTeamForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const start = () => { setStep(0); void logFunnelEvent({ event_type: "sales_team_step", step: "start" }); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50); };
  const next = (s: number) => {
    const e = validateSalesStep(s, form, fr); setErrors(e);
    if (Object.keys(e).length) { document.getElementById(`dv-${Object.keys(e)[0]}`)?.focus(); return; }
    const n = s + 1; setStep(n); void logFunnelEvent({ event_type: "sales_team_step", step: String(n) });
  };

  const share = async () => {
    const url = buildShareUrl(window.location.origin, utm);
    void logFunnelEvent({ event_type: "sales_team_shared", metadata: { method: "navigator" in window && "share" in navigator ? "web_share" : "copy" } });
    setShareMsg("");
    if (navigator.share) {
      try { await navigator.share({ title: "UNPRO", text: t("Vos vendeurs devraient passer leur temps à vendre.", "Your sellers should spend their time selling."), url }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setShareMsg(t("Lien copié. Collez-le dans un message à votre directeur des ventes.", "Link copied. Paste it in a message to your sales director.")); }
    catch { setShareMsg(t(`Copie impossible. Copiez ce lien : ${url}`, `Copy failed. Copy this link: ${url}`)); }
  };

  const submit = async () => {
    const all = Object.assign({}, ...[0, 1, 2, 3, 4].map(s => validateSalesStep(s, form, fr)));
    if (Object.keys(all).length) { setErrors(all); setStep(4); return; }
    if (state === "loading") return;
    setState("loading"); setServerMsg("");
    let key = sessionStorage.getItem(KEY_KEY); if (!key) { key = newKey(); sessionStorage.setItem(KEY_KEY, key); }
    const consent_text = t("J’accepte qu’UNPRO conserve ces informations et me contacte au sujet de cette demande d’offre.", "I agree that UNPRO may keep this information and contact me about this offer request.");
    const { data, error } = await supabase.functions.invoke("submit-sales-team-request", {
      body: { ...toPayload(form), idempotency_key: key, consent_text, utm, locale: lang, hp: honey.current?.value ?? "", started_at: startedAt.current },
    });
    const ok = (data as { ok?: boolean; id?: string } | null);
    if (error || !ok?.ok || !ok.id) {
      setState("error");
      setServerMsg(t("La demande n’a pas pu être enregistrée. Vos réponses sont conservées. Réessayez dans un instant.", "Your request could not be saved. Your answers are kept. Please try again shortly."));
      return;
    }
    void logFunnelEvent({ event_type: "sales_team_submitted", dedupe_key: `sales_team:${key}`, metadata: { sellers: toPayload(form).sellers_count } });
    sessionStorage.removeItem(KEY_KEY); setState("done");
  };

  const sim = simulateSales(parseAmount(form.annual_revenue_goal_cad), form.ticket_unknown ? null : parseAmount(form.average_ticket_cad), form.rate_unknown ? null : parseAmount(form.close_rate_pct));
  const roles: [SalesRole, string][] = [["seller", t("Vendeur", "Seller")], ["sales_director", t("Direction des ventes", "Sales director")], ["owner", t("Propriétaire", "Owner")]];
  const objectives: [SalesObjective, string][] = [["more_sales", t("Plus de ventes", "More sales")], ["profitability", t("Rentabilité", "Profitability")], ["bigger_ticket", t("Meilleur panier", "Bigger ticket")], ["less_travel", t("Moins de déplacements", "Less travel")], ["fill_calendars", t("Combler les agendas", "Fill calendars")]];

  const input = (k: keyof SalesTeamForm, label: string, o: { opt?: boolean; hint?: string; area?: boolean; mode?: "numeric" | "decimal" | "email" | "tel" } = {}) => (
    <label className="dv-field" htmlFor={`dv-${k}`}>
      <strong>{label}{o.opt && <small> · {t("facultatif", "optional")}</small>}</strong>
      {o.hint && <small>{o.hint}</small>}
      {o.area
        ? <textarea id={`dv-${k}`} value={form[k] as string} onChange={e => set(k, e.target.value as never)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `dv-${k}-err` : undefined} />
        : <input id={`dv-${k}`} inputMode={o.mode === "email" || o.mode === "tel" ? undefined : o.mode} type={o.mode === "email" ? "email" : o.mode === "tel" ? "tel" : "text"} value={form[k] as string} onChange={e => set(k, e.target.value as never)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `dv-${k}-err` : undefined} />}
      {errors[k] && <small id={`dv-${k}-err`} role="alert" className="spf-err">{errors[k]}</small>}
    </label>
  );
  const nav = (s: number) => (
    <div className="dv-row">
      {s > 0 ? <button type="button" className="dv-ghost" onClick={() => setStep(s - 1)}><ArrowLeft size={16} className="inline" /> {t("Retour", "Back")}</button> : <span />}
      <button type="button" className="utp-button" onClick={() => next(s)}>{t("Continuer", "Continue")} <ArrowRight size={18} /></button>
    </div>
  );
  const labelOf = (list: [string, string][], v: string) => list.find(([k]) => k === v)?.[1] ?? "—";

  return (
    <div className="utp">
      <Helmet>
        <html lang={fr ? "fr-CA" : "en-CA"} />
        <title>{t("Rendez-vous qualifiés pour équipes de vente | UNPRO", "Qualified appointments for sales teams | UNPRO")}</title>
        <meta name="description" content={t("Définissez les mandats, territoires et objectifs de votre équipe de vente pour étudier une offre UNPRO de rendez-vous exclusifs adaptée.", "Define your sales team’s mandates, territories and goals to review a tailored UNPRO exclusive appointment offer.")} />
        <link rel="canonical" href="https://unpro.ca/directeur-des-ventes" />
        <meta property="og:title" content={t("Vos vendeurs méritent de meilleurs rendez-vous.", "Your sellers deserve better appointments.")} />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="utp-header"><Link to="/" aria-label="UNPRO"><UnproLogo size={120} tone="dark" /></Link><LanguageToggle lang={lang} onChange={setLang} /></header>
      <main>
        <section className="utp-wrap utp-section">
          <div className="utp-eyebrow">{t("ÉQUIPES DE VENTE • ENTREPRENEURS", "SALES TEAMS • CONTRACTORS")}</div>
          <h1>{t("Vos vendeurs devraient passer leur temps", "Your sellers should spend their time")} <span>{t("à vendre.", "selling.")}</span></h1>
          <p className="utp-lead">{t("Définissez les mandats, les territoires et les objectifs de votre équipe. Voyons quelle offre UNPRO peut y répondre.", "Define your team’s mandates, territories and goals. Let’s see which UNPRO offer can meet them.")}</p>
          <div className="utp-actions">
            <button type="button" className="utp-button" onClick={start}>{t("Définir les besoins de mon équipe", "Define my team’s needs")} <ArrowRight size={18} /></button>
            <button type="button" className="utp-link" onClick={share}><Share2 size={16} className="mr-2" /> {t("Transmettre à mon directeur des ventes", "Send to my sales director")}</button>
          </div>
          {shareMsg && <p role="status" className="utp-fine">{shareMsg}</p>}
          <p className="utp-fine">{t("Le lien partagé ne contient aucune de vos informations. Rien n’est envoyé automatiquement.", "The shared link contains none of your information. Nothing is sent automatically.")}</p>
        </section>

        {step !== null && (
          <section className="utp-wrap utp-section" aria-labelledby="dv-q">
            <div ref={formRef}>
              <h2 id="dv-q">{state === "done" ? t("Demande reçue.", "Request received.") : t("Les besoins de votre équipe", "Your team’s needs")}</h2>
              <div className="dv-card">
                <input ref={honey} className="spf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {state !== "done" && <div className="dv-progress" aria-hidden="true"><i style={{ width: `${(Math.min(step, SALES_STEPS) + 1) / (SALES_STEPS + 1) * 100}%` }} /></div>}
                {state !== "done" && <p className="utp-fine" aria-live="polite">{step < SALES_STEPS ? t(`Étape ${step + 1} sur ${SALES_STEPS}`, `Step ${step + 1} of ${SALES_STEPS}`) : t("Résumé", "Summary")}</p>}

                {state === "done" ? (
                  <div role="status">
                    <CheckCircle2 size={32} className="text-primary" aria-hidden="true" />
                    <p>{t("Votre demande est enregistrée. Une offre adaptée à votre équipe sera préparée selon vos mandats, vos territoires et la demande réelle dans votre région. Aucun prix, volume ni paiement n’est engagé à ce stade.", "Your request is saved. A tailored offer will be prepared based on your mandates, territories and real demand in your region. No price, volume or payment is committed at this stage.")}</p>
                    <div className="dv-row"><Link className="utp-button" to={buildSalesClaraLink(form)}>{t("Continuer avec Clara", "Continue with Clara")} <ArrowRight size={18} /></Link></div>
                  </div>
                ) : step === 0 ? (<>
                  {input("company", t("Entreprise", "Company"))}
                  {input("website", t("Site Web", "Website"), { opt: true })}
                  <fieldset className="dv-field"><legend><strong>{t("Votre rôle", "Your role")}</strong></legend>
                    <div className="dv-chips" id="dv-role" tabIndex={-1}>{roles.map(([k, l]) => <button key={k} type="button" aria-pressed={form.role === k} onClick={() => set("role", k)}>{l}</button>)}</div>
                    {errors.role && <small role="alert" className="spf-err">{errors.role}</small>}
                  </fieldset>
                  {input("sellers_count", t("Nombre de vendeurs", "Number of sellers"), { mode: "numeric", hint: t("Une personne seule est aussi bienvenue.", "A solo seller is welcome too.") })}
                  {nav(0)}
                </>) : step === 1 ? (<>
                  {input("specialties", t("Spécialités", "Specialties"), { hint: t("Ex. : thermopompes, toiture", "E.g. heat pumps, roofing") })}
                  {input("priority_mandates", t("Mandats prioritaires", "Priority mandates"), { opt: true, area: true })}
                  {input("refused_mandates", t("Mandats refusés", "Refused mandates"), { opt: true, area: true })}
                  {input("territories", t("Territoires", "Territories"), { hint: t("Villes ou régions", "Cities or regions") })}
                  {input("travel_radius_km", t("Rayon de déplacement (km)", "Travel radius (km)"), { opt: true, mode: "numeric" })}
                  {nav(1)}
                </>) : step === 2 ? (<>
                  <fieldset className="dv-field"><legend><strong>{t("Objectifs de l’équipe", "Team goals")}</strong></legend>
                    <div className="dv-chips" id="dv-objectives" tabIndex={-1}>{objectives.map(([k, l]) => <button key={k} type="button" aria-pressed={form.objectives.includes(k)} onClick={() => set("objectives", form.objectives.includes(k) ? form.objectives.filter(x => x !== k) : [...form.objectives, k])}>{l}</button>)}</div>
                    {errors.objectives && <small role="alert" className="spf-err">{errors.objectives}</small>}
                  </fieldset>
                  {input("annual_revenue_goal_cad", t("Chiffre d’affaires supplémentaire visé sur 12 mois ($)", "Additional revenue target over 12 months ($)"), { opt: true, mode: "decimal" })}
                  {nav(2)}
                </>) : step === 3 ? (<>
                  {input("weekly_capacity", t("Capacité totale de l’équipe (rendez-vous par semaine)", "Total team capacity (appointments per week)"), { opt: true, mode: "numeric" })}
                  {!form.ticket_unknown && input("average_ticket_cad", t("Panier moyen déclaré ($)", "Declared average ticket ($)"), { opt: true, mode: "decimal" })}
                  <label className="dv-check"><input type="checkbox" checked={form.ticket_unknown} onChange={e => set("ticket_unknown", e.target.checked)} /> {t("Je ne sais pas (panier moyen)", "I don’t know (average ticket)")}</label>
                  {!form.rate_unknown && input("close_rate_pct", t("Taux de conclusion déclaré (%)", "Declared close rate (%)"), { opt: true, mode: "decimal" })}
                  <label className="dv-check"><input type="checkbox" checked={form.rate_unknown} onChange={e => set("rate_unknown", e.target.checked)} /> {t("Je ne sais pas (taux de conclusion)", "I don’t know (close rate)")}</label>
                  {sim && <div className="dv-sim" aria-live="polite">
                    <p className="utp-fine">{t("Simulation sur 12 mois fondée uniquement sur vos déclarations — pas une promesse.", "12-month simulation based only on your declarations — not a promise.")}</p>
                    <p>{t("Ventes additionnelles", "Additional sales")} = {fmtCad(parseAmount(form.annual_revenue_goal_cad)!, fr)} ÷ {fmtCad(parseAmount(form.average_ticket_cad)!, fr)} ≈ <strong>{fmtInt(sim.additionalSales, fr)}</strong></p>
                    {sim.appointments !== null && <p>{t("Rendez-vous nécessaires", "Appointments needed")} = {fmtInt(sim.additionalSales, fr)} ÷ {fmtInt(parseAmount(form.close_rate_pct)!, fr)}{fr ? "\u00a0%" : "%"} ≈ <strong>{fmtInt(sim.appointments, fr)}</strong></p>}
                  </div>}
                  {nav(3)}
                </>) : step === 4 ? (<>
                  {input("first_name", t("Prénom", "First name"))}
                  {input("last_name", t("Nom", "Last name"))}
                  {input("email", t("Courriel", "Email"), { mode: "email" })}
                  {input("phone", t("Téléphone", "Phone"), { opt: true, mode: "tel" })}
                  <label className="dv-check" htmlFor="dv-follow_up_consent"><input id="dv-follow_up_consent" type="checkbox" checked={form.follow_up_consent} onChange={e => set("follow_up_consent", e.target.checked)} aria-invalid={!!errors.follow_up_consent} /> {t("J’accepte qu’UNPRO conserve ces informations et me contacte au sujet de cette demande d’offre.", "I agree that UNPRO may keep this information and contact me about this offer request.")}</label>
                  {errors.follow_up_consent && <small role="alert" className="spf-err">{errors.follow_up_consent}</small>}
                  <label className="dv-check"><input type="checkbox" checked={form.marketing_opt_in} onChange={e => set("marketing_opt_in", e.target.checked)} /> {t("Facultatif : recevoir aussi les nouvelles d’UNPRO.", "Optional: also receive UNPRO news.")}</label>
                  {nav(4)}
                </>) : (<>
                  <dl className="dv-summary">
                    {[[0, t("Entreprise", "Company"), `${form.company} · ${labelOf(roles, form.role)} · ${form.sellers_count} ${t("vendeur(s)", "seller(s)")}`],
                      [1, t("Spécialités et territoires", "Specialties and territories"), `${form.specialties} · ${form.territories}${form.travel_radius_km ? ` · ${form.travel_radius_km}\u00a0km` : ""}`],
                      [2, t("Objectifs", "Goals"), form.objectives.map(o => labelOf(objectives, o)).join(", ") + (form.annual_revenue_goal_cad ? ` · ${fmtCad(parseAmount(form.annual_revenue_goal_cad) ?? 0, fr)}` : "")],
                      [3, t("Capacité", "Capacity"), form.weekly_capacity ? `${form.weekly_capacity} ${t("RDV/semaine", "appts/week")}` : t("Non précisée", "Not specified")],
                      [4, t("Contact", "Contact"), `${form.first_name} ${form.last_name} · ${form.email}`]].map(([s, l, v]) => (
                      <div key={s as number}><dt>{l}</dt><dd>{v} <button type="button" onClick={() => setStep(s as number)}>{t("Modifier", "Edit")}</button></dd></div>
                    ))}
                  </dl>
                  <p className="utp-fine">{t("Aucune offre, aucun prix ni volume n’est promis. Une offre personnalisée sera préparée après étude ; le nombre de rendez-vous dépend de la région et de la spécialité et sera précisé avant tout paiement.", "No offer, price or volume is promised. A tailored offer will be prepared after review; appointment volume depends on region and specialty and will be specified before any payment.")}</p>
                  {serverMsg && <p role="alert" className="dv-alert">{serverMsg}</p>}
                  <div className="dv-row">
                    <button type="button" className="dv-ghost" onClick={() => setStep(4)}><ArrowLeft size={16} className="inline" /> {t("Retour", "Back")}</button>
                    <button type="button" className="utp-button" onClick={submit} disabled={state === "loading"} aria-busy={state === "loading"}>
                      {state === "loading" ? <><Loader2 size={18} className="animate-spin" /> {t("Enregistrement…", "Saving…")}</> : state === "error" ? t("Réessayer", "Try again") : t("Demander une offre personnalisée", "Request a tailored offer")}
                    </button>
                  </div>
                </>)}
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="utp-wrap utp-footer"><span>UNPRO · Québec</span><Link to="/entrepreneurs">{t("Je suis entrepreneur", "I’m a contractor")}</Link></footer>
    </div>
  );
}
