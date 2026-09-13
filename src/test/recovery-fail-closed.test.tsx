/**
 * Correctifs « échec fermé » — politique de contact, propriété stricte des
 * dossiers, et sélection déterministe des reprises. Aucun réseau, aucun envoi.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ManualContactPanel from "@/components/crm/ManualContactPanel";
import {
  mergeConfig,
  evaluateCandidate,
  type LeadRow,
} from "../../supabase/functions/affiliate-onboarding-recovery/logic";

const cfg = mergeConfig({});

const target = {
  prospect_id: "p1",
  business_name: "Toiture Test",
  phone_e164: "+15145550000",
  email: "contact@example.com",
  contact_locked: false,
  opted_out: false,
  blocked_reason: null,
} as never;

describe("ManualContactPanel — drapeau de canal manquant", () => {
  it("refuse un canal dont le drapeau est absent (undefined)", () => {
    render(
      <ManualContactPanel target={target} policy={{ contact_locked: false }} />,
    );
    for (const label of ["Appeler", "SMS", "Courriel"]) {
      const btn = screen.queryByRole("button", { name: new RegExp(label, "i") });
      if (btn) expect(btn).toBeDisabled();
    }
  });
});

// --- Propriété stricte : fusion de deux requêtes déterministes -------------
type Lead = { id: string; assigned_affiliate_id: string | null; created_by_affiliate_id: string | null };
const ME = "aff-1";
const ownsLead = (l: Lead) =>
  l.assigned_affiliate_id ? l.assigned_affiliate_id === ME : l.created_by_affiliate_id === ME;

/** Reproduit la fusion serveur : requête « assignés » + requête « créés non assignés ». */
function selectOwned(all: Lead[], limit = 400): Lead[] {
  const assigned = all.filter((l) => l.assigned_affiliate_id === ME).slice(0, limit);
  const created = all
    .filter((l) => l.assigned_affiliate_id === null && l.created_by_affiliate_id === ME)
    .slice(0, limit);
  const map = new Map<string, Lead>();
  for (const l of [...assigned, ...created]) map.set(l.id, l);
  return Array.from(map.values()).filter(ownsLead);
}

describe("propriété stricte des dossiers affiliés", () => {
  it("500 dossiers créés ne peuvent pas masquer un dossier explicitement assigné", () => {
    const noise: Lead[] = Array.from({ length: 500 }, (_, i) => ({
      id: `c${i}`,
      assigned_affiliate_id: null,
      created_by_affiliate_id: ME,
    }));
    const all = [...noise, { id: "assigned-1", assigned_affiliate_id: ME, created_by_affiliate_id: "other" }];
    const owned = selectOwned(all);
    expect(owned.some((l) => l.id === "assigned-1")).toBe(true);
  });

  it("un dossier créé par moi mais assigné à un autre n'est jamais visible", () => {
    const owned = selectOwned([{ id: "x", assigned_affiliate_id: "other", created_by_affiliate_id: ME }]);
    expect(owned).toHaveLength(0);
  });
});

// --- Sélection cohorte A : ordre déterministe avant toute limite -----------
const now = Date.UTC(2026, 8, 13, 0, 0, 0);
const old = new Date(now - 200 * 3600 * 1000).toISOString();
const recent = new Date(now - 1 * 3600 * 1000).toISOString();

const lead = (o: Partial<LeadRow>): LeadRow => ({
  id: "l1",
  business_name: "Test",
  city: "Montréal",
  category_primary: "Toiture",
  fit_score: 50,
  priority_score: 50,
  profile_status: "incomplete",
  onboarding_started_at: old,
  payment_started_at: null,
  paid_at: null,
  profile_active_at: null,
  updated_at: old,
  archived_at: null,
  do_not_contact: false,
  unsubscribed_at: null,
  compliance_review_required: false,
  assigned_affiliate_id: null,
  created_by_affiliate_id: null,
  phone_e164: "+15145550000",
  email: null,
  ...(o as object),
} as LeadRow);

/** Ordre appliqué en base : priorité desc, fit desc, ancienneté asc, id asc. */
function orderRows(rows: LeadRow[]): LeadRow[] {
  return [...rows].sort(
    (a, b) =>
      (b.priority_score ?? -1) - (a.priority_score ?? -1) ||
      (b.fit_score ?? -1) - (a.fit_score ?? -1) ||
      String(a.updated_at ?? "").localeCompare(String(b.updated_at ?? "")) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

describe("cohorte A — sélection déterministe", () => {
  it("des lignes récentes en surnombre ne masquent pas un dossier ancien à fort potentiel", () => {
    const maxCandidates = 20;
    const noise = Array.from({ length: 200 }, (_, i) =>
      lead({ id: `n${i}`, updated_at: recent, priority_score: 10, fit_score: 10 }),
    );
    const gem = lead({ id: "gem", updated_at: old, priority_score: 95, fit_score: 94 });
    // Filtre d'inactivité poussé en base, puis ordre, puis limite.
    const cutoff = new Date(now - cfg.inactivity_hours * 3600 * 1000).toISOString();
    const eligible = orderRows([...noise, gem].filter((l) => String(l.updated_at) <= cutoff));
    const page = eligible.slice(0, maxCandidates);
    expect(page[0].id).toBe("gem");
    expect(evaluateCandidate(gem, cfg, now, { alreadyRoutedLeadIds: new Set() }).eligible).toBe(true);
  });

  it("deux simulations identiques produisent exactement les mêmes identités ordonnées", () => {
    const rows = [
      lead({ id: "b", priority_score: 80, fit_score: 80 }),
      lead({ id: "a", priority_score: 80, fit_score: 80 }),
      lead({ id: "c", priority_score: 90, fit_score: 70 }),
    ];
    const run1 = orderRows(rows).map((r) => r.id);
    const run2 = orderRows([...rows].reverse()).map((r) => r.id);
    expect(run1).toEqual(["c", "a", "b"]);
    expect(run2).toEqual(run1);
  });
});
