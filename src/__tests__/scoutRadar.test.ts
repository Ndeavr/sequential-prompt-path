import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  classifySignal, extractAffiliations, captureFingerprint, decideCaptureRoute,
  validateLinkReview, authorizeScoutAdmin, buildSearchLinks,
} from "../../supabase/functions/_shared/scoutRadar";
import { parseScoutText, hasContactPoint } from "../../supabase/functions/_shared/scoutParser";

describe("Radar — classification", () => {
  it("captures a bare 'Disponible' comment as a contractor offer", () => {
    const c = classifySignal("Yannick Levert : Disponible");
    expect(c.signal_type).toBe("contractor_offer");
  });

  it.each(["PV moi", "Écris-moi pour les détails", "Nous sommes spécialisés en toiture", "Je cherche des contrats sur la Rive-Nord"])(
    "recognises contractor phrase: %s",
    (t) => expect(classifySignal(t).signal_type).toBe("contractor_offer"),
  );

  it("does not treat a homeowner question with 'disponible' as a contractor", () => {
    expect(classifySignal("Qui est disponible pour refaire ma toiture à Laval ?").signal_type).toBe("homeowner_request");
    expect(classifySignal("Je cherche un couvreur, besoin d'un devis").signal_type).toBe("homeowner_request");
  });

  it("uses thread context to reinforce a short reply", () => {
    const c = classifySignal("Dispo", "Je cherche un couvreur à Laval?");
    expect(c.signal_type).toBe("contractor_offer");
    expect(c.evidence).toContain("réponse à une demande");
  });

  it("routes: homeowner → homeowner_review, no-contact offer → review, offer+contact → prospect", () => {
    const off = classifySignal("Disponible");
    expect(decideCaptureRoute(classifySignal("Je cherche un plombier"), true)).toBe("homeowner_review");
    expect(decideCaptureRoute(off, false)).toBe("review");
    expect(decideCaptureRoute(off, true)).toBe("prospect");
    expect(decideCaptureRoute(classifySignal("Belle journée"), true)).toBe("review");
  });

  it("keeps a 'Disponible' capture without contact point (no longer skipped)", () => {
    const s = parseScoutText("Disponible", "Yannick Levert");
    expect(hasContactPoint(s)).toBe(false);
    expect(decideCaptureRoute(classifySignal("Disponible"), hasContactPoint(s))).toBe("review");
  });
});

describe("Radar — person ↔ company links", () => {
  it("one author declaring two employers yields two employee links, never owner", () => {
    const a = extractAffiliations("Disponible. Je travaille chez Les Couvreurs Synth-Toit et Toitures Fictives Lab.");
    expect(a.map((x) => x.company_name)).toEqual(["Les Couvreurs Synth-Toit", "Toitures Fictives Lab"]);
    expect(a.every((x) => x.relation === "employee_declared")).toBe(true);
  });

  it("only explicit ownership statements become owner_declared", () => {
    expect(extractAffiliations("Propriétaire de Toitures Fictives Lab")[0].relation).toBe("owner_declared");
  });

  it("links never carry a licence field (employer RBQ not attributable)", () => {
    const [l] = extractAffiliations("Employé chez Toitures Fictives Lab, RBQ 5678-1234-01");
    expect(Object.keys(l)).toEqual(["company_name", "relation", "evidence"]);
  });

  it("verifying a link requires an https source", () => {
    expect(validateLinkReview({ decision: "verified" })).toEqual({ ok: false, error: "evidence_url_required" });
    expect(validateLinkReview({ decision: "verified", evidence_url: "http://x.ca" }).ok).toBe(false);
    expect(validateLinkReview({ decision: "verified", evidence_url: "https://exemple-synth.ca/equipe" }).ok).toBe(true);
    expect(validateLinkReview({ decision: "owner" }).ok).toBe(false);
  });

  it("search links are manual links only", () => {
    const l = buildSearchLinks({ company_name: "Toitures Fictives Lab", city: "Laval" });
    expect(l.length).toBeGreaterThan(0);
    expect(l.every((x) => x.url.startsWith("https://"))).toBe(true);
    expect(buildSearchLinks({})).toEqual([]);
  });
});

describe("Radar — dedupe fingerprint", () => {
  const base = { post_url: "https://www.facebook.com/groups/x/posts/1?ref=a", author_name: "Marc Synth", raw_text: "Disponible" };
  it("is stable across url noise and case/accents", () => {
    expect(captureFingerprint(base)).toBe(
      captureFingerprint({ ...base, post_url: "https://m.facebook.com/groups/x/posts/1", author_name: "marc synth", raw_text: " disponible " }),
    );
  });
  it("differs per author and per comment", () => {
    expect(captureFingerprint(base)).not.toBe(captureFingerprint({ ...base, author_name: "Autre" }));
    expect(captureFingerprint(base)).not.toBe(captureFingerprint({ ...base, raw_text: "PV moi" }));
  });
});

describe("Radar — admin gate", () => {
  it("401 without bearer or user, 403 for non-admin, ok for admin", async () => {
    expect(await authorizeScoutAdmin({ bearer: null, getUser: async () => ({ id: "u" }), isAdmin: async () => true }))
      .toEqual({ ok: false, status: 401, error: "unauthorized" });
    expect(await authorizeScoutAdmin({ bearer: "Bearer t", getUser: async () => null, isAdmin: async () => true }))
      .toMatchObject({ status: 401 });
    expect(await authorizeScoutAdmin({ bearer: "Bearer t", getUser: async () => ({ id: "u" }), isAdmin: async () => false }))
      .toEqual({ ok: false, status: 403, error: "forbidden" });
    expect(await authorizeScoutAdmin({ bearer: "Bearer t", getUser: async () => ({ id: "u" }), isAdmin: async () => { throw new Error("x"); } }))
      .toMatchObject({ status: 403 });
    expect(await authorizeScoutAdmin({ bearer: "Bearer t", getUser: async () => ({ id: "u" }), isAdmin: async () => true }))
      .toEqual({ ok: true, userId: "u" });
  });
});

describe("Radar — zero outbound", () => {
  const src = readFileSync("supabase/functions/scout-ingest/index.ts", "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  it("scout-ingest never invokes a send / messaging function or provider", () => {
    expect(src).not.toMatch(/twilio|resend|sendSms|send-sms|send-email|messenger|graph\.facebook/i);
    const invoked = [...src.matchAll(/functions\.invoke\("([^"]+)"/g)].map((m) => m[1]);
    expect(invoked).toEqual(["extract-business-card"]);
  });
  it("new prospects stay unverified and non-SMS-eligible", () => {
    expect(src).not.toMatch(/sms_eligible:\s*true/);
    expect(src).not.toMatch(/verification_status:\s*"verified"/);
    expect(src).toMatch(/rbq_number: null/);
  });
});

describe("Radar — extension parity", () => {
  const ctx: { window: Record<string, any> } = { window: {} };
  runInNewContext(readFileSync("packages/unpro-scout-extension/scoutParser.js", "utf8"), ctx);
  const ext = ctx.window.UnproScoutParser;
  it.each([
    "Yannick Levert : Disponible", "PV moi", "Je cherche des contrats", "Qui est disponible pour ma toiture ?",
    "Je cherche un plombier à Laval", "Bonne journée", "Nous sommes spécialisés en isolation",
  ])("same type for: %s", (t) => {
    expect(ext.classifySignal(t).signal_type).toBe(classifySignal(t).signal_type);
  });
});
