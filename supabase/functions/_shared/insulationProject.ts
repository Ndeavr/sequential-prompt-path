/** Exact declared intervention signals, shared by Clara, lead persistence and match-lead. */
export type InsulationContext = {
  insulation_zone?: "attic" | "walls" | "floors" | "multiple" | "unknown";
  // Homeowner declarations, never technical verification or permission to send.
  insulation_post_fire?: "declared";
  post_fire_access?: "authorized_declared" | "prohibited" | "unknown";
  post_fire_preparation?: "completed_declared" | "pending" | "unknown";
  insulation_condition?: "sound_dry" | "damaged" | "contaminated" | "unknown";
  insulation_scope?: "top_up_only" | "removal_before_install" | "targeted_remediation" | "assessment" | "unknown";
  contamination_suspected?: "none" | "mold" | "animal" | "vermiculite" | "asbestos" | "unknown";
};
const VALUES = {
  insulation_zone: ["attic", "walls", "floors", "multiple", "unknown"],
  insulation_post_fire: ["declared"],
  post_fire_access: ["authorized_declared", "prohibited", "unknown"],
  post_fire_preparation: ["completed_declared", "pending", "unknown"],
  insulation_condition: ["sound_dry", "damaged", "contaminated", "unknown"],
  insulation_scope: ["top_up_only", "removal_before_install", "targeted_remediation", "assessment", "unknown"],
  contamination_suspected: ["none", "mold", "animal", "vermiculite", "asbestos", "unknown"],
};
export function sanitizeInsulationContext(raw: unknown): InsulationContext {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(VALUES)) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && allowed.includes(value)) out[key] = value;
  }
  return out as InsulationContext;
}
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[’']/g, " ");
/** No symptom-to-removal inference; short answers require the preceding neutral question. */
export function captureInsulationTurn(previous: InsulationContext, answer: string, question = ""): InsulationContext {
  const out = sanitizeInsulationContext(previous); const t = norm(answer); const q = norm(question);
  // A post-fire mention prompts qualification; it never certifies readiness.
  // Negated/hypothetical mentions are left to conversational clarification.
  if (/\b(apres (un |l )?incendie|suite a (un |l )?(feu|incendie)|after (a |the )?fire|post[ -]fire)\b/.test(t)
      && !/\b(pas|aucun|sans|jamais|not|no|if|si|hypothetique|hypothetical)\b/.test(t)) out.insulation_post_fire = "declared";
  if (out.insulation_post_fire === "declared") {
    // Only exact choices paired to the preceding question may fill readiness.
    // Free text remains in canonical history for clarification, not certification.
    for (const item of POST_FIRE_QUESTIONS) {
      if ((q === norm(item.q) || q === item.key || q === "project_context." + item.key) && item.options.some(option => option.value === answer)) {
        Object.assign(out, { [item.key]: answer });
      }
    }
  }
  if (!out.insulation_post_fire && /\b(entretoit|grenier|attic|comble)\b/.test(t)) out.insulation_zone = "attic";
  const relevant = out.insulation_zone === "attic" || /isolant actuel|ajouter de l isolant|tout retirer et recommencer/.test(q);
  if (!relevant) return out;
  if (/\b(vermiculite|amiante|asbestos)\b/.test(t) && !/\b(pas de|sans|aucun|no)\s+(vermiculite|amiante|asbestos)/.test(t)) {
    out.contamination_suspected = /amiante|asbestos/.test(t) ? "asbestos" : "vermiculite";
  }
  if (/isolant.*(moisi|contamine)|contaminated insulation/.test(t)) { out.insulation_condition = "contaminated"; if (/moisi/.test(t)) out.contamination_suspected = "mold"; }
  else if (/isolant.*(endommage|abime|mouille)|damaged insulation/.test(t)) out.insulation_condition = "damaged";
  else if (/isolant.*(sec.*(bon etat|sain)|bon etat.*sec)|dry and sound/.test(t)) out.insulation_condition = "sound_dry";
  if (/\b(je veux|je souhaite|je voudrais|nous voulons|i want|i would like)\b/.test(t) || /souhaitez-vous surtout/.test(q)) {
    if (/(?:pas|sans|ne pas).*retir|(?:ajout|ajouter|top.?up).*(seulement|sans retrait|only)/.test(t)) out.insulation_scope = "top_up_only";
    else if (/(tout retirer|retrait complet|retirer tout|complete removal|full attic refurbishment|refaire.*entretoit.*complet)/.test(t)) out.insulation_scope = "removal_before_install";
    else if (/remediation ciblee|retrait cible|targeted remediation/.test(t)) out.insulation_scope = "targeted_remediation";
    else if (/faire evaluer|evaluation|assess|evaluer ce qui/.test(t)) out.insulation_scope = "assessment";
  }
  if (/^(je ne sais pas|je ne le sais pas|unknown|i don t know)[.! ]*$/.test(t.trim())) {
    if (/etat.*isolant/.test(q)) out.insulation_condition = "unknown";
    else if (/souhaitez-vous surtout/.test(q)) out.insulation_scope = "unknown";
  }
  // Exact structured choice values, only in response to their own question.
  if (/etat.*isolant/.test(q) && VALUES.insulation_condition.includes(answer)) out.insulation_condition = answer as InsulationContext["insulation_condition"];
  if (/souhaitez-vous surtout/.test(q) && VALUES.insulation_scope.includes(answer)) out.insulation_scope = answer as InsulationContext["insulation_scope"];
  return out;
}
const POST_FIRE_QUESTIONS = [
  { key: "post_fire_access", q: "Selon les responsables du chantier, l’accès à l’immeuble est-il autorisé?", options: [
    { value: "authorized_declared", label_fr: "Oui, selon les responsables" }, { value: "prohibited", label_fr: "Non, accès interdit" }, { value: "unknown", label_fr: "Je ne sais pas" },
  ] },
  { key: "insulation_zone", q: "Quelles parties de l’immeuble doivent être isolées après l’incendie?", options: [
    { value: "attic", label_fr: "Entretoit" }, { value: "walls", label_fr: "Murs" }, { value: "floors", label_fr: "Planchers" }, { value: "multiple", label_fr: "Plusieurs zones" }, { value: "unknown", label_fr: "À déterminer" },
  ] },
  { key: "post_fire_preparation", q: "Selon les responsables du chantier, les travaux préalables à l’isolation sont-ils terminés?", options: [
    { value: "completed_declared", label_fr: "Oui, selon les responsables" }, { value: "pending", label_fr: "Il reste des étapes à réaliser" }, { value: "unknown", label_fr: "Je ne sais pas" },
  ] },
] as const;
export function postFireGuidance(raw: unknown): string {
  const c = sanitizeInsulationContext(raw);
  if (!c.insulation_post_fire) return "";
  const blocked = c.post_fire_access === "prohibited" || c.post_fire_access === "unknown";
  return (blocked
    ? "Accès interdit ou inconnu : suspendre la qualification du chantier; orienter vers les responsables. Ne demander ni entrée sur place ni nouvelles photos. "
    : "Ne jamais demander d’entrer sur place ou de prendre de nouvelles photos sans autorisation des responsables. ") +
    "Après incendie : les réponses sont DÉCLARÉES, jamais des certifications de sécurité, de décontamination ou d’assèchement. Un incendie en cours suspend la qualification. " +
    "Réutiliser les renseignements déjà donnés; clarifier les réponses libres sans inventer de choix. Une question à la fois. " +
    "Recueillir ville, bâtiment, rôle, surfaces, étapes préalables, délai et canal de retour dans le parcours existant. Faire confirmer un résumé corrigeable et le consentement avant la soumission par la cliente. " +
    "Aucune entreprise recommandée sans compétence après sinistre, surfaces, territoire, licence et assurance vérifiés côté serveur. Un spécialiste d’entretoit ne couvre pas implicitement les murs ou planchers. " +
    "Recherche et sollicitation : résumé ANONYMISÉ secteur/travaux seulement; aucune identité, coordonnée, adresse exacte ni pièce privée transmise aux entrepreneurs, même avec consentement. N'utilise jamais l'expression « demande réelle ». Ne jamais annoncer enregistrement, contact, disponibilité ou rendez-vous sans preuve serveur. " +
    "Ne promettre un retour ultérieur que si un suivi persistant est effectivement enregistré dans le parcours existant.";
}
/** Server lock: prohibited/unknown post-fire access suspends all qualification and matching. */
export function isPostFireSuspended(raw: unknown): boolean {
  const c = sanitizeInsulationContext(raw);
  return c.insulation_post_fire === "declared" && (c.post_fire_access === "prohibited" || c.post_fire_access === "unknown");
}
export function nextInsulationQuestion(raw: unknown, category?: string | null, subType?: string | null) {
  const c = sanitizeInsulationContext(raw);
  if (c.insulation_post_fire) {
    if (c.post_fire_access === "prohibited" || c.post_fire_access === "unknown") return null;
    const next = POST_FIRE_QUESTIONS.find(item => !c[item.key]);
    return next ? { field: "project_context." + next.key, q: next.q, ui: "choice", why: "Déclaration à clarifier, sans certification technique.", options: [...next.options] } : null;
  }
  if (!(c.insulation_zone === "attic" || (category === "insulation" && subType === "attic"))) return null;
  if (!c.insulation_condition) return { field: "project_context.insulation_condition", q: "Savez-vous dans quel état se trouve l’isolant actuel?", ui: "choice", why: "Pour distinguer l’état connu des travaux souhaités.", options: [
    { value: "sound_dry", label_fr: "Sec et en bon état" }, { value: "damaged", label_fr: "Endommagé ou mouillé" }, { value: "contaminated", label_fr: "Contamination soupçonnée" }, { value: "unknown", label_fr: "Je ne sais pas" },
  ] };
  if (!c.insulation_scope) return { field: "project_context.insulation_scope", q: "Souhaitez-vous surtout ajouter de l’isolant, tout retirer et recommencer, ou faire évaluer ce qui est nécessaire?", ui: "choice", why: "L’évaluation ne présume pas qu’un retrait complet est nécessaire.", options: [
    { value: "top_up_only", label_fr: "Ajouter seulement" }, { value: "removal_before_install", label_fr: "Tout retirer et recommencer" }, { value: "assessment", label_fr: "Faire évaluer" }, { value: "unknown", label_fr: "Je ne sais pas" },
  ] };
  return null;
}
export type ProjectRule = { rule_type: string; payload?: Record<string, unknown>; source?: string; confirmed_by_contractor?: boolean };
export function evaluateInsulationRules(raw: unknown, rules: ProjectRule[]) {
  const c = sanitizeInsulationContext(raw);
  // There is no verified post-fire capability contract in this matcher yet.
  // Even completed preparation and a paid/verified generic profile cannot release it.
  if (c.insulation_post_fire) return { eligible: false, boost: 0, reasons: ["Compétence après incendie et préparation du chantier à vérifier"] };
  if (c.insulation_zone && c.insulation_zone !== "attic") return { eligible: false, boost: 0, reasons: ["Compatibilité des surfaces à vérifier hors du parcours entretoit"] };
  // No authoritative special-material qualification contract exists in this matcher.
  // A declared service or a generic verified RBQ licence is NOT that proof.
  if (c.contamination_suspected === "vermiculite" || c.contamination_suspected === "asbestos") return { eligible: false, boost: 0, reasons: ["Évaluation spécialisée requise; expertise spécifique non vérifiée"] };
  const exact = new Set<string>(); const relevant = new Set<string>(); const services = new Set<string>();
  if (c.insulation_scope === "top_up_only") { exact.add("attic:top_up_only"); services.add("ajout_isolant_souffle"); }
  if (c.insulation_scope === "removal_before_install") { exact.add("attic:removal_before_install"); services.add("retrait_isolant"); }
  for (const k of exact) relevant.add(k);
  if (c.insulation_scope === "assessment" || c.insulation_scope === "targeted_remediation" || c.insulation_condition === "damaged" || c.insulation_condition === "contaminated") {
    relevant.add("attic:remediation_assessment"); services.add("inspection_entretoit");
    // Removal preference is relevant to an evaluation, never an imposed scope or hard exclusion.
    relevant.add("attic:removal_before_install");
  }
  let boost = 0; const reasons: string[] = [];
  for (const r of rules) {
    if (r.source !== "declared" || r.confirmed_by_contractor !== true) continue;
    const p = r.payload ?? {}; const condition = typeof p.condition === "string" ? p.condition : "";
    const service = typeof p.service_slug === "string" ? p.service_slug : "";
    const isExact = exact.has(condition) || services.has(service) && (c.insulation_scope === "top_up_only" || c.insulation_scope === "removal_before_install");
    const isRelevant = relevant.has(condition) || services.has(service);
    if (r.rule_type === "hard_exclusion" && isExact) return { eligible: false, boost: 0, reasons: ["Intervention explicitement demandée non acceptée"] };
    if (r.rule_type === "priority" && isRelevant) { boost += condition ? 10 : 15; reasons.push("Intervention compatible avec les préférences déclarées"); }
    if (r.rule_type === "soft_preference" && condition && isRelevant) reasons.push("Conditions à clarifier avec le professionnel");
  }
  return { eligible: true, boost: Math.min(boost, 25), reasons: [...new Set(reasons)] };
}