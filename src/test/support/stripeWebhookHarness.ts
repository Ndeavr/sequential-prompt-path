// Loads the REAL stripe-webhook source for node tests. Every `../_shared/*.ts`
// import is resolved to the real module (signature/auth/tax helpers included),
// so a newly added helper can never silently turn into a 500 in tests.
// Only the remote Deno imports (Stripe, createClient) are adapters supplied by
// the caller; any other unhandled import fails loudly.
import { readFileSync } from "node:fs";
import { transform } from "esbuild";

export const WEBHOOK_PATH = "supabase/functions/stripe-webhook/index.ts";
const shared = import.meta.glob("../../../supabase/functions/_shared/*.ts");

export function webhookSource(): string {
  return readFileSync(WEBHOOK_PATH, "utf8");
}

/** Real values of every named import from ../_shared, overridable per test. */
export async function realSharedImports(source = webhookSource(), overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {};
  const importLines = source.match(/^import[^\n]*\n/gm) ?? [];
  for (const line of importLines) {
    const m = line.match(/^import\s+\{([^}]+)\}\s+from\s+"\.\.\/_shared\/([\w.-]+\.ts)";/);
    if (!m) {
      if (/esm\.sh\/(stripe|@supabase\/supabase-js)@/.test(line)) continue; // caller adapters
      throw new Error(`Unhandled webhook import in test harness: ${line.trim()}`);
    }
    const loader = shared[`../../../supabase/functions/_shared/${m[2]}`];
    if (!loader) throw new Error(`Shared module not found: ${m[2]}`);
    const mod = (await loader()) as Record<string, unknown>;
    for (const name of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!(name in mod)) throw new Error(`Shared export missing: ${name} in ${m[2]}`);
      values[name] = mod[name];
    }
  }
  return { ...values, ...overrides };
}

/** Registers the real Deno.serve handler with the supplied adapters. */
export async function loadWebhookHandler(adapters: {
  Deno: unknown; Stripe: unknown; createClient: unknown; overrides?: Record<string, unknown>;
}): Promise<(req: Request) => Promise<Response>> {
  const source = webhookSource();
  const injected = await realSharedImports(source, adapters.overrides);
  const { code } = await transform(source.replace(/^import[^\n]*\n/gm, ""), { loader: "ts", target: "es2022" });
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const deno = { ...(adapters.Deno as object), serve: (fn: typeof handler) => { handler = fn; } };
  new Function("Deno", "Stripe", "createClient", ...Object.keys(injected), code)(
    deno, adapters.Stripe, adapters.createClient, ...Object.values(injected),
  );
  if (!handler) throw new Error("Handler not registered");
  return handler;
}

/** Compiles a slice of the real webhook as an async function body (returns allowed). */
export async function compileWebhookBranch(startMarker: string, endMarker: string, params: string[]) {
  const source = webhookSource();
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Webhook branch markers not found");
  const wrapped = `async function __branch(${params.join(", ")}) {\n${source.slice(start, end)}\n}`;
  const { code } = await transform(wrapped, { loader: "ts", target: "es2022" });
  return new Function(`${code}; return __branch;`)() as (...args: unknown[]) => Promise<unknown>;
}
