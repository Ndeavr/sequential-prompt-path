/**
 * « Qu'est-ce qui vous allume? » — seasonal service businesses campaign (FR).
 * The destination is the canonical website-first contractor entry
 * (matching-profile wizard with Clara); only marketing attribution, a
 * whitelisted city and a whitelisted service leave this page.
 *
 * Offer shown: « 350 $ : 10 contrats garantis » (immutable server version
 * allume_350_10_contrats_v1). The 1 $ special and the « 5 par ville » quota
 * are NOT shown: their duration/inclusions are undefined and no server quota
 * exists (see docs/campaigns/allume-2026-11-09.md).
 */
import { CONTRACTOR_MARKETING_FIELDS } from "@/lib/analytics/contractorAdTracking";
import { contractorProfileEntryPath } from "@/lib/contractorProfileEntry";
import { GUARANTEE_OFFER_PARAM } from "../../supabase/functions/_shared/contractGuarantee";

export { GUARANTEE_COPY as ALLUME_OFFER } from "../../supabase/functions/_shared/contractGuarantee";

export const ALLUME_PATH = "/allume";
export const ALLUME_CAMPAIGN = "allume_saisonnier_2026";

export const ALLUME_CITIES = [
  "Laval", "Montréal", "Longueuil", "Brossard", "Terrebonne", "Repentigny",
  "Blainville", "Sainte-Thérèse", "Boisbriand", "Mirabel", "Saint-Jérôme", "Mascouche",
] as const;

export type AllumeServiceKey = string;

export const ALLUME_UNIVERSES = [
  {
    key: "entretien",
    label: "Entretien et services",
    services: [
      { key: "lumieres-de-noel", label: "Installation de lumières et décorations de Noël" },
      { key: "illumination-arbres", label: "Illumination d'arbres" },
      { key: "protection-hivernale-arbustes", label: "Protection hivernale des arbustes" },
      { key: "nettoyage-gouttieres", label: "Gouttières" },
      { key: "ramonage-cheminee", label: "Ramonage" },
      { key: "abris-temporaires", label: "Abris Tempo" },
    ],
  },
  {
    key: "renovation",
    label: "Rénovation et réparations",
    services: [
      { key: "amenagement-cour", label: "Transformer une cour" },
      { key: "renovation-cuisine", label: "Refaire une cuisine" },
    ],
  },
  {
    key: "immobilier",
    label: "Immobilier et services professionnels",
    services: [
      { key: "services-professionnels", label: "Services professionnels pour propriétaires" },
    ],
  },
] as const;

const SERVICE_KEYS = new Set<string>(ALLUME_UNIVERSES.flatMap((u) => u.services.map((s) => s.key)));

export const ALLUME_COPY = {
  title: "Qu'est-ce qui vous allume? | UNPRO",
  description: "Présentez à Clara les travaux que vous aimez faire : vos services, votre territoire et ce que vous aimeriez faire plus souvent.",
  headline: "Qu'est-ce qui vous allume?",
  intro: [
    "Installer des lumières de Noël dans un sapin immense? Transformer une cour? Refaire une cuisine? Vous avez des travaux que vous aimez faire. C'est ceux-là qu'on veut connaître.",
    "Parlez-en à Clara sur UNPRO : vos services, votre territoire, ce que vous aimeriez faire plus souvent. Elle pourra vous recommander aux propriétaires dont les projets vous correspondent.",
  ],
  pickLabel: "Choisissez un service (facultatif)",
  cta: "Dites à Clara ce qui vous allume.",
  signature: "UNPRO — Rénovation · Construction",
} as const;

export function parseAllumeCity(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return ALLUME_CITIES.find((c) => c.toLowerCase() === v) ?? null;
}

export function parseAllumeService(value: string | null): AllumeServiceKey | null {
  return value && SERVICE_KEYS.has(value) ? value : null;
}

/** Canonical contractor Clara entry; never forwards anything but attribution, city and service. */
export function allumeContractorPath(search: string, service: AllumeServiceKey | null): string {
  const source = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const key of CONTRACTOR_MARKETING_FIELDS) {
    const value = source.get(key)?.trim();
    if (value) out.set(key, value);
  }
  if (!out.has("utm_campaign")) out.set("utm_campaign", ALLUME_CAMPAIGN);
  const city = parseAllumeCity(source.get("ville"));
  if (city) out.set("ville", city);
  const svc = parseAllumeService(service);
  if (svc) out.set("metier", svc);
  out.set("offre", GUARANTEE_OFFER_PARAM);
  return contractorProfileEntryPath(`?${out.toString()}`, "fr");
}
