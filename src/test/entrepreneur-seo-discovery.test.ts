// @vitest-environment node
import { expect, test, vi } from "vitest";
import { resolve } from "node:path";

const output = vi.hoisted(() => new Map<string, string>());
vi.mock("fs", () => ({ writeFileSync: (path: string, data: string) => output.set(path, data) }));

test("publishes entrepreneur discovery URLs in sitemap and complete pillar corpus", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  try {
    await import("../../scripts/generate-sitemaps");
    await vi.waitFor(() => expect(output.has(resolve("public/llms-full.txt"))).toBe(true));
    const sitemap = output.get(resolve("public/sitemap-pages.xml"))!;
    const corpus = output.get(resolve("public/llms-full.txt"))!;
    for (const path of ["/entrepreneurs", "/visibilite-ia-entrepreneurs", "/entrepreneurs/audit-ia", "/entrepreneurs/comment-ca-marche", "/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur"]) {
      expect(sitemap.split(`<loc>https://unpro.ca${path}</loc>`)).toHaveLength(2);
      expect(corpus).toContain(`- https://unpro.ca${path}\n`);
    }
    expect(sitemap).not.toContain("/entrepreneur/checkout");
  } finally {
    vi.unstubAllGlobals();
  }
});
