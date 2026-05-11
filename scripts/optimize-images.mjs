#!/usr/bin/env node
/**
 * UNPRO image optimizer.
 * Converts large PNG/JPG assets to WebP (quality 80) next to the source.
 * - Logos (transparent PNG) -> .webp lossless-ish (q90)
 * - Photos (JPG)            -> .webp q78
 * Run manually: `node scripts/optimize-images.mjs`
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const TARGETS = [
  { dir: "src/assets", recursive: false },
  { dir: "public", recursive: false },
];

const MIN_BYTES = 60 * 1024; // skip anything < 60 KB

async function listFiles(dir, recursive) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) out.push(...(await listFiles(p, true)));
    } else out.push(p);
  }
  return out;
}

async function process(file) {
  const ext = extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return null;
  const s = await stat(file);
  if (s.size < MIN_BYTES) return null;
  const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
  if (existsSync(out)) {
    const so = await stat(out);
    if (so.mtimeMs >= s.mtimeMs) return null;
  }
  const isPng = ext === ".png";
  const img = sharp(file);
  const meta = await img.metadata();
  const pipeline = img.webp({
    quality: isPng ? 90 : 78,
    effort: 5,
    alphaQuality: isPng ? 95 : undefined,
  });
  await pipeline.toFile(out);
  const so = await stat(out);
  return {
    in: file,
    out,
    inKB: Math.round(s.size / 1024),
    outKB: Math.round(so.size / 1024),
    w: meta.width,
    h: meta.height,
  };
}

const results = [];
for (const t of TARGETS) {
  const files = await listFiles(t.dir, t.recursive);
  for (const f of files) {
    try {
      const r = await process(f);
      if (r) results.push(r);
    } catch (e) {
      console.error("FAIL", f, e.message);
    }
  }
}

console.table(results);
const saved = results.reduce((a, r) => a + (r.inKB - r.outKB), 0);
console.log(`\nTotal saved: ${saved} KB across ${results.length} images.`);
