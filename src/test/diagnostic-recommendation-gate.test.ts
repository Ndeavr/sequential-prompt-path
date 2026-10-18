import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
describe("diagnostic-analyze — recommandations", () => {
  it("n'inclut que des entrepreneurs verified_active", () => {
    const src = readFileSync("supabase/functions/diagnostic-analyze/index.ts", "utf8");
    const block = src.slice(src.indexOf('.from("contractors")'), src.indexOf(".limit(3)"));
    expect(block).toContain('.eq("public_status", "verified_active")');
  });
});
