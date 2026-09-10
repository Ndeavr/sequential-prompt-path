import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  createCalendarOAuthState,
  encryptCalendarToken,
  sanitizeCalendarReturnTo,
  verifyCalendarOAuthState,
} from "../../supabase/functions/_shared/calendarOAuthState";

describe("durcissement du parcours fondateur gratuit", () => {
  it("signe l'état OAuth, conserve une route interne et rejette toute altération", async () => {
    const now = Date.UTC(2026, 8, 10, 12, 0, 0);
    const state = await createCalendarOAuthState(
      "user-12345678",
      "/calendar/connect/success?role=contractor&surface=founder_free_profile",
      "test-secret",
      now,
    );

    const verified = await verifyCalendarOAuthState(state, "test-secret", now + 1_000);
    expect(verified).toMatchObject({
      user_id: "user-12345678",
      return_to: "/calendar/connect/success?role=contractor&surface=founder_free_profile",
    });

    const [payload, signature] = state.split(".");
    expect(await verifyCalendarOAuthState(`${payload}x.${signature}`, "test-secret", now)).toBeNull();
    expect(await verifyCalendarOAuthState(state, "wrong-secret", now)).toBeNull();
    expect(await verifyCalendarOAuthState(state, "test-secret", now + 11 * 60 * 1_000)).toBeNull();
  });

  it("bloque les redirections externes dans le retour OAuth", () => {
    expect(sanitizeCalendarReturnTo("https://attacker.example/path")).toBe(
      "/calendar/connect/success",
    );
    expect(sanitizeCalendarReturnTo("//attacker.example/path")).toBe(
      "/calendar/connect/success",
    );
    expect(sanitizeCalendarReturnTo("/entrepreneur/dashboard")).toBe(
      "/entrepreneur/dashboard",
    );
  });

  it("chiffre les jetons calendrier avec un IV aléatoire", async () => {
    const first = await encryptCalendarToken("provider-token", "test-secret");
    const second = await encryptCalendarToken("provider-token", "test-secret");
    expect(first).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(first).not.toContain("provider-token");
    expect(second).not.toBe(first);
  });

  it("lie la fin du profil à l'état d'intégration sans rétrograder un compte complété", () => {
    const edgeFunction = readFileSync("supabase/functions/matching-profile/index.ts", "utf8");
    expect(edgeFunction).toContain('existingBySession.contractor_id !== ownedContractor.id');
    expect(edgeFunction).toContain('["profile_completed", "completed"]');
    expect(edgeFunction).toContain('.update({ onboarding_status: "profile_completed" })');
  });

  it("verrouille le code courriel à six chiffres et élimine les casts any du formulaire", () => {
    const founderPage = readFileSync(
      "src/pages/founder/PageFounderLocalServices.tsx",
      "utf8",
    );
    expect(founderPage).toContain('.slice(0, 6)');
    expect(founderPage).toContain('otpCode.length !== 6');
    expect(founderPage).toContain('}, 350)');
    expect(founderPage).not.toContain("as any");
  });
});
