import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { readFileSync } from "fs";
import { resolve } from "path";
import ClaraEntrySeoHead, { CLARA_CANONICAL_URL } from "@/seo/components/ClaraEntrySeoHead";

describe("Clara public entry", () => {
  it("legacy /alex alias renders with the canonical pointing to /conversation", async () => {
    render(
      <MemoryRouter initialEntries={["/alex?q=bonjour"]}>
        <Routes>
          <Route path="/alex" element={<ClaraEntrySeoHead />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(CLARA_CANONICAL_URL);
    });
    expect(CLARA_CANONICAL_URL).toBe("https://unpro.ca/conversation");
    expect(document.title).toMatch(/^Clara/);
    expect(document.title).not.toMatch(/Alex/);
  });

  it("router keeps /alex aliases and /conversation on the same page with Clara metadata", () => {
    const router = readFileSync(resolve(__dirname, "../../app/router.tsx"), "utf8");
    for (const p of ["/alex", "/alex/voice", "/alex/analysis", "/conversation"]) {
      expect(router).toContain(`<Route path="${p}" element={<Suspense fallback={<LazyFallback />}><ClaraEntrySeoHead /><PageHomeAlexConversationalLite />`);
    }
  });

  it("/s/:city/:service resolves to the stored city/service slug", () => {
    const router = readFileSync(resolve(__dirname, "../../app/router.tsx"), "utf8");
    expect(router).toContain('<Route path="/s/:city/:service" element={<SeoPageRenderer />} />');
    let seen = "";
    function Probe() {
      const p = useParams<{ slug?: string; city?: string; service?: string }>();
      seen = p.city && p.service ? `${p.city}/${p.service}` : p.slug ?? "";
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/s/montreal/couvreur"]}>
        <Routes>
          <Route path="/s/:slug" element={<Probe />} />
          <Route path="/s/:city/:service" element={<Probe />} />
          <Route path="/:city/:type/:problem" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(seen).toBe("montreal/couvreur");
  });
});

describe("visible assistant labels", () => {
  it("no visible ALEX label remains in the orb/hero components", () => {
    for (const f of [
      "components/alex/AlexOrbPremium.tsx",
      "components/home-orb/HeroOrbMockup.tsx",
      "components/home/HeroSectionAlexFirst.tsx",
      "components/import-terminal/PanelAlexObservesImport.tsx",
    ]) {
      const src = readFileSync(resolve(__dirname, "../..", f), "utf8");
      expect(src).not.toMatch(/>ALEX<|ALEX ·/);
      expect(src).toMatch(/CLARA/);
    }
  });
});
