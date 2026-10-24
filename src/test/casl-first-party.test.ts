// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { observeFirstParty, recheckCasl, publicAddress, safeUrl, POLICY, PINNED_TRANSPORT } from "../../supabase/functions/enrich-official-website/caslFirstParty";
const id = "11111111-1111-4111-8111-111111111111";
const evidence = { id, destination_type: "email", destination_normalized: "info@synthetic-roof.ca", source_type: "company_website", source_url: "https://synthetic-roof.ca/", business_relevance_explanation: "Présence IA UNPRO 350 $ plus taxes, pertinente aux services de toiture de cette entreprise.", contractor_lead_id: id, reviewer_id: "human-signature" };
const company = { business_name: "Synthetic Roof", category_primary: "toiture", website_url: "https://synthetic-roof.ca" };
const html = '<h1>Synthetic Roof</h1><p>Service de toiture info@synthetic-roof.ca</p><a href="/contact">Contact</a><a href="/privacy">Confidentialité</a>';
function io(overrides: Record<string, any> = {}) {
  const o: Record<string, any> = { resolve: vi.fn(async () => ["93.184.216.34"]), fetch: vi.fn(async (url: any) => new Response(String(url).endsWith("robots.txt") ? "User-agent: *\nDisallow:" : html, { headers: { "content-type": String(url).endsWith("robots.txt") ? "text/plain" : "text/html" } })), ...overrides };
  // Synthetic fetches stand in for the pinned transport; the unpinned-transport
  // test below deliberately removes this marker.
  o.fetch[PINNED_TRANSPORT] = true;
  return o;
}
describe("first-party mechanical observations, never consent", () => {
  it("observes exact visible first party email and hashes every page", async () => { const r = await observeFirstParty(evidence, company, io()); expect(r.status).toBe("machine_verified"); expect(r.pages).toHaveLength(3); expect(r.pages[0].page_sha256).toMatch(/^[a-f0-9]{64}$/); expect(r.legal_consent_established).toBe(false); expect(r.policy.auto_eligibility_enabled).toBe(false); });
  it("rejects third-party evidence before any request", async () => { const d = io(); const r = await observeFirstParty({ ...evidence, source_type: "government_registry" }, company, d); expect(r.status).toBe("pending"); expect(d.fetch).not.toHaveBeenCalled(); });
  it("does not accept an address absent from the page", async () => { const r = await observeFirstParty(evidence, company, io({ fetch: async (u: any) => new Response(String(u).endsWith("robots.txt") ? "" : html.replace("info@synthetic-roof.ca", "other@synthetic-roof.ca"), { headers: { "content-type": String(u).endsWith("robots.txt") ? "text/plain" : "text/html" } }) })); expect(r.reason).toBe("exact_email_not_visible"); });
  it("detects refusal on the policy page even away from email", async () => { const d = io(); const original = d.fetch; d.fetch = vi.fn(async (u: any) => String(u).endsWith("/privacy") ? new Response("Aucune sollicitation commerciale", { headers: { "content-type": "text/html" } }) : original(u)); expect((await observeFirstParty(evidence, company, d)).status).toBe("rejected"); });
  it("inaccessible site stays pending", async () => { expect((await observeFirstParty(evidence, company, io({ fetch: async () => { throw new Error("unreachable"); } }))).status).toBe("pending"); });
  it("does not follow SSRF redirects", async () => { const d = io({ fetch: vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1" } })) }); expect((await observeFirstParty(evidence, company, d)).reason).toBe("unreachable_or_redirect"); expect(d.fetch).toHaveBeenCalledTimes(1); });
  it("stale cache stays pending", async () => { expect((await observeFirstParty(evidence, company, io({ fetch: async () => new Response(html, { headers: { "content-type": "text/html", age: "3600" } }) }))).reason).toBe("stale_content"); });
  it("internal DNS never fetched", async () => { const d = io({ resolve: async () => ["10.0.0.1"] }); expect((await observeFirstParty(evidence, company, d)).reason).toBe("unsafe_dns"); expect(d.fetch).not.toHaveBeenCalled(); });
  it.each(["127.0.0.1", "169.254.169.254", "10.0.0.1", "172.16.0.1", "192.168.0.1", "::1", "::ffff:127.0.0.1", "100.64.0.1"])("blocks private IP %s", ip => expect(publicAddress(ip)).toBe(false));
  it.each(["https://google.com/a", "https://facebook.com", "https://127.0.0.1", "https://user:pass@synthetic-roof.ca", "http://synthetic-roof.ca", "https://synthetic-roof.ca:8443"])("blocks unsafe URL %s", u => expect(() => safeUrl(u)).toThrow());
  it("missing policy stays pending", async () => { const d = io({ fetch: async (u: any) => new Response(String(u).endsWith("robots.txt") ? "" : html.replace('<a href="/privacy">Confidentialité</a>', ""), { headers: { "content-type": String(u).endsWith("robots.txt") ? "text/plain" : "text/html" } }) }); expect((await observeFirstParty(evidence, company, d)).reason).toBe("contact_or_policy_missing"); });
  it("professional relevance is mandatory", async () => { expect((await observeFirstParty(evidence, { ...company, category_primary: "" }, io())).reason).toBe("professional_relevance_missing"); });
  it("volume limit stays pending", async () => { expect((await observeFirstParty(evidence, company, io({ fetch: async () => new Response("a".repeat(POLICY.maxBytes + 1), { headers: { "content-type": "text/plain" } }) }))).reason).toBe("volume_limit"); });
  it("refuses an unpinned transport even when DNS looks public (rebinding guard)", async () => {
    const d = io();
    delete d.fetch[PINNED_TRANSPORT];
    const r = await observeFirstParty(evidence, company, d);
    expect(r.reason).toBe("unpinned_transport");
    expect(r.status).toBe("pending");
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it("fails closed when DNS answers change between checks", async () => {
    let call = 0;
    const d = io({ resolve: vi.fn(async () => (++call > 1 ? ["93.184.216.35"] : ["93.184.216.34"])) });
    const r = await observeFirstParty(evidence, company, d);
    expect(r.reason).toBe("dns_changed");
    expect(r.status).toBe("pending");
  });
  it("pinned transport rejects private DNS before opening any socket", async () => {
    const { pinnedPublicFetch } = await import("../../supabase/functions/enrich-official-website/pinnedPublicFetch");
    vi.stubGlobal("Deno", { resolveDns: async () => ["10.0.0.1"] });
    await expect(pinnedPublicFetch("https://synthetic-roof.ca/")).rejects.toThrow("unsafe_dns");
    vi.unstubAllGlobals();
  });
  it("pinned transport carries the fail-closed marker", async () => {
    const { pinnedPublicFetch } = await import("../../supabase/functions/enrich-official-website/pinnedPublicFetch");
    expect((pinnedPublicFetch as any)[PINNED_TRANSPORT]).toBe(true);
  });
});
describe("existing persistence and signed evidence", () => {
  function database() {
    const writes: any[] = []; const tables: string[] = [];
    const sb = { from: (table: string) => { tables.push(table); const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: table === "casl_consent_evidence" ? { ...evidence, reviewer_notes: "immutable human note" } : company, error: null }), insert: async (row: any) => { writes.push({ table, row }); return { error: null }; } }; return q; } };
    return { sb, writes, tables };
  }
  it("append-only observations preserve signed rows and have no provider/claims", async () => { const d = database(); await recheckCasl(d.sb, id, io(), false); expect(d.writes).toHaveLength(1); expect(d.writes[0].table).toBe("official_site_crawl_runs"); expect(d.writes[0].row.summary.casl_machine.status).toBe("machine_verified"); expect(d.tables).toEqual(["casl_consent_evidence", "contractor_leads", "official_site_crawl_runs"]); expect(JSON.stringify(d.writes)).not.toContain("reviewer_id"); });
  it("rechecks a signed contractor_prospect_id without any contractor_lead_id", async () => {
    const written: any[] = [];
    const prospect = { business_name: "Maple Wood Painting & Home Improvement", website_url: "https://www.maplewoodpainting.ca", trade: null, trade_category: null, category_slug: null };
    const ev = { ...evidence, contractor_lead_id: null, contractor_prospect_id: id, destination_normalized: "info@maplewoodpainting.ca", source_url: "https://www.maplewoodpainting.ca/", source_publisher: prospect.business_name, reviewer_id: "human-signature", reviewer_notes: "immutable" };
    const doc = '<h1>Maple Wood Painting & Home Improvement</h1><p>Interior painting services. info@maplewoodpainting.ca</p><a href="/contact">Contact</a><a href="/privacy">Privacy</a>';
    const sb = { from: (table: string) => {
      const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: table === "casl_consent_evidence" ? ev : prospect, error: null }), insert: async (row: any) => { written.push({ table, row }); return { error: null }; } };
      return q;
    } };
    const result = await recheckCasl(sb, id, io({ fetch: async (url: any) => new Response(String(url).endsWith("robots.txt") ? "User-agent: *\nDisallow:" : doc, { headers: { "content-type": String(url).endsWith("robots.txt") ? "text/plain" : "text/html" } }) }), false);
    expect(result.status).toBe("machine_verified");
    expect(result.legal_consent_established).toBe(false);
    expect(written).toHaveLength(1);
    expect(written[0].row.prospect_id).toBe(id);
    expect(written[0].row.contractor_lead_id).toBeNull();
    expect(JSON.stringify(written)).not.toContain("reviewer_id");
  });
  it("dry run never writes", async () => { const d = database(); await recheckCasl(d.sb, id, io(), true); expect(d.writes).toHaveLength(0); });
  it("duplicate links are fetched once", async () => { const d = io({ fetch: vi.fn(async (u: any) => new Response(String(u).endsWith("robots.txt") ? "" : html + '<a href="/contact">Contact</a>', { headers: { "content-type": String(u).endsWith("robots.txt") ? "text/plain" : "text/html" } })) }); const r = await observeFirstParty(evidence, company, d); expect(r.pages).toHaveLength(3); expect(d.fetch).toHaveBeenCalledTimes(4); });
});