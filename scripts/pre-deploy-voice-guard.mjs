#!/usr/bin/env node
// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
/**
 * pre_deploy_voice_guard — Block deploys when Alex voice health fails.
 *
 * Runs:
 *   1. Unit tests (vitest, if available)
 *   2. alex-voice-health edge function — must report "healthy"
 *   3. alex-voice-test (primary voice) — must return audio bytes
 *   4. alex-voice-test (backup voice)  — must return audio bytes
 *   5. Route + mount static checks — Alex must still be wired
 *
 * Exits non-zero (BLOCK DEPLOY) on the first failure.
 *
 * Usage:  bun run voice:guard   (or)   node scripts/pre-deploy-voice-guard.mjs
 *
 * Env required for live checks:
 *   VITE_SUPABASE_URL              (or SUPABASE_URL)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (or SUPABASE_ANON_KEY)
 * If those are missing the script logs WARN and skips live checks but still
 * runs unit tests and static mount checks.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PRIMARY_VOICE_ID = "YxrwjAKoUKULGd0g8K9Y";  // Sophia
const BACKUP_VOICE_ID  = "XB0fDUnXU5powFXDhCwa";  // Charlotte

const SB_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const SB_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let failed = false;
function fail(reason) {
  console.error(`[VOICE GUARD] FAIL: ${reason}`);
  failed = true;
}
function ok(line) {
  console.log(`[VOICE GUARD] OK:   ${line}`);
}
function warn(line) {
  console.warn(`[VOICE GUARD] WARN: ${line}`);
}

// ----- 1. Unit tests -----
try {
  if (existsSync("vitest.config.ts") || existsSync("vitest.config.js")) {
    execSync("bunx vitest run --reporter=dot --passWithNoTests", { stdio: "inherit" });
    ok("vitest run");
  } else {
    warn("no vitest config — skipping unit tests");
  }
} catch {
  fail("vitest run");
}

// ----- 2-4. Edge function checks -----
async function invokeEdge(name, body) {
  if (!SB_URL || !SB_KEY) return { skipped: true };
  const url = `${SB_URL.replace(/\/$/, "")}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      authorization: `Bearer ${SB_KEY}`,
      "content-type": "application/json",
    },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
  return { res };
}

async function liveChecks() {
  if (!SB_URL || !SB_KEY) {
    warn("VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing — skipping live edge checks");
    return;
  }

  // alex-voice-health
  try {
    const { res } = await invokeEdge("alex-voice-health", {});
    const data = await res.json();
    if (data?.status === "healthy") ok("alex-voice-health = healthy");
    else fail(`alex-voice-health status=${data?.status ?? "unknown"}`);
  } catch (e) {
    fail(`alex-voice-health: ${e.message ?? e}`);
  }

  // alex-voice-test primary
  for (const [label, id] of [
    ["primary", PRIMARY_VOICE_ID],
    ["backup", BACKUP_VOICE_ID],
  ]) {
    try {
      const { res } = await invokeEdge("alex-voice-test", {
        voice_id: id,
        test_text: "Test du contrat de santé voix.",
        language: "fr",
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        fail(`alex-voice-test (${label}) http=${res.status}`);
        continue;
      }
      if (!ct.startsWith("audio/")) {
        const body = await res.text();
        fail(`alex-voice-test (${label}) returned ${ct}: ${body.slice(0, 200)}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1024) fail(`alex-voice-test (${label}) audio too small (${buf.byteLength} B)`);
      else ok(`alex-voice-test (${label}) returned ${buf.byteLength} B audio`);
    } catch (e) {
      fail(`alex-voice-test (${label}): ${e.message ?? e}`);
    }
  }
}

await liveChecks();

// ----- 5. Static route + mount checks -----
function fileContains(path, needle) {
  if (!existsSync(path)) return false;
  return readFileSync(path, "utf8").includes(needle);
}

const router = "src/app/router.tsx";
if (fileContains(router, "/admin/voice-health")) ok("router mounts /admin/voice-health");
else fail("router does NOT mount /admin/voice-health");

const overlayCandidates = [
  "src/components/alex/GlobalAlexOverlay.tsx",
  "src/components/voice/OverlayAlexVoiceFullScreen.tsx",
];
const overlayPresent = overlayCandidates.some((p) => existsSync(p));
if (overlayPresent) ok("Alex overlay component present");
else fail("Alex overlay component missing");

const orbCandidates = [
  "src/components/alex/AlexOrb.tsx",
  "src/features/alex/AlexOrb.tsx",
  "src/components/alex/AlexMorphingOrb.tsx",
];
const orbWithMarker = orbCandidates.find((p) => fileContains(p, 'data-alex-orb="true"'));
if (orbWithMarker) ok(`Orb marker found in ${orbWithMarker}`);
else fail('no AlexOrb carries data-alex-orb="true" marker');

const protectedFiles = [
  "src/config/alexVoiceConfig.ts",
  "src/lib/voiceSmokeTest.ts",
  "src/pages/admin/PageVoiceHealth.tsx",
  "supabase/functions/alex-tts/index.ts",
];
for (const f of protectedFiles) {
  if (fileContains(f, "PROTECTED FILE — ALEX VOICE CORE")) ok(`protected header on ${f}`);
  else fail(`missing PROTECTED FILE header on ${f}`);
}

// ----- 6. Forbidden patterns (no browser TTS, no SCO, no alternate voice) -----
import { readdirSync, statSync } from "node:fs";
function walkSrc(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walkSrc(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) files.push(full);
  }
  return files;
}
const FORBIDDEN = [
  { pattern: /window\.speechSynthesis|new SpeechSynthesisUtterance/, label: "browser speechSynthesis (forbidden — female ElevenLabs only)" },
  { pattern: /startBluetoothSco|MODE_IN_COMMUNICATION|VOICE_COMMUNICATION/, label: "Bluetooth SCO / call audio mode (forbidden)" },
  { pattern: /mediaSession\s*\.\s*setActionHandler/, label: "navigator.mediaSession.setActionHandler (forbidden — Bluetooth transport hijack)" },
];
// Allow-list: alexVoiceAbstraction.ts contains comments referencing speechSynthesis to document the lock.
const FORBIDDEN_ALLOW = new Set([
  "src/services/alexVoiceAbstraction.ts",
  "src/config/alexVoiceConfig.ts",
]);
try {
  const files = walkSrc("src");
  let forbiddenHits = 0;
  for (const f of files) {
    const rel = f.replace(/\\/g, "/");
    if (FORBIDDEN_ALLOW.has(rel)) continue;
    const content = readFileSync(f, "utf8");
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(content)) {
        fail(`forbidden pattern in ${rel}: ${label}`);
        forbiddenHits++;
      }
    }
  }
  if (!forbiddenHits) ok("no forbidden audio patterns (speechSynthesis / SCO / mediaSession handlers)");
} catch (e) {
  warn(`forbidden-pattern scan: ${e.message ?? e}`);
}

if (failed) {
  console.error("\n[VOICE GUARD] DEPLOY BLOCKED — fix the above before shipping.\n");
  process.exit(1);
} else {
  console.log("\n[VOICE GUARD] All voice checks passed.\n");
}
