/**
 * UNPRO — manual IndexNow submission (Bing, Yandex, Seznam, Naver… share submissions).
 *
 *   bunx tsx scripts/indexnow-submit.ts                 # dry run: lists what would be sent
 *   bunx tsx scripts/indexnow-submit.ts --since=2026-11-01
 *   bunx tsx scripts/indexnow-submit.ts --submit        # real POST, after the key file is live
 *
 * Reads the generated local sitemaps (public/sitemap.xml + its children), keeps
 * canonical https://unpro.ca URLs only, and refuses to submit unless
 * https://unpro.ca/<key>.txt is publicly served with the exact key.
 * Run it after publishing, not on every build (avoid notification spam).
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  buildIndexNowPayloads,
  classifyIndexNowStatus,
  extractLocs,
  isValidIndexNowKey,
  selectIndexNowUrls,
} from "../src/seo/indexNow";

const args = process.argv.slice(2);
const submit = args.includes("--submit");
const sinceArg = args.find((a) => a.startsWith("--since="))?.slice("--since=".length);
const since = sinceArg ? new Date(sinceArg) : undefined;

function readLocal(name: string): string | null {
  const p = resolve("public", name);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

async function main() {
  if (!isValidIndexNowKey(INDEXNOW_KEY)) throw new Error("invalid IndexNow key format");
  const localKey = readLocal(`${INDEXNOW_KEY}.txt`)?.trim();
  if (localKey !== INDEXNOW_KEY) throw new Error(`public/${INDEXNOW_KEY}.txt missing or mismatched`);
  if (since && Number.isNaN(since.getTime())) throw new Error(`invalid --since date: ${sinceArg}`);

  const index = readLocal("sitemap.xml");
  if (!index) throw new Error("public/sitemap.xml not found — run the sitemap generator first");
  const entries = [];
  for (const child of extractLocs(index)) {
    const name = new URL(child.loc).pathname.replace(/^\//, "");
    const xml = readLocal(name);
    if (!xml) {
      console.warn(`[indexnow] ${name} listed in index but missing locally — skipped`);
      continue;
    }
    entries.push(...extractLocs(xml));
  }
  const urls = selectIndexNowUrls(entries, { since });
  const payloads = buildIndexNowPayloads(urls);
  console.log(`[indexnow] ${urls.length} canonical URL(s) in ${payloads.length} batch(es)${since ? ` since ${since.toISOString()}` : ""}`);

  if (!submit) {
    urls.slice(0, 20).forEach((u) => console.log(`  ${u}`));
    if (urls.length > 20) console.log(`  … +${urls.length - 20}`);
    console.log("[indexnow] dry run — nothing sent. Add --submit after the key file is live.");
    return;
  }

  const live = await fetch(INDEXNOW_KEY_LOCATION, { redirect: "follow" });
  const liveText = live.ok ? (await live.text()).trim() : "";
  if (liveText !== INDEXNOW_KEY) {
    console.error(`[indexnow] BLOCKED: ${INDEXNOW_KEY_LOCATION} → HTTP ${live.status}; key not served yet. Publish first.`);
    process.exitCode = 1;
    return;
  }

  for (const [i, body] of payloads.entries()) {
    const r = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const outcome = classifyIndexNowStatus(r.status);
    const text = outcome === "accepted" ? "" : (await r.text()).slice(0, 500);
    console.log(`[indexnow] batch ${i + 1}/${payloads.length}: HTTP ${r.status} ${outcome}${text ? ` — ${text}` : ""}`);
    if (outcome !== "accepted") {
      process.exitCode = 1;
      if (outcome === "rate_limited") console.error("[indexnow] rate limited — retry later, do not loop.");
      return;
    }
  }
}

main().catch((e) => {
  console.error(`[indexnow] ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
});
