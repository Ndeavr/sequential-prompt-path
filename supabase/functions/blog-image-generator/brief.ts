// Semantic visual brief derived from the article topic — never the title text.
export type BriefInput = { category?: string | null; city?: string | null; slug?: string | null };

const RULES =
  "Realistic editorial photograph, 16:9 landscape, natural light. Absolutely no text, letters, words, signs, cardboard notes, banners, logos, badges or certificates anywhere in the image.";

export function scene(input: BriefInput): string {
  const s = `${input.slug ?? ""} ${input.category ?? ""}`.toLowerCase();
  if (/ia-|chatgpt|soumission|lead|client|recommand|choisir|entrepreneur/.test(s))
    return "a Quebec contractor or homeowner using a tablet showing an abstract map with connection lines, digital matching concept, clean finished setting, no construction site";
  if (/score|confiance|verifier|preuve|inspection|prevoir/.test(s))
    return "a professional documenting a home detail with a phone, clipboard and moisture meter nearby, evidence and inspection concept, finished home";
  if (/passeport|historique|valeur|revente|subvention/.test(s))
    return "an open binder with renovation photos and blurred invoices on a dining table in a finished modern home";
  if (/r-?60|r-?51|entretoit|grenier|attic|isolation/.test(s))
    return "a real residential attic with an even layer of blown-in loose-fill insulation between wood trusses";
  if (/toit|roof/.test(s)) return "a residential roof in Quebec with visible roofing material, daylight";
  if (/fondation|drain|beton|sous-sol/.test(s)) return "a residential foundation wall or basement detail, realistic";
  if (/plomb|egout/.test(s)) return "residential plumbing in a clean utility room";
  if (/electri/.test(s)) return "a residential electrical panel in a clean home";
  return `a finished residential home in Quebec related to ${input.category || "home maintenance"}`;
}

export function buildImageBrief(input: BriefInput): string {
  return `Scene: ${scene(input)}. Location context: ${input.city || "Quebec"}, Canada. ${RULES}`;
}
