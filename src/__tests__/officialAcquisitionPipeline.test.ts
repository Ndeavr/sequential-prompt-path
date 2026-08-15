import { describe, it, expect } from "vitest";
import {
  specialtyBonus,
  buildSourceRecordKey,
  dedupeKeys,
  normalizeOfficialRecord,
  type NormalizedOfficialRecord,
} from "../../supabase/functions/_shared/officialSources";
import {
  pickResource,
  parseDelimited,
  mapColumns,
  regionKeyFor,
  tradeKeysFor,
} from "../../supabase/functions/_shared/ckanSource";
import {
  buildAuthHeader,
  buildRequestBody,
  parseResponse,
  selectMatch,
  nextEligibleAt,
  redactError,
  type ListingItem,
} from "../../supabase/functions/_shared/dataForSeo";
import {
  parseRobots,
  isAllowedByRobots,
  verifyIdentity,
} from "../../supabase/functions/_shared/officialSiteCrawler";

const doc = (kind: "rbq" | "req" | "novoclimat") => ({
  source_key: `${kind}_test`,
  source_kind: kind,
  source_name: `${kind} source`,
  source_url: "https://www.donneesquebec.ca/recherche/dataset/licencesactives",
  publisher: "Données Québec",
  source_updated_at: null,
  records: [],
});

describe("source-aware scoring", () => {
  it("never labels RBQ or REQ records as certified ventilation", () => {
    for (const kind of ["rbq", "req"] as const) {
      const { signals } = specialtyBonus(
        { business_name: "Toitures Boisvert inc.", categories: ["Couvreur"] },
        { source_kind: kind },
      );
      expect(signals).not.toContain("certified_ventilation");
    }
  });

  it("only Novoclimat proves certified ventilation", () => {
    const { signals } = specialtyBonus(
      { business_name: "Ventilation Nord" },
      { source_kind: "novoclimat" },
    );
    expect(signals).toContain("certified_ventilation");
  });
});

describe("no-contact retention", () => {
  it("retains RBQ rows without contact as needs_enrichment (never rejected)", () => {
    const n = normalizeOfficialRecord(
      doc("rbq"),
      { business_name: "Fondations Laval inc.", rbq_license: "5612-3456-01", municipality: "Laval", region: "Laval" },
      new Date().toISOString(),
    );
    expect(n.parse_error).toBeUndefined();
    expect(n.contact_status).toBe("needs_enrichment");
  });
});

describe("stable keys and dedupe precedence", () => {
  it("source_record_key is stable and prefers RBQ then NEQ", () => {
    const a = buildSourceRecordKey({ business_name: "A", rbq_license: "5612-3456-01", neq: "1160000000" });
    const b = buildSourceRecordKey({ business_name: "A", rbq_license: "5612 3456 01", neq: "1160000000" });
    expect(a).toBe(b);
    expect(a.startsWith("rbq:")).toBe(true);
    expect(buildSourceRecordKey({ business_name: "A", neq: "1160000000" }).startsWith("neq:")).toBe(true);
    const h1 = buildSourceRecordKey({ business_name: "Toiture X", municipality: "Laval" });
    const h2 = buildSourceRecordKey({ business_name: "Toiture X", municipality: "Laval" });
    expect(h1).toBe(h2);
  });

  it("dedupe key order is NEQ > RBQ > phone/domain > name+postal", () => {
    const n = {
      neq: "1160000000",
      rbq_license: "5612345601",
      phone_e164: "+15145551234",
      official_domain: "toiturex.ca",
      business_name_norm: "toiture x",
      postal_code: "H7N1A1",
    } as unknown as NormalizedOfficialRecord;
    const keys = dedupeKeys(n);
    expect(keys[0]).toContain("1160000000");
    expect(keys.join("|")).toContain("5612345601");
  });
});

describe("CKAN adapter", () => {
  it("picks the freshest active CSV resource, not a hardcoded URL", () => {
    const r = pickResource([
      { id: "1", format: "PDF", url: "https://x/a.pdf" },
      { id: "2", format: "CSV", url: "https://x/old.csv", last_modified: "2023-01-01" },
      { id: "3", format: "CSV", url: "https://x/new.csv", last_modified: "2025-06-01" },
      { id: "4", format: "CSV", url: "https://x/dead.csv", last_modified: "2026-01-01", state: "deleted" },
    ]);
    expect(r?.id).toBe("3");
  });

  it("returns null when no tabular resource is active", () => {
    expect(pickResource([{ id: "1", format: "PDF", url: "https://x/a.pdf" }])).toBeNull();
  });

  it("parses semicolon CSV with quotes and maps French aliases defensively", () => {
    const csv = `Nom de l'entreprise;NEQ;Numéro de licence;Ville;Code postal;Adresse électronique;Catégorie
"Toitures Bel-Air, inc.";1160000000;5612-3456-01;Laval;H7N 1A1;info@belair.ca;Couvreur`;
    const rows = parseDelimited(csv);
    expect(rows).toHaveLength(1);
    const map = mapColumns(Object.keys(rows[0]));
    expect(map.business_name).toBe("Nom de l'entreprise");
    expect(map.neq).toBe("NEQ");
    expect(map.email).toBe("Adresse électronique");
    expect(rows[0][map.business_name!]).toBe("Toitures Bel-Air, inc.");
  });

  it("scopes to pilot regions and trades", () => {
    expect(regionKeyFor("Terrebonne", null)).toBe("lanaudière");
    expect(regionKeyFor("Québec", "Capitale-Nationale")).toBeNull();
    expect(tradeKeysFor("Couvreur - toiture")).toContain("toiture");
    expect(tradeKeysFor("Restaurant")).toHaveLength(0);
  });
});

describe("DataForSEO adapter", () => {
  it("builds auth server-side only and never leaks it", () => {
    expect(buildAuthHeader(null, null)).toBeNull();
    expect(buildAuthHeader("user", undefined)).toBeNull();
    const h = buildAuthHeader("user@x.ca", "secret")!;
    expect(h.startsWith("Basic ")).toBe(true);
    expect(redactError(`request failed with ${h}`)).not.toContain("secret");
    expect(redactError(`request failed with ${h}`)).toContain("[redacted]");
  });

  it("caps limit at 10 and always scopes to Quebec locality", () => {
    const body = buildRequestBody({ title: "Toitures Bel-Air", locality: "Laval", limit: 500 }) as Array<Record<string, unknown>>;
    expect(body[0].limit).toBe(10);
    expect(String(body[0].location_name)).toContain("Quebec, Canada");
  });

  it("parses success, empty, task error and malformed responses", () => {
    const ok = parseResponse({
      status_code: 20000, cost: 0.02,
      tasks: [{ status_code: 20000, result: [{ items: [{ title: "X", phone: "+1 514 555 1234", domain: "x.ca", address_info: { city: "Laval", zip: "H7N 1A1" } }] }] }],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.items[0].city).toBe("Laval");

    const empty = parseResponse({ status_code: 20000, cost: 0, tasks: [{ status_code: 20000, result: [{ items: [] }] }] });
    expect(empty.ok && empty.items).toHaveLength(0);

    const taskErr = parseResponse({ status_code: 20000, cost: 0, tasks: [{ status_code: 40501 }] }) as { ok: boolean; retryable: boolean };
    expect(taskErr.ok).toBe(false);
    expect(taskErr.retryable).toBe(false);

    const transient = parseResponse({ status_code: 50000, cost: 0, tasks: [] }) as { ok: boolean; retryable: boolean };
    expect(transient.ok).toBe(false);
    expect(transient.retryable).toBe(true);

    expect(parseResponse(null).ok).toBe(false);
    expect(parseResponse("nope").ok).toBe(false);
  });

  it("rejects similar names in conflicting cities", () => {
    const items: ListingItem[] = [
      { title: "Toitures Bel-Air inc", phone: "+15819990000", url: null, domain: null, address: "Québec", city: "Québec", zip: "G1A1A1" },
    ];
    const out = selectMatch({ business_name_norm: "toitures bel air", city: "Laval", postal_code: "H7N1A1", official_domain: null }, items);
    expect(out.status).toBe("ambiguous");
    expect(out.conflict_reason).toBe("city_conflict");
    expect(out.item).toBeNull();
  });

  it("accepts a confident same-city match and refuses ties", () => {
    const good: ListingItem[] = [
      { title: "Toitures Bel-Air inc.", phone: "+15145551234", url: "https://belair.ca", domain: "belair.ca", address: "Laval", city: "Laval", zip: "H7N 1A1" },
    ];
    const target = { business_name_norm: "toitures bel air", city: "Laval", postal_code: "H7N1A1", official_domain: "belair.ca" };
    expect(selectMatch(target, good).status).toBe("matched");
    expect(selectMatch(target, []).status).toBe("no_match");

    const tie: ListingItem[] = [
      { ...good[0], domain: null, url: null },
      { ...good[0], domain: null, url: null, title: "Toitures Bel Air" },
    ];
    expect(selectMatch({ ...target, official_domain: null }, tie).status).toBe("ambiguous");
  });

  it("caches matched 30 days and dead-ends no_match for 90 days (no loops)", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(nextEligibleAt("matched", from)).toBe("2026-01-31T00:00:00.000Z");
    expect(nextEligibleAt("no_match", from)).toBe("2026-04-01T00:00:00.000Z");
    expect(nextEligibleAt("ambiguous", from)).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("official website validation", () => {
  it("honours robots.txt for the UNPRO agent over the wildcard group", () => {
    const rules = parseRobots(`User-agent: *\nDisallow: /\n\nUser-agent: UNPRO-Enrichment\nDisallow: /private\nAllow: /contact`);
    expect(isAllowedByRobots(rules, "/contact")).toBe(true);
    expect(isAllowedByRobots(rules, "/private/x")).toBe(false);
  });

  it("blocks everything under a wildcard full disallow", () => {
    const rules = parseRobots(`User-agent: *\nDisallow: /`);
    expect(isAllowedByRobots(rules, "/contact")).toBe(false);
  });

  it("treats an empty Disallow as allow-all", () => {
    const rules = parseRobots(`User-agent: *\nDisallow:`);
    expect(isAllowedByRobots(rules, "/nous-joindre")).toBe(true);
  });

  it("verifies identity before accepting contact and flags RBQ conflicts", () => {
    const fields = [
      { kind: "org_name", raw: "Toitures Bel-Air inc.", normalized: "Toitures Bel-Air inc.", confidence: 1 },
      { kind: "rbq", raw: "5612-3456-01", normalized: "5612345601", confidence: 1 },
    ] as never[];
    const ok = verifyIdentity(fields, { business_name_norm: "toitures bel air", rbq_license: "5612345601", city: "Laval" });
    expect(ok.verified).toBe(true);

    const conflict = verifyIdentity(fields, { business_name_norm: "toitures bel air", rbq_license: "9999999999" });
    expect(conflict.verified).toBe(false);
    expect(conflict.conflict).toBe("rbq_conflict");
  });
});
