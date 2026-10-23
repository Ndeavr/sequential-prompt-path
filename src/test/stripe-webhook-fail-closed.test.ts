import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { webhookEntryDecision, verificationSecrets } from "../../supabase/functions/_shared/webhookAuth";

const LIVE = "whsec_live_abc";
const TEST = "whsec_test_xyz";
const SRK = "service-role-key-123";

describe("webhook — fail closed sans secret", () => {
  it("POST externe + STRIPE_WEBHOOK_SECRET absent => rejeté avant tout parsing", () => {
    expect(
      webhookEntryDecision({ liveSecret: null, testSecret: null, replayToken: null, serviceRoleKey: SRK })
    ).toBe("reject_unavailable");
    expect(
      webhookEntryDecision({ liveSecret: "", testSecret: null, replayToken: null, serviceRoleKey: SRK })
    ).toBe("reject_unavailable");
    expect(
      webhookEntryDecision({ liveSecret: "   ", testSecret: null, replayToken: null, serviceRoleKey: SRK })
    ).toBe("reject_unavailable");
  });

  it("secret live manquant : un secret TEST seul n'autorise jamais le trafic externe", () => {
    expect(
      webhookEntryDecision({ liveSecret: null, testSecret: TEST, replayToken: null, serviceRoleKey: SRK })
    ).toBe("reject_unavailable");
  });

  it("secret live présent => vérification de signature obligatoire", () => {
    expect(
      webhookEntryDecision({ liveSecret: LIVE, testSecret: null, replayToken: null, serviceRoleKey: SRK })
    ).toBe("verify_signature");
  });

  it("mauvaise signature : le secret TEST n'est tenté qu'en repli après le live", () => {
    expect(verificationSecrets({ liveSecret: LIVE, testSecret: TEST })).toEqual([LIVE, TEST]);
    expect(verificationSecrets({ liveSecret: LIVE, testSecret: null })).toEqual([LIVE]);
  });
});

describe("webhook — replay interne correctement gardé", () => {
  it("token = SERVICE_ROLE_KEY exact et non vide => replay autorisé", () => {
    expect(
      webhookEntryDecision({ liveSecret: null, testSecret: null, replayToken: SRK, serviceRoleKey: SRK })
    ).toBe("replay");
  });

  it("mauvais token => jamais replay, même avec secret live présent", () => {
    expect(
      webhookEntryDecision({ liveSecret: LIVE, testSecret: null, replayToken: "wrong", serviceRoleKey: SRK })
    ).toBe("verify_signature");
  });

  it("clé service absente/vide : un token vide ne devient jamais un replay", () => {
    expect(
      webhookEntryDecision({ liveSecret: null, testSecret: null, replayToken: "", serviceRoleKey: "" })
    ).toBe("reject_unavailable");
    expect(
      webhookEntryDecision({ liveSecret: null, testSecret: null, replayToken: null, serviceRoleKey: null })
    ).toBe("reject_unavailable");
  });

  it("un secret manquant ne rend jamais un JSON public de confiance", () => {
    // Sans secret live et sans replay authentifié, aucune combinaison n'aboutit
    // à "replay" ou "verify_signature" — seulement au rejet.
    const decisions = [
      webhookEntryDecision({ liveSecret: undefined, testSecret: undefined, replayToken: undefined, serviceRoleKey: undefined }),
      webhookEntryDecision({ liveSecret: null, testSecret: TEST, replayToken: "forged", serviceRoleKey: SRK }),
    ];
    for (const d of decisions) expect(d).toBe("reject_unavailable");
  });
});

describe("câblage stripe-webhook", () => {
  const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

  it("utilise la décision partagée fail-closed", () => {
    expect(wh).toContain('from "../_shared/webhookAuth.ts"');
    expect(wh).toContain("webhookEntryDecision({");
    expect(wh).toContain('decision === "reject_unavailable"');
    expect(wh).toContain('decision === "verify_signature"');
  });

  it("JSON.parse(body) n'existe que dans la branche replay authentifiée", () => {
    const parseIdx = wh.indexOf("event = JSON.parse(body)");
    expect(parseIdx).toBeGreaterThan(0);
    expect(wh.lastIndexOf('decision === "verify_signature"', parseIdx)).toBeGreaterThan(0);
    // Un seul JSON.parse du corps brut dans tout le fichier.
    expect(wh.match(/JSON\.parse\(body\)/g)).toHaveLength(1);
  });

  it("l'ancien garde permissif a disparu", () => {
    expect(wh).not.toContain("!webhookSecret && !isReplay");
    expect(wh).not.toContain("constructEventAsync(body, sig, webhookSecret ?? \"\")");
  });
});
