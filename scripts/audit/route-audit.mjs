/**
 * UNPRO — P0 route readability + conversion audit crawler.
 *
 * For every route: renders it in Chromium, injects axe-core, and measures
 *   - WCAG AA colour-contrast violations (real computed colours)
 *   - scroll reachability (can the last element be reached?)
 *   - invisible overlays intercepting the primary CTA
 *   - console errors and 4xx/5xx network responses
 *   - stuck skeletons / infinite loading
 *   - horizontal overflow
 *
 * Usage:
 *   node scripts/audit/route-audit.mjs [--scope=revenue|all] [--limit=N] [--out=dir]
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRoutes, resolveParams, classify, REVENUE_ROUTES } from "./extract-routes.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:8080";
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const SCOPE = args.scope ?? "revenue";
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const OUT = resolve(ROOT, args.out ?? "docs/audit");

const AXE = readFileSync(resolve(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");

const VIEWPORTS_FULL = [
  { label: "360x800", width: 360, height: 800 },
  { label: "390x844", width: 390, height: 844 },
  { label: "412x915", width: 412, height: 915 },
  { label: "1366x768", width: 1366, height: 768 },
  { label: "1920x1080", width: 1920, height: 1080 },
];
const VIEWPORTS_STD = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1366x768", width: 1366, height: 768 },
];

function pickRoutes() {
  const all = extractRoutes();
  if (SCOPE === "revenue") return all.filter((r) => REVENUE_ROUTES.includes(r));
  return all;
}

/** Runs inside the page. Returns the layout/interaction diagnostics. */
const PAGE_PROBE = `(() => {
  const doc = document;
  const de = doc.documentElement;
  const body = doc.body;
  const cs = (el) => getComputedStyle(el);
  const bodyText = (body.innerText || "").trim();

  // scroll reachability
  const scrollable = de.scrollHeight > de.clientHeight + 4;
  const htmlOverflow = cs(de).overflow + "/" + cs(body).overflow;
  const scrollBlocked =
    de.scrollHeight > de.clientHeight + 40 &&
    (cs(body).overflow === "hidden" || cs(de).overflow === "hidden");

  // horizontal overflow
  const hOverflow = de.scrollWidth > de.clientWidth + 2;

  // stuck skeleton / infinite loading
  const skeletons = doc.querySelectorAll('[class*="skeleton"],[class*="animate-pulse"]').length;
  const emptyish = bodyText.length < 40;

  // primary CTA detection + overlay interception
  const ctaSel = 'a[href],button';
  const candidates = [...doc.querySelectorAll(ctaSel)].filter((el) => {
    const r = el.getBoundingClientRect();
    const t = (el.innerText || "").trim();
    return r.width > 80 && r.height > 32 && t.length > 2;
  });
  let cta = null;
  if (candidates.length) {
    const el = candidates[0];
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let intercepted = false;
    let interceptor = null;
    if (cy > 0 && cy < innerHeight) {
      const top = doc.elementFromPoint(cx, cy);
      if (top && !el.contains(top) && !top.contains(el)) {
        intercepted = true;
        interceptor = top.tagName.toLowerCase() + (top.className && typeof top.className === 'string' ? '.' + top.className.split(' ').slice(0,2).join('.') : '');
      }
    }
    cta = {
      label: (el.innerText || "").trim().slice(0, 60),
      href: el.getAttribute("href"),
      disabled: el.hasAttribute("disabled"),
      intercepted,
      interceptor,
    };
  }

  // theme scope detection
  const root = body.firstElementChild;
  const scopes = ["alex-immersive", "admin-theme", "landing-warm"];
  const scopeFound = scopes.find((s) => doc.querySelector("." + s)) ?? null;
  const bg = cs(body).backgroundColor;

  return {
    textLength: bodyText.length,
    scrollable, scrollBlocked, htmlOverflow, hOverflow,
    skeletons, emptyish, cta, themeScope: scopeFound, bodyBg: bg,
    scrollHeight: de.scrollHeight, clientHeight: de.clientHeight,
  };
})()`;

async function auditRoute(context, route, viewport) {
  const { url, unresolved } = resolveParams(route);
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const consoleErrors = [];
  const netErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
  });
  page.on("response", (r) => {
    if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url().slice(0, 160)}`);
  });

  const row = {
    route, url, viewport: viewport.label, group: classify(route),
    unresolved_params: unresolved,
    status: "ok", contrast_violations: 0, worst_contrast: null,
    console_errors: [], network_errors: [], notes: [],
  };

  try {
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    const probe = await page.evaluate(PAGE_PROBE);
    Object.assign(row, {
      text_length: probe.textLength,
      theme_scope: probe.themeScope,
      body_bg: probe.bodyBg,
      scroll_blocked: probe.scrollBlocked,
      h_overflow: probe.hOverflow,
      cta: probe.cta,
      final_url: page.url().replace(BASE, ""),
    });

    if (probe.emptyish) { row.status = "blank"; row.notes.push("page rend moins de 40 caractères"); }
    if (probe.scrollBlocked) row.notes.push(`scroll bloqué (overflow ${probe.htmlOverflow})`);
    if (probe.hOverflow) row.notes.push("défilement horizontal non intentionnel");
    if (probe.skeletons > 0 && probe.textLength < 200) row.notes.push("skeleton jamais remplacé");
    if (probe.cta?.intercepted) row.notes.push(`CTA intercepté par ${probe.cta.interceptor}`);
    if (probe.cta?.disabled) row.info = ["CTA en attente de saisie ou de contexte"];
    if (!probe.cta) row.notes.push("aucun CTA détecté");
    if (row.final_url !== url && !row.final_url.startsWith(url)) {
      row.notes.push(`redirection vers ${row.final_url}`);
    }

    await page.addScriptTag({ content: AXE });
    const axeRes = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const r = await window.axe.run(document, {
        runOnly: { type: "rule", values: ["color-contrast"] },
        resultTypes: ["violations"],
      });
      return r.violations.flatMap((v) =>
        v.nodes.slice(0, 12).map((n) => ({
          selector: String(n.target[0]).slice(0, 160),
          summary: (n.failureSummary || "").slice(0, 240),
          html: (n.html || "").slice(0, 160),
        })),
      );
    });
    row.contrast_violations = axeRes.length;
    row.contrast_nodes = axeRes.slice(0, 8);
    const ratio = axeRes
      .map((n) => Number((n.summary.match(/contrast ratio of ([\d.]+)/) || [])[1]))
      .filter(Boolean);
    row.worst_contrast = ratio.length ? Math.min(...ratio) : null;
    if (axeRes.length > 0) row.status = row.status === "ok" ? "contrast" : row.status;
  } catch (e) {
    row.status = "error";
    row.notes.push(String(e).slice(0, 200));
  }

  row.console_errors = consoleErrors.slice(0, 5);
  row.network_errors = netErrors.slice(0, 5);
  await page.close();
  return row;
}

function markdown(rows) {
  const head =
    "| Route | Vue | Groupe | Statut | Contraste (viol.) | Pire ratio | Scroll | CTA | Destination | Notes |\n" +
    "|---|---|---|---|---|---|---|---|---|---|\n";
  const body = rows
    .map((r) =>
      `| \`${r.route}\` | ${r.viewport} | ${r.group} | ${r.status} | ${r.contrast_violations} | ${
        r.worst_contrast ?? "—"
      } | ${r.scroll_blocked ? "BLOQUÉ" : "ok"} | ${
        r.cta ? r.cta.label.replace(/\|/g, "/").slice(0, 30) : "—"
      } | ${r.cta?.href ?? "—"} | ${r.notes.join(" ; ") || "—"} |`,
    )
    .join("\n");
  return head + body + "\n";
}

async function main() {
  const routes = pickRoutes().slice(0, LIMIT);
  const browser = await chromium.launch(headlessOpts());
  const context = await browser.newContext({ locale: "fr-CA" });
  const rows = [];
  for (const route of routes) {
    const vps = REVENUE_ROUTES.includes(route) ? VIEWPORTS_FULL : VIEWPORTS_STD;
    for (const vp of vps) {
      const r = await auditRoute(context, route, vp);
      rows.push(r);
      const flag = r.status === "ok" && r.notes.length === 0 ? "✓" : "✗";
      console.log(`${flag} ${route} @${vp.label} — ${r.status} — contraste:${r.contrast_violations} — ${r.notes.join("; ")}`);
    }
  }
  await browser.close();

  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "route-audit.json"), JSON.stringify(rows, null, 2));
  writeFileSync(
    resolve(OUT, "route-registry.md"),
    `# UNPRO — Registre d'audit des routes\n\nGénéré le ${new Date().toISOString()} — base \`${BASE}\` — périmètre \`${SCOPE}\` — ${rows.length} mesures.\n\n${markdown(rows)}`,
  );

  const bad = rows.filter((r) => r.status !== "ok" || r.notes.length > 0);
  console.log(`\n${rows.length} mesures — ${bad.length} avec anomalie.`);
}

function headlessOpts() {
  // The sandbox ships Chromium under /opt/ms-playwright (version differs from the
  // npm package's pinned build), so point at the installed binary explicitly.
  const opts = { headless: true, args: ["--no-sandbox"] };
  const candidates = [
    "/opt/ms-playwright/chromium-1194/chrome-linux/chrome",
    process.env.AUDIT_CHROMIUM_PATH,
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) { opts.executablePath = c; break; }
  }
  return opts;
}

main();
