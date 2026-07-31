/**
 * UNPRO — Route extraction for the readability / conversion audit.
 * Parses `src/app/router.tsx` and returns every declared path, with dynamic
 * params substituted by real production values where known.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Real production-shaped values for dynamic segments. */
export const PARAM_FIXTURES = {
  token: "AUDIT_TOKEN_PLACEHOLDER",
  slug: "isolation-solution-royal",
  city: "laval",
  ville: "laval",
  category: "plombier",
  categorie: "plombier",
  service: "plomberie",
  problem: "degat-eau",
  probleme: "degat-eau",
  quartier: "chomedey",
  id: "00000000-0000-0000-0000-000000000000",
  quoteId: "00000000-0000-0000-0000-000000000000",
  contractorId: "00000000-0000-0000-0000-000000000000",
  propertyId: "00000000-0000-0000-0000-000000000000",
  projectId: "00000000-0000-0000-0000-000000000000",
  runId: "00000000-0000-0000-0000-000000000000",
};

/** Routes on the money path — audited at every breakpoint. */
export const REVENUE_ROUTES = [
  "/",
  "/entrepreneur",
  "/pro/score",
  "/pro/activate",
  "/pro/welcome",
  "/contractor/join",
  "/contractor/analysis",
  "/contractor/activated",
  "/login",
  "/role",
  "/pricing",
  "/tarifs-entrepreneurs",
  "/entrepreneur/devis-personnalise",
];

export function extractRoutes(source) {
  const file = source ?? readFileSync(resolve(ROOT, "src/app/router.tsx"), "utf8");
  const found = new Set();
  const re = /<Route\s+[^>]*path=\{?["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = re.exec(file)) !== null) {
    const p = m[1];
    if (!p || p === "*") continue;
    found.add(p.startsWith("/") ? p : `/${p}`);
  }
  return [...found].sort();
}

export function resolveParams(path) {
  const unresolved = [];
  const filled = path.replace(/:([A-Za-z0-9_]+)\??/g, (_all, name) => {
    const v = PARAM_FIXTURES[name];
    if (!v) {
      unresolved.push(name);
      return "audit-placeholder";
    }
    return v;
  });
  return { url: filled.replace(/\/\*$/, ""), unresolved };
}

export function classify(path) {
  if (path.startsWith("/admin")) return "admin";
  if (/^\/(pro|entrepreneur|contractor)/.test(path)) return "contractor";
  if (/^\/(condo|syndicat)/.test(path)) return "condo";
  if (/(login|auth|role|otp|logout|signup|inscription)/.test(path)) return "auth";
  if (/(activate|activation|checkout|paiement|payment|pricing|tarifs|success|cancel)/.test(path))
    return "conversion";
  return "public";
}
