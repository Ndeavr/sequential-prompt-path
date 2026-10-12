import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
import { CallUnproLink } from "@/components/contact/CallUnproLink";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

describe("CallUnproLink", () => {
  it("ouvre exactement le tel natif public et journalise sans PII", () => {
    render(<CallUnproLink context="t" />);
    const a = screen.getByTestId("call-unpro-link");
    expect(a.getAttribute("href")).toBe("tel:+14503286776");
    expect(a.getAttribute("aria-label")).toContain("450-328-6776");
    expect(a.textContent).not.toContain("9522");
    a.click();
    expect(logFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: "call_cta_clicked" }));
  });
});
