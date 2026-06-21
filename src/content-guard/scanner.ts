// @content-guard:internal
/**
 * Internal Content Guard — file scanner (pure, no I/O).
 *
 * Given a file's text + path + rule set, returns the list of violations.
 * Used by `scripts/content-audit.ts` and the admin cockpit.
 */
import { FALLBACK_RULES, INTERNAL_HEADER, WHITELISTED_PATHS, type ContentRule } from "./rules";

export interface Violation {
  file: string;
  line: number;
  column: number;
  snippet: string;
  pattern: string;
  severity: "block" | "warn";
  category: string;
  description: string;
}

export function isWhitelisted(filePath: string, content: string): boolean {
  if (content.slice(0, 400).includes(INTERNAL_HEADER)) return true;
  return WHITELISTED_PATHS.some((w) => filePath.includes(w));
}

function compileRule(rule: ContentRule): RegExp {
  if (rule.matchType === "regex") return new RegExp(rule.pattern, "gi");
  const escaped = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "gi");
}

export function scanFile(
  filePath: string,
  content: string,
  rules: ContentRule[] = FALLBACK_RULES,
): Violation[] {
  if (isWhitelisted(filePath, content)) return [];
  const violations: Violation[] = [];
  const lines = content.split("\n");

  for (const rule of rules) {
    const re = compileRule(rule);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: i + 1,
          column: m.index + 1,
          snippet: line.trim().slice(0, 180),
          pattern: rule.pattern,
          severity: rule.severity,
          category: rule.category,
          description: rule.description,
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  return violations;
}

export interface AuditReport {
  ranAt: string;
  filesScanned: number;
  violations: Violation[];
  blockingCount: number;
  warningCount: number;
  status: "ok" | "warn" | "fail";
}

export function buildReport(filesScanned: number, violations: Violation[]): AuditReport {
  const blockingCount = violations.filter((v) => v.severity === "block").length;
  const warningCount = violations.filter((v) => v.severity === "warn").length;
  const status: AuditReport["status"] = blockingCount > 0 ? "fail" : warningCount > 0 ? "warn" : "ok";
  return {
    ranAt: new Date().toISOString(),
    filesScanned,
    violations,
    blockingCount,
    warningCount,
    status,
  };
}
