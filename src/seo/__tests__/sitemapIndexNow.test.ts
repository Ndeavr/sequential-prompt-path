import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  planSitemapWrite,
  countLocs,
  isSitemapEligibleSeoPage,
  isSitemapEligibleSeoArticle,
  dedupeByLoc,
  lastmodFrom,
  escapeXml,
  SEO_PAGE_MIN_BODY_CHARS,
} from "@/seo/sitemapSources";
import {
  INDEXNOW_KEY,
  buildIndexNowPayloads,
  classifyIndexNowStatus,
  extractLocs,
  isValidIndexNowKey,
  selectIndexNowUrls,
} from "@/seo/indexNow";

const pub = (f: string) => resolve(__dirname, "../../../public", f);
const read = (f: string) => readFileSync(pub(f), "utf8");

const page = (o: Partial<Parameters<typeof isSitemapEligibleSeoPage>[0]> = {}) => ({
  slug: "isolation-montreal",
  updated_at: "2026-04-22T13:00:50Z",
  title: "Isolation à Montréal",
  meta_description: "Guide",
  h1: "Isolation à Montréal",
  body_md: "x".repeat(SEO_PAGE_MIN_BODY_CHARS),
  ...o,
});

describe("sitemap fail-soft", () => {
  it("keeps the previous file when the source read fails", () => {
    expect(planSitemapWrite(false, 0, 70)).toBe("keep");
    expect(planSitemapWrite(false, 5, 70)).toBe("keep");
  });
  it("keeps the previous file when a successful read is empty but the file had URLs", () => {
    expect(planSitemapWrite(true, 0, 70)).toBe("keep");
  });
  it("writes on a successful non-empty read", () => {
    expect(planSitemapWrite(true, 3, 70)).toBe("write");
  });
  it("counts locs", () => {
    expect(countLocs("<url><loc>a</loc></url><url><loc>b</loc></url>")).toBe(2);
    expect(countLocs(null)).toBe(0);
  });
});

describe("seo_pages eligibility", () => {
  it("accepts a substantive published page, including city/service slugs", () => {
    expect(isSitemapEligibleSeoPage(page())).toBe(true);
    expect(isSitemapEligibleSeoPage(page({ slug: "montreal/couvreur" }))).toBe(true);
  });
  it("rejects thin, test, malformed or Alex-branded pages", () => {
    expect(isSitemapEligibleSeoPage(page({ body_md: "x".repeat(SEO_PAGE_MIN_BODY_CHARS - 1) }))).toBe(false);
    expect(isSitemapEligibleSeoPage(page({ slug: "test-isolation" }))).toBe(false);
    expect(isSitemapEligibleSeoPage(page({ slug: "a/b/c" }))).toBe(false);
    expect(isSitemapEligibleSeoPage(page({ meta_description: "" }))).toBe(false);
    expect(isSitemapEligibleSeoPage(page({ body_md: "Parlez à Alex. " + "x".repeat(2000) }))).toBe(false);
  });
  it("excludes legacy alex slugs even when the content now says Clara", () => {
    const clara = page({
      slug: "alex-ai-home-assistant",
      title: "Clara, conseillère IA UNPRO",
      h1: "Clara, conseillère IA UNPRO",
      body_md: "Clara vous aide. " + "x".repeat(SEO_PAGE_MIN_BODY_CHARS),
    });
    expect(isSitemapEligibleSeoPage(clara)).toBe(false);
    expect(isSitemapEligibleSeoPage({ ...clara, slug: "montreal/alex" })).toBe(false);
    expect(isSitemapEligibleSeoPage({ ...clara, slug: "alexandria-renovation" })).toBe(true);
  });
  it("generated sitemap-seo-pages.xml lists no legacy alex slug", () => {
    expect(read("sitemap-seo-pages.xml")).not.toMatch(/\/s\/(?:[^<]*[-/])?alex(?:[-/<])/);
  });
});

describe("seo_articles eligibility", () => {
  const art = { slug: "toiture-coule-montreal-quoi-faire", updated_at: "2026-03-21T15:57:48Z", title: "T", meta_description: "M", content_html: "<p>ok</p>", word_count: 1200, generation_status: "completed" };
  it("accepts completed articles and rejects pending or short ones", () => {
    expect(isSitemapEligibleSeoArticle(art)).toBe(true);
    expect(isSitemapEligibleSeoArticle({ ...art, generation_status: "pending" })).toBe(false);
    expect(isSitemapEligibleSeoArticle({ ...art, word_count: 300 })).toBe(false);
  });
});

describe("helpers", () => {
  it("dedupes, escapes and never fabricates lastmod", () => {
    expect(dedupeByLoc([{ loc: "a" }, { loc: "a" }, { loc: "b" }])).toHaveLength(2);
    expect(escapeXml("a&b<c>")).toBe("a&amp;b&lt;c&gt;");
    expect(lastmodFrom(null)).toBeUndefined();
    expect(lastmodFrom("not a date")).toBeUndefined();
    expect(lastmodFrom("2026-04-22T13:00:50Z")).toBe("2026-04-22T13:00:50.000Z");
  });
});

describe("generated artifacts", () => {
  const index = read("sitemap.xml");
  const children = extractLocs(index).map((e) => new URL(e.loc).pathname.slice(1));

  it("index lists only existing, non-empty sub-sitemaps including services and guides", () => {
    expect(children).toContain("sitemap-seo-pages.xml");
    expect(children).toContain("sitemap-articles.xml");
    for (const c of children) {
      expect(existsSync(pub(c))).toBe(true);
      expect(countLocs(read(c))).toBeGreaterThan(0);
    }
  });

  it("lists /conversation for Clara and never a legacy /alex alias", () => {
    const all = children.flatMap((c) => extractLocs(read(c)).map((e) => e.loc));
    expect(all).toContain("https://unpro.ca/conversation");
    expect(all.some((u) => /\/alex(\/|$|\?)/.test(u))).toBe(false);
    expect(new Set(all).size).toBe(all.length);
  });

  it("includes the recent published blog article and only canonical /s/ and /articles/ routes", () => {
    expect(read("sitemap-blog.xml")).toContain("https://unpro.ca/blog/ia-trouver-contrats-entrepreneurs");
    for (const e of extractLocs(read("sitemap-seo-pages.xml"))) expect(e.loc).toMatch(/^https:\/\/unpro\.ca\/s\/[a-z0-9-]+(\/[a-z0-9-]+)?$/);
    for (const e of extractLocs(read("sitemap-articles.xml"))) expect(e.loc).toMatch(/^https:\/\/unpro\.ca\/articles\/[a-z0-9-]+$/);
  });

  it("robots.txt points to the sitemap index", () => {
    expect(read("robots.txt")).toMatch(/^Sitemap: https:\/\/unpro\.ca\/sitemap\.xml$/m);
  });

  it("AI-facing description files name Clara, not Alex", () => {
    for (const f of ["llms.txt", "knowledge-graph.json"]) {
      const text = read(f).replace(/"@id": "https:\/\/unpro\.ca\/#alex"/g, "");
      expect(text).not.toMatch(/\bAlex\b/);
      expect(text).toMatch(/\bClara\b/);
    }
  });
});

describe("IndexNow", () => {
  it("serves the key file with the exact key", () => {
    expect(isValidIndexNowKey(INDEXNOW_KEY)).toBe(true);
    expect(read(`${INDEXNOW_KEY}.txt`).trim()).toBe(INDEXNOW_KEY);
  });
  it("keeps same-host https URLs, deduped, filtered by lastmod when asked", () => {
    const urls = selectIndexNowUrls(
      [
        { loc: "https://unpro.ca/a", lastmod: "2026-11-02T00:00:00Z" },
        { loc: "https://unpro.ca/a" },
        { loc: "https://evil.example/x" },
        { loc: "http://unpro.ca/b" },
        { loc: "https://unpro.ca/old", lastmod: "2026-01-01T00:00:00Z" },
      ],
      { since: new Date("2026-11-01T00:00:00Z") },
    );
    expect(urls).toEqual(["https://unpro.ca/a"]);
  });
  it("batches at the protocol limit and only treats 200/202 as accepted", () => {
    const p = buildIndexNowPayloads(Array.from({ length: 10_001 }, (_, i) => `https://unpro.ca/p${i}`));
    expect(p).toHaveLength(2);
    expect(p[0].keyLocation).toBe(`https://unpro.ca/${INDEXNOW_KEY}.txt`);
    expect(classifyIndexNowStatus(200)).toBe("accepted");
    expect(classifyIndexNowStatus(202)).toBe("accepted");
    expect(classifyIndexNowStatus(403)).toBe("key_invalid");
    expect(classifyIndexNowStatus(422)).toBe("unprocessable");
    expect(classifyIndexNowStatus(429)).toBe("rate_limited");
  });
});
