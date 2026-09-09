/**
 * Autonomy policy guardrails.
 * Routine work runs alone; material changes must become approval cards.
 * Unknown actions FAIL CLOSED to approval.
 */
import { describe, it, expect } from "vitest";
import {
  classifyAction, approvalKindFor, AUTONOMOUS_ACTIONS, APPROVAL_ACTIONS,
} from "../../supabase/functions/_shared/autonomyPolicy.ts";

describe("autonomy policy", () => {
  it("classifies every routine action as autonomous", () => {
    for (const a of AUTONOMOUS_ACTIONS) {
      expect(classifyAction(a)).toBe("autonomous");
    }
  });

  it("classifies every material action as requiring approval", () => {
    for (const a of APPROVAL_ACTIONS) {
      expect(classifyAction(a)).toBe("requires_approval");
    }
  });

  it("fails closed on unknown actions", () => {
    expect(classifyAction("some_brand_new_capability")).toBe("requires_approval");
    expect(classifyAction("")).toBe("requires_approval");
  });

  it("never lets a new agent ship autonomously", () => {
    expect(classifyAction("new_agent")).toBe("requires_approval");
    expect(approvalKindFor("new_agent")).toBe("new_agent");
  });

  it("maps material actions to a stable approval kind", () => {
    expect(approvalKindFor("new_message_copy")).toBe("message");
    expect(approvalKindFor("pricing_change")).toBe("pricing");
    expect(approvalKindFor("unknown_thing")).toBe("other");
  });
});
