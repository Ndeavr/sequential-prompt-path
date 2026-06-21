// @content-guard:internal
/**
 * Internal Content Guard — CI scanner.
 *
 * Usage: `npm run content-audit`
 * Exits 1 if any block-severity violation is found.
 */
import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { scanFile, buildReport, type Violation } from "../src/content-guard/scanner";
import { FALLBACK_RULES } from "../src/content-guard/rules";

const ROOTS = ["src/pages", "src/components", "supabase/functions"];
const EXTS = [".tsx", ".ts", ".md", ".html", ".txt"];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

function main() {
  const cwd = process.cwd();
  const files: string[] = [];
  for (const r of ROOTS) walk(join(cwd, r), files);

  const all: Violation[] = [];
  for (const abs of files) {
    const rel = relative(cwd, abs);
    let content = "";
    try { content = readFileSync(abs, "utf8"); } catch { continue; }
    all.push(...scanFile(rel, content, FALLBACK_RULES));
  }

  const report = buildReport(files.length, all);

  try { mkdirSync(join(cwd, ".lovable"), { recursive: true }); } catch {}
  writeFileSync(
    join(cwd, ".lovable/content-audit-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const { violations, blockingCount, warningCount, filesScanned, status } = report;
  console.log(`\nInternal Content Guard — ${status.toUpperCase()}`);
  console.log(`  Files scanned : ${filesScanned}`);
  console.log(`  Blocking      : ${blockingCount}`);
  console.log(`  Warnings      : ${warningCount}\n`);

  for (const v of violations.slice(0, 200)) {
    const tag = v.severity === "block" ? "BLOCK" : "WARN ";
    console.log(`  [${tag}] ${v.file}:${v.line}:${v.column}  «${v.pattern}»  (${v.category})`);
    console.log(`           ${v.snippet}`);
  }
  if (violations.length > 200) console.log(`  …and ${violations.length - 200} more.\n`);

  process.exit(blockingCount > 0 ? 1 : 0);
}

main();
