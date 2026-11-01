/**
 * UNPRO — Clara remplit le formulaire « devis personnalisé » (même session, même boîte).
 *
 * Une seule question manquante à la fois; chaque réponse remplit le champ visible.
 * Tout reste DÉCLARÉ par l'entrepreneur : rien n'est vérifié, inventé ni soumis.
 * Le formulaire fournit son brouillon courant à chaque tour (même sans « Continuer »).
 */
import {
  INTAKE_PRIORITIES, type IntakeQualification, hasPriorities, splitList, declaredCapacity, toClaraPatch,
} from "@/lib/contractorIntakeQualification";
import { saveClaraQualification } from "./claraContractorQualification";

export type IntakeField = "preferred_work" | "excluded_work" | "service_areas" | "excluded_areas" | "priorities" | "capacity";
export type IntakeDraft = { qualification: IntakeQualification; capacity_range?: "1-9" | "10-15" | "16-20" | "other"; next_month_appointments?: number };
export type IntakeLang = "fr" | "en";
export type IntakeReply = { text: string; quickReplies?: string[] };

const ORDER: IntakeField[] = ["preferred_work", "excluded_work", "service_areas", "excluded_areas", "priorities", "capacity"];
const STEP_FIELDS: Record<string, IntakeField[]> = {
  work: ["preferred_work", "excluded_work"], territories: ["service_areas", "excluded_areas"], priorities: ["priorities"], capacity: ["capacity"],
};

export const INTAKE_FIELD_LABELS: Record<IntakeLang, Record<IntakeField, string>> = {
  fr: { preferred_work: "Mandats voulus", excluded_work: "Travaux exclus", service_areas: "Territoires desservis", excluded_areas: "Territoires exclus", priorities: "Priorités", capacity: "Capacité" },
  en: { preferred_work: "Desired projects", excluded_work: "Excluded work", service_areas: "Service areas", excluded_areas: "Excluded areas", priorities: "Priorities", capacity: "Capacity" },
};

export function isFieldFilled(d: IntakeDraft, f: IntakeField): boolean {
  const q = d.qualification ?? {};
  switch (f) {
    case "preferred_work": return splitList(q.preferred_work).length > 0;
    case "excluded_work": return Boolean(q.no_excluded_work) || splitList(q.excluded_work).length > 0;
    case "service_areas": return splitList(q.service_areas).length > 0;
    case "excluded_areas": return Boolean(q.no_excluded_areas) || splitList(q.excluded_areas).length > 0;
    case "priorities": return hasPriorities(q);
    case "capacity": return declaredCapacity(d) !== null;
  }
}

/** Champ manquant de l'étape courante d'abord, puis l'ordre du formulaire. */
export function nextIntakeField(d: IntakeDraft, stepKey?: string): IntakeField | null {
  const first = (stepKey && STEP_FIELDS[stepKey]) || [];
  return [...first, ...ORDER].find((f) => !isFieldFilled(d, f)) ?? null;
}

const NONE = /^\s*(aucun(e)?(\s+exclusion)?|rien|non(,)?\s*(aucun|rien)|pas d['’]exclusion|none|nothing|no exclusions?)\s*[.!]?\s*$/i;
const CORRECTION = /^\s*(correction|corrig|en fait|plutôt|non[, ]|actually|correction:|change|instead)/i;
const STRIP_CORRECTION = /^\s*(correction\s*:?|corrigez?\s*:?|en fait,?|plutôt,?|non,?|actually,?|instead,?)\s*/i;

const PRIORITY_KEYS: Array<[RegExp, (typeof INTAKE_PRIORITIES)[number]]> = [
  [/rentab|profit|marge/i, "Augmenter ma rentabilité"],
  [/meilleur|better (projects|jobs)|mandats? (plus )?(payant|int[ée]ressant)/i, "Obtenir de meilleurs mandats"],
  [/sp[ée]cialit|specialt/i, "Développer une spécialité"],
  [/d[ée]placement|travel|proche|près/i, "Réduire mes déplacements"],
  [/calendrier|remplir|fill (my )?(calendar|schedule)/i, "Remplir mon calendrier"],
  [/stabil|steady|stable/i, "Stabiliser mes revenus"],
];

/** Détecte quel champ une correction explicite vise. */
function correctionTarget(text: string): IntakeField | null {
  if (/exclu|pas (de|dans)|sauf|except|exclude/i.test(text)) return /territoir|ville|r[ée]gion|area|city/i.test(text) ? "excluded_areas" : "excluded_work";
  if (/territoir|ville|r[ée]gion|secteur|area|city/i.test(text)) return "service_areas";
  if (/capacit|rendez-vous|rdv|appointments?/i.test(text)) return "capacity";
  if (/priorit|objectif|goal/i.test(text)) return "priorities";
  if (/mandat|travaux|projets?|work|jobs?/i.test(text)) return "preferred_work";
  return null;
}

const cleanList = (s: string) => s.replace(/\s+(et|and)\s+/gi, ", ").replace(/[.!]+$/g, "").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).join(", ");

/**
 * Applique une réponse libre. Remplace le champ visé (correction = valeur explicite la plus récente).
 * Une réponse peut remplir plusieurs champs (« toitures, pas de bardeaux, 10 rendez-vous »).
 */
export function applyIntakeAnswer(d: IntakeDraft, pending: IntakeField | null, raw: string): { draft: IntakeDraft; changed: IntakeField[] } {
  let text = raw.trim();
  const q: IntakeQualification = { ...(d.qualification ?? {}) };
  const out: IntakeDraft = { ...d, qualification: q };
  const changed = new Set<IntakeField>();
  let field = pending;
  if (CORRECTION.test(text)) {
    field = correctionTarget(text) ?? pending;
    text = text.replace(STRIP_CORRECTION, "").replace(/^(les |mes )?(territoires?|villes?|mandats?|travaux|capacit[ée]|priorit[ée]s?|exclusions?)\s*(exclus|sont|est|:)?\s*:?\s*/i, "");
  }
  if (!field || !text) return { draft: out, changed: [] };

  // Capacité mentionnée n'importe où (« … et 10 rendez-vous par mois »).
  const capMatch = text.match(/(\d{1,3})\s*(rendez-vous|rdv|appointments?)/i);
  if (field === "capacity" || capMatch) {
    const n = Number(capMatch?.[1] ?? text.match(/\d{1,3}/)?.[0]);
    if (Number.isFinite(n) && n >= 1) { out.capacity_range = "other"; out.next_month_appointments = n; changed.add("capacity"); }
    if (field === "capacity") return { draft: out, changed: [...changed] };
    text = text.replace(capMatch![0], "").replace(/(,|\bet\b|\band\b)?\s*(par|per)\s*mois|month/gi, "").trim();
  }

  if (field === "priorities") {
    const std = PRIORITY_KEYS.filter(([re]) => re.test(text)).map(([, label]) => label);
    q.priorities = [...new Set(std)];
    q.other_goal = std.length ? "" : text.slice(0, 80);
    changed.add("priorities");
    return { draft: out, changed: [...changed] };
  }

  const exclusionField: IntakeField = field === "service_areas" || field === "excluded_areas" ? "excluded_areas" : "excluded_work";
  const positiveField: IntakeField = exclusionField === "excluded_areas" ? "service_areas" : "preferred_work";
  const setExcl = (value: string | null) => {
    if (exclusionField === "excluded_areas") { q.no_excluded_areas = value === null; q.excluded_areas = value ?? ""; }
    else { q.no_excluded_work = value === null; q.excluded_work = value ?? ""; }
    changed.add(exclusionField);
  };

  if (field === exclusionField) {
    if (NONE.test(text)) setExcl(null);
    else setExcl(cleanList(text.replace(/^(pas de|pas|sauf|except|no)\s+/i, "")));
    return { draft: out, changed: [...changed] };
  }
  // Champ positif : une partie « pas de … / sauf … » devient une exclusion.
  const split = text.split(/[,;.]?\s*\b(?:mais\s+)?(?:pas de|pas d['’]|sauf|jamais de|except|but not|no)\s+/i);
  const positive = cleanList(split[0] ?? "");
  if (positive) { q[positiveField] = positive; changed.add(positiveField); }
  if (split.length > 1) {
    const rest = split.slice(1).join(", ");
    if (/aucune?\s+exclusion|rien d['’]exclu/i.test(rest)) setExcl(null); else setExcl(cleanList(rest));
  } else if (/aucune?\s+exclusion|rien d['’]exclu|no exclusions?/i.test(raw)) {
    q[positiveField] = cleanList(positive.replace(/aucune?\s+exclusion|no exclusions?/gi, ""));
    setExcl(null);
  }
  return { draft: out, changed: [...changed] };
}

const QUESTIONS: Record<IntakeLang, Record<IntakeField, IntakeReply>> = {
  fr: {
    preferred_work: { text: "Quels mandats voulez-vous faire en priorité ?" },
    excluded_work: { text: "Y a-t-il des travaux que vous ne voulez pas faire ?", quickReplies: ["Aucune exclusion"] },
    service_areas: { text: "Dans quelles villes ou régions voulez-vous travailler ?" },
    excluded_areas: { text: "Des secteurs à éviter ?", quickReplies: ["Aucune exclusion"] },
    priorities: { text: "Qu’est-ce qui compte le plus pour vous en ce moment ?", quickReplies: [...INTAKE_PRIORITIES] },
    capacity: { text: "Combien de rendez-vous pourriez-vous accueillir le mois prochain, de façon réaliste ?", quickReplies: ["Moins de 10", "10 à 15", "16 à 20"] },
  },
  en: {
    preferred_work: { text: "Which projects do you want to take on first?" },
    excluded_work: { text: "Is there any work you don’t want to do?", quickReplies: ["No exclusions"] },
    service_areas: { text: "Which cities or regions do you want to work in?" },
    excluded_areas: { text: "Any areas to avoid?", quickReplies: ["No exclusions"] },
    priorities: { text: "What matters most to you right now?", quickReplies: [...INTAKE_PRIORITIES] },
    capacity: { text: "Realistically, how many appointments could you take next month?", quickReplies: ["Moins de 10", "10 à 15", "16 à 20"] },
  },
};

const RANGE_REPLY: Record<string, "1-9" | "10-15" | "16-20"> = { "moins de 10": "1-9", "10 à 15": "10-15", "16 à 20": "16-20" };

function valueOf(d: IntakeDraft, f: IntakeField, lang: IntakeLang): string {
  const q = d.qualification ?? {};
  const none = lang === "fr" ? "aucune exclusion" : "no exclusions";
  switch (f) {
    case "preferred_work": return q.preferred_work ?? "";
    case "excluded_work": return q.no_excluded_work ? none : q.excluded_work ?? "";
    case "service_areas": return q.service_areas ?? "";
    case "excluded_areas": return q.no_excluded_areas ? none : q.excluded_areas ?? "";
    case "priorities": return [...(q.priorities ?? []), ...(q.other_goal ? [q.other_goal] : [])].join(", ");
    case "capacity": { const c = declaredCapacity(d); return !c ? "" : c.min === c.max ? `${c.min}` : `${c.min}–${c.max}`; }
  }
}

export function intakeSummary(d: IntakeDraft, lang: IntakeLang): string {
  const L = INTAKE_FIELD_LABELS[lang];
  return ORDER.filter((f) => isFieldFilled(d, f)).map((f) => `${L[f]} : ${valueOf(d, f, lang)}`).join("\n");
}

export interface FormIntakeContext {
  getDraft: () => IntakeDraft;
  apply: (draft: IntakeDraft, changed: IntakeField[]) => void;
  firstName?: string | null;
  businessName?: string | null;
  stepKey?: string;
  stepLabel?: string;
}

let active: FormIntakeContext | null = null;
export function registerClaraFormIntake(ctx: FormIntakeContext | null) { active = ctx; }
export function getClaraFormIntake(): FormIntakeContext | null { return active; }

function persist(d: IntakeDraft, confirmed: boolean) {
  const patch = toClaraPatch(d.qualification ?? {}, declaredCapacity(d));
  saveClaraQualification({
    ...(patch.goals.length ? { goals: patch.goals } : {}),
    ...(patch.preferred_work.length ? { preferred_work: patch.preferred_work } : {}),
    ...(isFieldFilled(d, "excluded_work") ? { excluded_work: patch.excluded_work } : {}),
    ...(patch.service_areas.length ? { service_areas: patch.service_areas } : {}),
    ...(isFieldFilled(d, "excluded_areas") ? { excluded_areas: patch.excluded_areas } : {}),
    ...(patch.availability ? { availability: patch.availability } : {}),
    preferences_captured: true,
    preferences_confirmed: confirmed,
  }, "declared", { replaceLists: true });
}

/** Brouillon courant → store canonique AVANT ouverture (aucune confirmation implicite). */
export function shareIntakeDraftWithClara(d: IntakeDraft) {
  if (ORDER.some((f) => isFieldFilled(d, f))) persist(d, false);
}

function ask(d: IntakeDraft, ctx: FormIntakeContext, lang: IntakeLang, prefix = ""): IntakeReply {
  const f = nextIntakeField(d, ctx.stepKey);
  if (!f) {
    const head = lang === "fr" ? "Voici ce que j’ai noté, tel que déclaré :" : "Here is what I noted, as declared:";
    const tail = lang === "fr" ? "Est-ce exact ? Vous pouvez corriger n’importe quel point." : "Is this right? You can correct anything.";
    return { text: `${prefix}${head}\n${intakeSummary(d, lang)}\n${tail}`, quickReplies: lang === "fr" ? ["Confirmer", "Corriger"] : ["Confirm", "Correct"] };
  }
  const qn = QUESTIONS[lang][f];
  return { text: `${prefix}${qn.text}`, quickReplies: qn.quickReplies };
}

export function buildIntakeGreeting(ctx: FormIntakeContext, lang: IntakeLang): IntakeReply {
  const d = ctx.getDraft();
  const name = ctx.firstName?.trim();
  const hello = lang === "fr"
    ? `Bonjour${name ? ` ${name}` : ""}, je peux vous aider à définir vos besoins.`
    : `Hello${name ? ` ${name}` : ""}, I can help you define your needs.`;
  const known = ORDER.filter((f) => isFieldFilled(d, f)).map((f) => INTAKE_FIELD_LABELS[lang][f].toLocaleLowerCase(lang === "fr" ? "fr-CA" : "en-CA"));
  const biz = ctx.businessName?.trim();
  const ctxLine = known.length
    ? (lang === "fr" ? ` ${biz ? `Pour ${biz}, j’ai` : "J’ai"} déjà : ${known.join(", ")}.` : ` ${biz ? `For ${biz}, I` : "I"} already have: ${known.join(", ")}.`)
    : biz ? (lang === "fr" ? ` Je reprends le dossier de ${biz}.` : ` I’m picking up ${biz}’s file.`) : "";
  return ask(d, ctx, lang, `${hello}${ctxLine}\n`);
}

/** Réponse de l'entrepreneur → champs remplis → prochaine question (ou résumé à confirmer). */
export function answerIntake(ctx: FormIntakeContext, raw: string, lang: IntakeLang): IntakeReply {
  const d = ctx.getDraft();
  const pending = nextIntakeField(d, ctx.stepKey);
  const text = raw.trim();
  if (!pending && /^(confirmer|confirm|oui|yes|c['’]est exact|exact)\b/i.test(text)) {
    persist(d, true);
    return { text: lang === "fr"
      ? "C’est noté comme confirmé par vous. Vos réponses sont dans le formulaire; revoyez-les puis continuez quand vous êtes prêt."
      : "Noted as confirmed by you. Your answers are in the form; review them, then continue when ready." };
  }
  if (!pending && /^(corriger|correct)\s*$/i.test(text)) {
    return { text: lang === "fr" ? "Que voulez-vous corriger ? Par exemple : « territoires : Laval, Longueuil »." : "What should I correct? For example: “areas: Laval, Longueuil”." };
  }
  let target = pending;
  let answer = text;
  if (pending === "capacity" && RANGE_REPLY[text.toLocaleLowerCase("fr-CA")]) {
    const r = RANGE_REPLY[text.toLocaleLowerCase("fr-CA")];
    const next: IntakeDraft = { ...d, capacity_range: r, next_month_appointments: { "1-9": 1, "10-15": 10, "16-20": 16 }[r] };
    ctx.apply(next, ["capacity"]); persist(next, false);
    return ask(next, ctx, lang, lang === "fr" ? "Noté : capacité " + valueOf(next, "capacity", lang) + ".\n" : "Noted: capacity " + valueOf(next, "capacity", lang) + ".\n");
  }
  if (!pending) { target = correctionTarget(text); answer = CORRECTION.test(text) ? text : `correction ${text}`; }
  const { draft, changed } = applyIntakeAnswer(d, target, answer);
  if (!changed.length) {
    return { text: lang === "fr" ? "Je n’ai pas bien saisi. Pouvez-vous le dire autrement ?" : "I didn’t quite get that. Could you rephrase?", quickReplies: target ? QUESTIONS[lang][target].quickReplies : undefined };
  }
  ctx.apply(draft, changed);
  persist(draft, false);
  const noted = changed.map((f) => `${INTAKE_FIELD_LABELS[lang][f]} : ${valueOf(draft, f, lang)}`).join(" · ");
  return ask(draft, ctx, lang, `${lang === "fr" ? "Noté" : "Noted"} — ${noted}.\n`);
}
