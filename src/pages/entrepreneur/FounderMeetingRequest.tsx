/**
 * Section « Choisir un moment pour discuter » (/commission, /en/commission).
 * Mode « live » : la fonction serveur `founder-meeting` lit les plages occupées de l'agenda
 * principal du fondateur et renvoie les 3 prochains moments libres; la réservation n'est
 * confirmée qu'après création réelle de l'événement ET enregistrement serveur.
 * Repli : si l'agenda est indisponible ou la réservation échoue, horaires PROPOSÉS et demande
 * enregistrée par `submit-supplier-partnership`, confirmée ensuite par UNPRO.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { CalendarClock, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDayLabel, formatSlotFull, formatSlotTime, isProposedSlotStillValid, proposeFounderMeetingDays, slotFromServer, type ProposedSlot,
} from "@/lib/founderMeetingSlots";

export type MeetingTopic = "commission" | "partnership";
type Lang = "fr" | "en";

const T = {
  fr: {
    title: "Choisir un moment pour discuter",
    intro: "Choisissez l'horaire qui vous convient le mieux parmi trois propositions de 90 minutes, entre 10 h et 15 h, heure de Montréal. Nous vous confirmerons le rendez-vous par courriel.",
    caveat: "Horaires proposés, sous réserve de confirmation : aucun rendez-vous n'est réservé automatiquement.",
    dayLegend: "Jour proposé",
    slotLegend: "Horaires proposés (90 min, heure de Montréal)",
    topicLegend: "Sujet de la rencontre",
    topics: { commission: "Formule 100 % à la commission", partnership: "Proposition de partenariat" },
    first: "Prénom", last: "Nom", company: "Entreprise", email: "Courriel",
    message: "Quelques mots sur votre entreprise ou votre proposition", optional: "facultatif",
    consent: "J'accepte qu'UNPRO conserve ces informations pour répondre à ma demande de rencontre, conformément à la politique de confidentialité.",
    privacy: "Politique de confidentialité",
    submit: "Envoyer ma demande",
    sending: "Envoi en cours…",
    done: "Demande envoyée, nous confirmerons le rendez-vous.",
    doneNote: "Rien n'est inscrit à l'agenda avant notre confirmation.",
    preferred: "Horaire préféré",
    error: "La demande n'a pas pu être enregistrée. Rien n'a été envoyé. Réessayez dans un instant.",
    rateLimited: "Plusieurs demandes ont déjà été reçues de votre connexion. Réessayez dans une heure ou écrivez-nous.",
    expired: "Cet horaire n'est plus proposable. Choisissez-en un autre.",
    retry: "Réessayer",
    writeInstead: "Vous préférez écrire ?",
    contact: "Nous contacter",
    errs: { required: "Ce champ est requis.", email: "Entrez un courriel valide.", slot: "Choisissez un horaire.", consent: "Votre accord est requis pour enregistrer la demande." },
    empty: "Aucun horaire n'est proposé pour le moment.",
    loadingSlots: "Recherche des prochains moments libres…",
    liveIntro: "Voici les trois prochains moments libres de 90 minutes, entre 10 h et 15 h, heure de Montréal. Choisissez-en un : le rendez-vous est inscrit à l'agenda dès que nous l'avons enregistré.",
    liveLegend: "Prochains moments libres (90 min, heure de Montréal)",
    domain: "Domaine et territoire", 
    book: "Réserver ce moment",
    booking: "Réservation en cours…",
    confirmed: "Rendez-vous confirmé.",
    confirmedNote: "Une invitation Google Agenda est envoyée à l'adresse indiquée.",
    conflict: "Ce moment vient d'être pris. Voici les prochains moments libres.",
    duplicate: "Un rendez-vous à venir existe déjà pour ce courriel. Écrivez-nous pour le modifier.",
    fallbackNote: "La réservation automatique n'a pas pu être faite : votre demande a été enregistrée et nous confirmerons le rendez-vous.",
  },
  en: {
    title: "Choose a time to talk",
    intro: "Pick the time that suits you best among three 90-minute proposals, between 10 a.m. and 3 p.m., Montréal time. We will confirm the meeting by email.",
    caveat: "Proposed times, subject to confirmation: no meeting is booked automatically.",
    dayLegend: "Proposed day",
    slotLegend: "Proposed times (90 min, Montréal time)",
    topicLegend: "Meeting topic",
    topics: { commission: "100% commission formula", partnership: "Partnership proposal" },
    first: "First name", last: "Last name", company: "Company", email: "Email",
    message: "A few words about your business or proposal", optional: "optional",
    consent: "I agree that UNPRO may keep this information to respond to my meeting request, in accordance with the privacy policy.",
    privacy: "Privacy policy",
    submit: "Send my request",
    sending: "Sending…",
    done: "Request sent, we will confirm the meeting.",
    doneNote: "Nothing is added to the calendar before our confirmation.",
    preferred: "Preferred time",
    error: "Your request could not be saved. Nothing was sent. Please try again shortly.",
    rateLimited: "Several requests were already received from your connection. Try again in an hour or write to us.",
    expired: "This time can no longer be proposed. Please choose another one.",
    retry: "Try again",
    writeInstead: "Prefer to write?",
    contact: "Contact us",
    errs: { required: "This field is required.", email: "Enter a valid email.", slot: "Choose a time.", consent: "Your consent is required to save the request." },
    empty: "No time is proposed right now.",
    loadingSlots: "Looking for the next free times…",
    liveIntro: "Here are the next three free 90-minute times, between 10 a.m. and 3 p.m., Montréal time. Pick one: the meeting is added to the calendar as soon as we have saved it.",
    liveLegend: "Next free times (90 min, Montréal time)",
    domain: "Field and service area",
    book: "Book this time",
    booking: "Booking…",
    confirmed: "Meeting confirmed.",
    confirmedNote: "A Google Calendar invitation is sent to the address provided.",
    conflict: "This time was just taken. Here are the next free times.",
    duplicate: "An upcoming meeting already exists for this email. Write to us to change it.",
    fallbackNote: "Automatic booking could not be completed: your request was saved and we will confirm the meeting.",
  },
} as const;

type Form = { first_name: string; last_name: string; company: string; email: string; domain: string; message: string; consent: boolean };
const EMPTY: Form = { first_name: "", last_name: "", company: "", email: "", domain: "", message: "", consent: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Message enregistré pour l'équipe UNPRO (libellé FR + instant UTC exact). */
export function buildMeetingRequestMessage(topic: MeetingTopic, slot: ProposedSlot, note: string, autoFailed = false): string {
  return [
    "[Demande de rencontre — page /commission]",
    autoFailed ? "Réservation automatique non effectuée : rendez-vous à confirmer manuellement." : "",
    `Sujet : ${T.fr.topics[topic]}`,
    `Horaire préféré (proposé, sous réserve de confirmation) : ${formatSlotFull(slot, "fr")} — début UTC ${slot.startIso}`,
    "Durée : 90 min",
    note.trim() ? `Message : ${note.trim().slice(0, 1200)}` : "",
  ].filter(Boolean).join("\n");
}

type BookResponse = { status?: string; slot?: { start: string; end: string }; slots?: { start: string; end: string }[]; error?: string };

async function readInvoke(res: { data: unknown; error: unknown }): Promise<{ httpStatus: number; body: BookResponse | null }> {
  if (!res.error) return { httpStatus: 200, body: (res.data as BookResponse) ?? null };
  if (res.error instanceof FunctionsHttpError) {
    const ctx = res.error.context as Response | undefined;
    const body = ctx ? await ctx.clone().json().catch(() => null) : null;
    return { httpStatus: ctx?.status ?? 0, body };
  }
  return { httpStatus: 0, body: null };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const toSlots = (list?: { start: string; end: string }[]) =>
  (list ?? []).map((x) => slotFromServer(x.start, x.end)).filter((x): x is ProposedSlot => !!x).slice(0, 3);

const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`);

export default function FounderMeetingRequest({ lang, topic, onTopicChange, now }: {
  lang: Lang; topic: MeetingTopic; onTopicChange: (t: MeetingTopic) => void; now?: () => Date;
}) {
  const c = T[lang];
  const clock = now ?? (() => new Date());
  const [refresh, setRefresh] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const days = useMemo(() => proposeFounderMeetingDays(clock(), 5), [refresh]);
  const [mode, setMode] = useState<"loading" | "live" | "proposed">("loading");
  const [liveSlots, setLiveSlots] = useState<ProposedSlot[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<ProposedSlot | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "error" | "confirmed" | "pending">("idle");
  const [serverMsg, setServerMsg] = useState("");
  const [notice, setNotice] = useState("");
  const honey = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const idemKey = useRef(newKey());
  const day = days[Math.min(dayIdx, Math.max(days.length - 1, 0))];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let alive = true;
    supabase.functions.invoke("founder-meeting", { body: { action: "slots" } })
      .then((res) => {
        if (!alive) return;
        const d = res.data as { mode?: string; slots?: { start: string; end: string }[] } | null;
        const list = !res.error && d?.mode === "live" ? toSlots(d.slots) : [];
        if (list.length > 0) { setLiveSlots(list); setMode("live"); } else setMode("proposed");
      })
      .catch(() => { if (alive) setMode("proposed"); });
    return () => { alive = false; };
  }, []);

  /** Existing pending-request path (human confirmation). Success only on server ok + id. */
  const submitPending = async (chosen: ProposedSlot, autoFailed: boolean) => {
    const { data, error } = await supabase.functions.invoke("submit-supplier-partnership", {
      body: {
        company: form.company.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(),
        org_type: "other", network_size: null,
        message: buildMeetingRequestMessage(topic, chosen, [form.domain.trim() && `Domaine / territoire : ${form.domain.trim()}`, form.message.trim()].filter(Boolean).join(" — "), autoFailed),
        privacy_consent: true, consent_text: c.consent, locale: lang,
        website: honey.current?.value ?? "", started_at: startedAt.current,
      },
    });
    const ok = (data as { ok?: boolean; id?: string } | null)?.ok === true && !!(data as { id?: string }).id;
    if (error || !ok) {
      let status = 0;
      if (error instanceof FunctionsHttpError) status = error.context?.status ?? 0;
      setState("error");
      setServerMsg(status === 429 ? c.rateLimited : c.error);
      return;
    }
    setNotice(autoFailed ? c.fallbackNote : "");
    setState("pending");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!slot) errs.slot = c.errs.slot;
    if (form.first_name.trim().length < 1) errs.first_name = c.errs.required;
    if (form.last_name.trim().length < 1) errs.last_name = c.errs.required;
    if (form.company.trim().length < 2) errs.company = c.errs.required;
    if (!EMAIL_RE.test(form.email.trim())) errs.email = c.errs.email;
    if (!form.consent) errs.consent = c.errs.consent;
    if (slot && mode === "proposed" && !isProposedSlotStillValid(slot, clock())) {
      errs.slot = c.expired; setSlot(null); setRefresh((r) => r + 1); setDayIdx(0);
    }
    setErrors(errs);
    if (Object.keys(errs).length) { document.getElementById(`fm-${Object.keys(errs)[0]}`)?.focus(); return; }
    setState("loading"); setServerMsg(""); setNotice("");
    const chosen = slot!;
    if (mode !== "live") { await submitPending(chosen, false); return; }

    const res = await supabase.functions.invoke("founder-meeting", {
      body: {
        action: "book", slot_start: chosen.startIso, topic,
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), company: form.company.trim(), email: form.email.trim(),
        domain_territory: form.domain.trim() || null, message: form.message.trim() || null,
        privacy_consent: true, consent_text: c.consent, locale: lang, idempotency_key: idemKey.current,
        website: honey.current?.value ?? "", started_at: startedAt.current,
      },
    }).catch(() => ({ data: null, error: new Error("network") }));
    const { httpStatus, body } = await readInvoke(res);
    if (httpStatus === 200 && body?.status === "confirmed" && body.slot) {
      const confirmedSlot = slotFromServer(body.slot.start, body.slot.end);
      if (confirmedSlot) { setSlot(confirmedSlot); setState("confirmed"); return; }
    }
    if (httpStatus === 429) { setState("error"); setServerMsg(c.rateLimited); return; }
    if (httpStatus === 409 && body?.status === "duplicate_email") { setState("error"); setServerMsg(c.duplicate); return; }
    if (body?.status === "conflict") {
      const fresh = toSlots(body.slots);
      idemKey.current = newKey();
      setSlot(null);
      if (fresh.length) { setLiveSlots(fresh); setState("idle"); setErrors({ slot: c.conflict }); }
      else { setMode("proposed"); setState("idle"); setErrors({ slot: c.conflict }); }
      return;
    }
    if (httpStatus === 400 || httpStatus === 422) { setState("error"); setServerMsg(c.error); return; }
    // Calendar unavailable or unknown outcome: honest pending request through the existing flow.
    await submitPending(chosen, true);
  };

  if ((state === "confirmed" || state === "pending") && slot) {
    const confirmed = state === "confirmed";
    return (
      <div role="status" className="space-y-3 rounded-[28px] border border-primary/30 bg-primary/10 p-6">
        <p className="flex items-center gap-2 text-lg font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />{confirmed ? c.confirmed : c.done}</p>
        <p className="text-base text-foreground/90">{confirmed ? cap(formatSlotFull(slot, lang)) : `${c.preferred} : ${formatSlotFull(slot, lang)}`}</p>
        <p className="text-sm text-muted-foreground">{confirmed ? c.confirmedNote : notice || c.doneNote}</p>
      </div>
    );
  }

  const field = (k: "first_name" | "last_name" | "company" | "email" | "domain", label: string, type = "text", auto = "off", optional = false) => (
    <div className="space-y-1.5">
      <label htmlFor={`fm-${k}`} className="text-sm font-semibold text-foreground">{label}{optional && <span className="font-normal text-muted-foreground"> · {c.optional}</span>}</label>
      <Input id={`fm-${k}`} type={type} value={form[k]} autoComplete={auto} maxLength={k === "email" ? 255 : k === "domain" ? 200 : 160}
        onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `fm-${k}-err` : undefined} className="min-h-12" />
      {errors[k] && <p id={`fm-${k}-err`} role="alert" className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  const chip = (active: boolean) =>
    `min-h-12 rounded-button border px-4 py-2 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? "border-primary bg-primary/15 font-semibold text-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`;

  const slotRadio = (s: ProposedSlot, full: boolean) => (
    <label key={s.startIso} className={`${chip(slot?.startIso === s.startIso)} flex cursor-pointer items-center gap-3`}>
      <input type="radio" name="founder-slot" value={s.startIso} checked={slot?.startIso === s.startIso}
        onChange={() => setSlot(s)} className="h-4 w-4 shrink-0 accent-primary" />
      <span>{full ? cap(formatSlotFull(s, lang)) : formatSlotTime(s, lang)}</span>
    </label>
  );

  if (mode === "loading") {
    return <p role="status" className="flex items-center gap-2 text-base text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{c.loadingSlots}</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <p className="text-base text-muted-foreground">{mode === "live" ? c.liveIntro : c.intro}</p>
      {mode === "proposed" && (
        <p className="flex gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground/90">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{c.caveat}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">{c.topicLegend}</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(["commission", "partnership"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={topic === t} onClick={() => onTopicChange(t)} className={chip(topic === t)}>{c.topics[t]}</button>
          ))}
        </div>
      </fieldset>

      {mode === "live" ? (
        <fieldset className="space-y-2" aria-describedby={errors.slot ? "fm-slot-err" : undefined}>
          <legend id="fm-slot" tabIndex={-1} className="text-sm font-semibold text-foreground">{c.liveLegend}</legend>
          <div className="grid gap-2">{liveSlots.map((s) => slotRadio(s, true))}</div>
          {errors.slot && <p id="fm-slot-err" role="alert" className="text-sm text-destructive">{errors.slot}</p>}
        </fieldset>
      ) : days.length === 0 ? <p className="text-base text-muted-foreground">{c.empty}</p> : (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">{c.dayLegend}</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d, i) => (
                <button key={d.localDate} type="button" aria-pressed={i === dayIdx} onClick={() => { setDayIdx(i); setSlot(null); }}
                  className={`${chip(i === dayIdx)} shrink-0 capitalize`}>{formatDayLabel(d.localDate, lang)}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2" aria-describedby={errors.slot ? "fm-slot-err" : undefined}>
            <legend id="fm-slot" tabIndex={-1} className="text-sm font-semibold text-foreground">{c.slotLegend}</legend>
            <div className="grid gap-2 sm:grid-cols-3">{day?.slots.map((s) => slotRadio(s, false))}</div>
            {errors.slot && <p id="fm-slot-err" role="alert" className="text-sm text-destructive">{errors.slot}</p>}
          </fieldset>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("first_name", c.first, "text", "given-name")}
        {field("last_name", c.last, "text", "family-name")}
        {field("company", c.company, "text", "organization")}
        {field("email", c.email, "email", "email")}
      </div>
      {field("domain", c.domain, "text", "off", true)}
      <div className="space-y-1.5">
        <label htmlFor="fm-message" className="text-sm font-semibold text-foreground">{c.message} <span className="font-normal text-muted-foreground">· {c.optional}</span></label>
        <Textarea id="fm-message" value={form.message} maxLength={1200} onChange={(e) => set("message", e.target.value)} rows={3} />
      </div>
      <input ref={honey} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input id="fm-consent" type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
          <span>{c.consent} <Link to="/confidentialite" className="font-semibold text-primary underline underline-offset-4">{c.privacy}</Link></span>
        </label>
        {errors.consent && <p role="alert" className="text-sm text-destructive">{errors.consent}</p>}
      </div>

      {state === "error" && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />{serverMsg}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={state === "loading"} className="h-auto min-h-12 whitespace-normal rounded-button px-6 text-base">
          {state === "loading"
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{mode === "live" ? c.booking : c.sending}</>
            : state === "error" ? c.retry : mode === "live" ? c.book : c.submit}
        </Button>
        <p className="text-sm text-muted-foreground">{c.writeInstead} <Link to="/contact" className="font-semibold text-primary underline underline-offset-4">{c.contact}</Link></p>
      </div>
    </form>
  );
}
