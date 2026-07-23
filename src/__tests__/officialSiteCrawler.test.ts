/**
 * Unit tests for officialSiteCrawler pure functions.
 * Run via `bunx vitest run src/__tests__/officialSiteCrawler.test.ts`.
 */
import { describe, it, expect } from "vitest";
import {
  resolveOfficialDomain,
  decodeCfEmail,
  extractFieldsFromHtml,
  shouldOverride,
} from "../../supabase/functions/_shared/officialSiteCrawler";

describe("resolveOfficialDomain", () => {
  it("canonicalizes bare host", () => {
    const r = resolveOfficialDomain("atriumcourtay.com");
    expect(r.canonical).toBe("https://atriumcourtay.com");
    expect(r.is_blocked).toBe(false);
    expect(r.host).toBe("atriumcourtay.com");
  });
  it("strips www + upgrades http", () => {
    const r = resolveOfficialDomain("http://WWW.Atriumcourtay.COM/contact");
    expect(r.canonical).toBe("https://atriumcourtay.com");
  });
  it("blocks social/directory hosts", () => {
    for (const bad of [
      "https://facebook.com/foo",
      "https://www.linkedin.com/in/x",
      "https://soumissionrenovation.ca/fr/x",
      "https://houzz.com/pro/x",
    ]) {
      const r = resolveOfficialDomain(bad);
      expect(r.is_blocked).toBe(true);
      expect(r.canonical).toBeNull();
    }
  });
  it("returns invalid_url on garbage", () => {
    expect(resolveOfficialDomain("not a url ///").canonical).toBeNull();
  });
});

describe("decodeCfEmail", () => {
  it("decodes known Cloudflare hex", () => {
    // Encode "hi@a.com" with key 0x2a: XOR each char code with 0x2a.
    const key = 0x2a;
    const s = "hi@a.com";
    let hex = key.toString(16).padStart(2, "0");
    for (const ch of s) hex += (ch.charCodeAt(0) ^ key).toString(16).padStart(2, "0");
    expect(decodeCfEmail(hex)).toBe("hi@a.com");
  });
  it("rejects garbage", () => {
    expect(decodeCfEmail("zz")).toBeNull();
    expect(decodeCfEmail("")).toBeNull();
  });
});

describe("extractFieldsFromHtml", () => {
  it("finds tel: and mailto:", () => {
    const html = `<a href="tel:+1 438-926-1587">appelez</a> <a href="mailto:estimation@atriumcourtay.com">écrire</a>`;
    const f = extractFieldsFromHtml(html);
    const phones = f.filter(x => x.kind === "phone").map(x => x.normalized);
    const emails = f.filter(x => x.kind === "email").map(x => x.normalized);
    expect(phones).toContain("+14389261587");
    expect(emails).toContain("estimation@atriumcourtay.com");
  });
  it("decodes Cloudflare cfemail", () => {
    const key = 0x1b;
    const email = "info@atriumcourtay.com";
    let hex = key.toString(16).padStart(2, "0");
    for (const ch of email) hex += (ch.charCodeAt(0) ^ key).toString(16).padStart(2, "0");
    const html = `<a href="/cdn-cgi/l/email-protection" data-cfemail="${hex}">[email&#160;protected]</a>`;
    const f = extractFieldsFromHtml(html);
    expect(f.some(x => x.kind === "email" && x.normalized === email && x.method === "data_cfemail")).toBe(true);
  });
  it("extracts obfuscated 'name at domain dot com'", () => {
    const html = "<p>Contact: hello (at) example (dot) com</p>";
    const f = extractFieldsFromHtml(html);
    expect(f.some(x => x.kind === "email" && x.normalized === "hello@example.com")).toBe(true);
  });
  it("parses JSON-LD Organization", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "LocalBusiness",
      name: "Atrium Courtay Inc.",
      telephone: "438-926-1587",
      email: "estimation@atriumcourtay.com",
      address: { streetAddress: "8215 rue Saint-Hubert", addressLocality: "Montréal", addressRegion: "QC", postalCode: "H2P 1Z1" },
    })}</script>`;
    const f = extractFieldsFromHtml(html);
    expect(f.some(x => x.kind === "org_name" && x.normalized === "Atrium Courtay Inc.")).toBe(true);
    expect(f.some(x => x.kind === "phone" && x.normalized === "+14389261587" && x.method === "json_ld")).toBe(true);
    expect(f.some(x => x.kind === "postal_code" && x.normalized === "H2P 1Z1")).toBe(true);
  });
  it("extracts RBQ format", () => {
    const html = "<p>RBQ: 5797-6573-01</p>";
    const f = extractFieldsFromHtml(html);
    expect(f.find(x => x.kind === "rbq")?.normalized).toBe("5797-6573-01");
  });
});

describe("shouldOverride (trust precedence)", () => {
  it("higher trust overrides lower", () => {
    expect(shouldOverride("inferred", "source_confirmed")).toBe(true);
    expect(shouldOverride("source_confirmed", "externally_verified")).toBe(true);
  });
  it("lower trust never overrides higher", () => {
    expect(shouldOverride("externally_verified", "source_confirmed")).toBe(false);
    expect(shouldOverride("source_confirmed", "declared")).toBe(false);
  });
  it("null current always overridden", () => {
    expect(shouldOverride(null, "inferred")).toBe(true);
  });
});
