// acq-preflight — returns operational status of every acquisition module
// based on available secrets. Called by the admin cockpit before letting
// the admin click a button.

import {
  cors,
  jsonResponse,
  MODULE_SECRETS,
  SECRET_NEXT_ACTION,
  checkSecrets,
  svcClient,
  updateHealth,
} from "../_shared/acq-preflight.ts";

type ModuleStatus = {
  module: string;
  status: "ok" | "degraded" | "paused";
  missing: string[];
  message: string;
  next_action?: string;
};

const DEGRADED_FALLBACK: Record<string, string> = {
  extract: "FIRECRAWL_API_KEY absent — extraction basique (titre/meta) seulement.",
  score_aipp: "OPENAI_API_KEY absent — scoring rule-based actif.",
};

const OPTIONAL_FALLBACK_SECRETS: Record<string, string[]> = {
  extract: ["FIRECRAWL_API_KEY"],
  score_aipp: ["OPENAI_API_KEY"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const s = svcClient();
  const modules: ModuleStatus[] = [];

  for (const [mod, required] of Object.entries(MODULE_SECRETS)) {
    const missingRequired = checkSecrets(required);
    const optional = OPTIONAL_FALLBACK_SECRETS[mod] ?? [];
    const missingOptional = checkSecrets(optional);

    if (missingRequired.length > 0) {
      const next = missingRequired.map((m) => SECRET_NEXT_ACTION[m] ?? `Configurer ${m}.`).join(" ");
      modules.push({
        module: mod,
        status: "paused",
        missing: missingRequired,
        message: `Module en pause: secret(s) manquant(s) — ${missingRequired.join(", ")}.`,
        next_action: next,
      });
      await updateHealth(s, mod, {
        status: "paused",
        error_code: "MISSING_SECRET",
        message: `Manquant: ${missingRequired.join(", ")}`,
        missing_secrets: missingRequired,
        proposed_fix: next,
      });
    } else if (missingOptional.length > 0) {
      modules.push({
        module: mod,
        status: "degraded",
        missing: missingOptional,
        message: DEGRADED_FALLBACK[mod] ?? `Fonctionne en mode dégradé (manque: ${missingOptional.join(", ")}).`,
        next_action: missingOptional.map((m) => SECRET_NEXT_ACTION[m] ?? `Optionnel: ${m}.`).join(" "),
      });
      await updateHealth(s, mod, {
        status: "degraded",
        error_code: "OPTIONAL_MISSING",
        message: DEGRADED_FALLBACK[mod] ?? null,
        missing_secrets: missingOptional,
      });
    } else {
      modules.push({
        module: mod,
        status: "ok",
        missing: [],
        message: "Opérationnel.",
      });
      await updateHealth(s, mod, {
        status: "ok",
        error_code: null,
        message: null,
        missing_secrets: [],
        proposed_fix: null,
      });
    }
  }

  return jsonResponse({ ok: true, step: "preflight", modules });
});
