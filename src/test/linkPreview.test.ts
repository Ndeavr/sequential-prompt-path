import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolvePreviewSlug, previewLinkUrl, renderPreviewHtml, PREVIEW_VARIANTS } from "../../supabase/functions/_shared/linkPreview";

const og = (html: string, p: string) => html.match(new RegExp(`property="og:${p}" content="([^"]+)"`))?.[1];

describe("link previews per objective", () => {
  it("activation campaign gets contractor preview, not homeowner homepage", () => {
    const s = resolvePreviewSlug({ campaign: "activation_350_hiver" });
    expect(s).toBe("activation");
    const html = readFileSync(`public/p/${s}.html`, "utf8");
    expect(og(html, "title")).toBe("Votre expertise mérite les bons clients");
    expect(og(html, "image")).toBe("https://unpro.ca/og/link/activation-v1.jpg");
    expect(html).not.toMatch(/3 soumissions/);
  });
  it("sales team objective differs from activation", () => {
    const s = resolvePreviewSlug({ objective: "equipes-ventes" });
    const html = readFileSync(`public/p/${s}.html`, "utf8");
    expect(og(html, "title")).toBe("Des rendez-vous adaptés à votre équipe");
    expect(og(html, "image")).not.toBe(og(readFileSync("public/p/activation.html", "utf8"), "image"));
  });
  it("unknown objective falls back to neutral, EN by language", () => {
    expect(resolvePreviewSlug({ destination_url: "https://unpro.ca/xyz" })).toBe("unpro");
    expect(resolvePreviewSlug({ lang: "en" })).toBe("unpro-en");
  });
  it("heat pump preview only when declared", () => {
    expect(resolvePreviewSlug({ objective: "thermopompes" })).toBe("activation");
    expect(resolvePreviewSlug({ objective: "thermopompes", heat_pump_declared: true })).toBe("thermopompes");
  });
  it("every variant has an existing image and forwards to the unchanged /r/ tracker", () => {
    for (const v of Object.values(PREVIEW_VARIANTS)) {
      expect(existsSync(`public/og/link/${v.slug}-v1.jpg`)).toBe(true);
      expect(readFileSync(`public/p/${v.slug}.html`, "utf8")).toBe(renderPreviewHtml(v));
    }
    expect(previewLinkUrl("activation", "smi4s6ww0p")).toBe("https://unpro.ca/p/activation.html?c=smi4s6ww0p");
    expect(renderPreviewHtml(PREVIEW_VARIANTS.activation)).toContain('"/r/"+c');
  });
});
