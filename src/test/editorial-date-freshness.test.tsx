import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { EDITORIAL_REVISIONS, editorialModifiedDate, formatEditorialDate, validEditorialDate } from "@/seo/editorialDates";
import ArticleContentWithVisuals from "@/components/blog/ArticleContentWithVisuals";

const NOW = new Date("2026-10-11T22:44:00Z");
describe("truthful editorial dates", () => {
  it("preserves original publication unless an explicit valid review exists", () => {
    expect(editorialModifiedDate("2026-03-23", undefined, NOW)).toBe("2026-03-23");
    expect(editorialModifiedDate("2026-08-22", "2026-10-11", NOW)).toBe("2026-10-11");
  });
  it("rejects invalid, future and pre-publication updates", () => {
    expect(validEditorialDate("not a date", NOW)).toBeUndefined();
    expect(validEditorialDate("2026-10-12", NOW)).toBeUndefined();
    expect(editorialModifiedDate("2026-08-22", "2026-03-23", NOW)).toBe("2026-08-22");
    expect(editorialModifiedDate(null, "2026-10-11", NOW)).toBeUndefined();
  });
  it("formats Quebec calendar dates without shifting a day", () => {
    expect(formatEditorialDate("2026-10-11")).toBe("11 octobre 2026");
    expect(formatEditorialDate("2026-03-23T17:02:51.707Z")).toBe("23 mars 2026");
  });
  it("uses a single genuine revision for article UI, OG/schema and sitemap", () => {
    expect(EDITORIAL_REVISIONS["/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur"]).toBe("2026-10-11");
    const page = readFileSync("src/pages/articles/PageApparaitreRechercheIA2026.tsx", "utf8");
    expect(page).toContain('const PUBLISHED = "2026-08-22"');
    expect(page).toContain('dateModified={MODIFIED}');
    expect(page).toContain('property="article:modified_time" content={MODIFIED}');
    expect(page).toContain('developers.google.com/search/docs/appearance/ai-features');
    expect(readFileSync("scripts/generate-sitemaps.ts", "utf8")).toContain('EDITORIAL_REVISIONS[r.path]');
  });
  it("keeps demo posts off public legacy listing routes", () => {
    const legacy = readFileSync("src/pages/BlogPage2.tsx", "utf8");
    expect(legacy).not.toContain("MOCK_BLOG_POSTS");
    expect(legacy).toContain("<BlogIndexPage />");
  });
  it("does not invent publication dates on a city page", () => {
    const page = readFileSync("src/pages/lead-pipe/PagePlombEauCity.tsx", "utf8");
    expect(page).not.toContain("getFullYear() + 1");
    expect(page).not.toContain("datePublished: new Date()");
  });
  it("labels historic pricing without changing its year or amounts", () => {
    render(<ArticleContentWithVisuals slug="pavage-asphalte-laval-entree-garage" html="<p>Prix en 2024 : 7 $ à 15 $.</p>" />);
    expect(screen.getByLabelText("Contexte des prix")).toHaveTextContent("ne constituent pas une estimation pour octobre 2026");
    expect(screen.getByText("Prix en 2024 : 7 $ à 15 $.")).toBeInTheDocument();
  });
});