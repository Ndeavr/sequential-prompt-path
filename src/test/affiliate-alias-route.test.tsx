/**
 * P0 affilié — l'alias /a/:slug ne doit jamais diverger du lien canonique
 * /:affiliateSlug. Il redirige vers la route canonique (seule à lire le RPC
 * public `affiliate_entry_by_slug`) et l'attribution `unpro_ref` survit à la
 * redirection, au rafraîchissement, au changement de rôle et au choix du canal
 * SMS / courriel.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import PageAffiliateAliasRedirect from "@/pages/affiliate/PageAffiliateAliasRedirect";
import { clearRoleIntent, readCapturedAffiliateRef, readRoleIntent, saveRoleIntent } from "@/services/auth/roleIntent";

function renderAlias(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/a/:slug" element={<PageAffiliateAliasRedirect />} />
        <Route path="/:affiliateSlug" element={<div>canonical:{location.pathname}</div>} />
        <Route path="/affilies" element={<div>liste affiliés</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("alias affilié /a/:slug", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearRoleIntent();
  });

  it("redirige vers la route canonique du même affilié", () => {
    renderAlias("/a/yanis6s1");
    expect(screen.getByText(/^canonical:/)).toBeTruthy();
  });

  it("est bien câblé dans le routeur (aucune lecture directe de la table)", () => {
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('<Route path="/a/:slug"');
    expect(router).toContain("PageAffiliateAliasRedirect");
    expect(router).not.toContain("PageAffiliePublicProfile");
    const alias = readFileSync("src/pages/affiliate/PageAffiliateAliasRedirect.tsx", "utf8");
    expect(alias).not.toContain('from("affiliates"');
  });

  it("ne fabrique aucun affilié pour un slug inconnu (la canonique décide)", () => {
    const alias = readFileSync("src/pages/affiliate/PageAffiliateAliasRedirect.tsx", "utf8");
    expect(alias).not.toMatch(/first_name|display_name|referral_code\s*[:=]\s*"/);
  });

  it("conserve unpro_ref à travers redirection, rafraîchissement et choix de canal", () => {
    localStorage.setItem(
      "unpro_ref",
      JSON.stringify({ refCode: "YANIS6S1", capturedAt: new Date().toISOString(), utmSource: "affiliate_entry" }),
    );
    renderAlias("/a/yanis6s1");
    expect(readCapturedAffiliateRef()).toBe("YANIS6S1");

    // changement de rôle puis choix SMS / courriel : l'attribution suit.
    saveRoleIntent("affiliate", { onboardingStep: "channel" });
    expect(readRoleIntent()?.affiliateRef).toBe("YANIS6S1");
    saveRoleIntent("contractor", { onboardingStep: "sms" });
    expect(readRoleIntent()?.affiliateRef).toBe("YANIS6S1");
    sessionStorage.clear(); // rafraîchissement
    expect(readCapturedAffiliateRef()).toBe("YANIS6S1");
  });
});
