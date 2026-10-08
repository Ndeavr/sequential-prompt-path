import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { safeRedirectUrl, shouldSkipRedelivery, isSessionPaid } from "../_shared/checkoutGuards.ts";
Deno.test("redirect allowlist", () => {
  assertEquals(safeRedirectUrl("https://unpro.ca/a", "F"), "https://unpro.ca/a");
  assertEquals(safeRedirectUrl("https://attacker.lovable.app/a", "F"), "F");
});
Deno.test("redelivery + paid", () => {
  assertEquals(shouldSkipRedelivery({ processing_status: "failed" }), false);
  assertEquals(shouldSkipRedelivery({ processing_status: "processed" }), true);
  assertEquals(isSessionPaid({ payment_status: "unpaid", status: "complete" }), false);
});
