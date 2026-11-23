// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { machineCaptureEmail, PINNED_TRANSPORT, BOT_CHALLENGE } from "../../supabase/functions/enrich-official-website/caslFirstParty";

const id = "11111111-1111-4111-8111-111111111111";
const pid = "22222222-2222-4222-8222-222222222222";
const evidence = { id, destination_type: "email", destination_normalized: "info@synthetic-roof.ca", source_type: "first_party_website", source_url: "https://synthetic-roof.ca/", business_relevance_explanation: "Présence IA UNPRO pertinente aux services de toiture de cette entreprise.", contractor_prospect_id: pid, reviewer_id: null, invalidated_at: null, refusal_statement_found: false };
const prospect = { id: pid, business_name: "Synthetic Roof", normalized_domain: "synthetic-roof.ca", trade: "toiture", do_not_contact: false, suppression_reason: null };
const html = '<h1>Synthetic Roof</h1><p>Service de toiture info@synthetic-roof.ca</p><a href="/contact">Contact</a><a href="/privacy">Confidentialité</a>';

function io(page = html) {
  const f: any = vi.fn(async (url: any) => new Response(String(url).endsWith("robots.txt") ? "" : page, { headers: { "content-type": String(url).endsWith("robots.txt") ? "text/plain" : "text/html" } }));
  f[PINNED_TRANSPORT] = true;
  return { fetch: f, resolve: vi.fn(async () => ["93.184.216.34"]) } as any;
}
function db(ev: any = evidence, p: any = prospect) {
  const inserts: any[] = []; const rpcs: any[] = []; const updates: any[] = [];
  const sb: any = {
    from: (table: string) => {
      const q: any = { select: () => q, eq: () => q, is: () => q, gte: () => q, order: () => q,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: table === "casl_consent_evidence" ? ev : p, error: null }),
        update: (row: any) => { updates.push(row); return q; },
        insert: (row: any) => { inserts.push({ table, row }); return { select: () => ({ single: async () => ({ data: { id: "33333333-3333-4333-8333-333333333333" }, error: null }) }) }; } };
      return q;
    },
    rpc: async (name: string, args: any) => { rpcs.push({ name, args }); return { data: { decision: "auto_validated", recorded: true }, error: null }; },
  };
  return { sb, inserts, rpcs, updates };
}

describe("casl-machine-v1 email capture", () => {
  it("appends a new company_website evidence row and submits the real capture", async () => {
    const d = db();
    const r = await machineCaptureEmail(d.sb, id, "entry350-hiver-2026", io(), false);
    expect(r.decision).toBe("auto_validated");
    expect(d.updates).toHaveLength(0);
    const row = d.inserts[0].row;
    expect(row.source_type).toBe("company_website");
    expect(row.reviewer_id).toBeUndefined();
    expect(row.capture_agent).toBe("enrich-official-website");
    const cap = d.rpcs[0].args.p_capture;
    expect(cap.http_status).toBe("200");
    expect(cap.page_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(cap.extract).toContain("info@synthetic-roof.ca");
    expect(cap.refusal_pages_checked.length).toBeGreaterThan(0);
    expect(d.rpcs[0].args.p_dry_run).toBe(false);
  });
  it("writes nothing when a refusal is published", async () => {
    const d = db();
    const r = await machineCaptureEmail(d.sb, id, "c", io(html + "<p>Aucune sollicitation commerciale</p>"), false);
    expect(r.decision).toBe("not_captured");
    expect(d.inserts).toHaveLength(0); expect(d.rpcs).toHaveLength(0);
  });
  it("writes nothing on a bot challenge page", async () => {
    const d = db();
    const r = await machineCaptureEmail(d.sb, id, "c", io(html + '<div id="cf-challenge"></div>'), false);
    expect(r.reason).toBe("bot_challenge"); expect(d.inserts).toHaveLength(0);
    expect(BOT_CHALLENGE.test('<form><div class="g-recaptcha"></div></form>')).toBe(false);
  });
  it("refuses human-signed, unanchored or do-not-contact evidence", async () => {
    await expect(machineCaptureEmail(db({ ...evidence, reviewer_id: "x" }).sb, id, "c", io(), false)).rejects.toThrow("evidence_not_machine_eligible");
    await expect(machineCaptureEmail(db({ ...evidence, contractor_prospect_id: null }).sb, id, "c", io(), false)).rejects.toThrow("prospect_anchor_missing");
    await expect(machineCaptureEmail(db(evidence, { ...prospect, do_not_contact: true }).sb, id, "c", io(), false)).rejects.toThrow("opted_out_or_suppressed");
  });
  it("dry run never inserts", async () => {
    const d = db();
    const r = await machineCaptureEmail(d.sb, id, "c", io(), true);
    expect(r.dry_run).toBe(true); expect(d.inserts).toHaveLength(0); expect(d.rpcs[0].args.p_dry_run).toBe(true);
  });
});
