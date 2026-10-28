import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/aiVisibilityLanding/AiVisibilityLeadForm.tsx", "utf8");

describe("AI visibility lead form — minimize PII in attribution events", () => {
  it("still sends the contact details to the canonical CRM edge function", () => {
    expect(source).toContain('supabase.functions.invoke("visibilite-ia-lead"');
    expect(source).toMatch(/body:\s*\{\s*\.\.\.parsed\.data,/);
  });

  it("emits only non-contact funnel metadata for successful submissions", () => {
    const eventBlock = source.match(/logFunnelEvent\(\{\s*event_type:\s*"ai_visibility_form_submitted",([\s\S]*?)\n\s*\}\);/);
    expect(eventBlock).not.toBeNull();
    expect(eventBlock![1]).not.toMatch(/\b(?:phone|email)\s*:/);
    expect(eventBlock![1]).toContain("duplicate:");
  });
});
