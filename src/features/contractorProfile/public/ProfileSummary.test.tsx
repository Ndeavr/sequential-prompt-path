import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProfileSummary, { areaLabel, profileStatus } from "./ProfileSummary";

describe("ProfileSummary", () => {
  it("shows a status only for real public_status values", () => {
    expect(profileStatus("verified_active")?.label).toBe("Vérifié par UNPRO");
    expect(profileStatus("published_pending_verification", "en")?.label).toBe("Verification in progress");
    expect(profileStatus("published")).toBeNull();
    expect(profileStatus(null)).toBeNull();
  });

  it("summarises service areas without inventing cities", () => {
    expect(areaLabel("Laval", 13)).toBe("Laval + 12 autres villes");
    expect(areaLabel("Laval", 1)).toBe("Laval");
    expect(areaLabel(null, 0)).toBeNull();
  });

  it("public mode: one Clara CTA, call/text only with a phone, max 3 chips", () => {
    const onPrimary = vi.fn();
    const { rerender } = render(<ProfileSummary name="Test Synthétique" chips={["A", "B", "C", "D"]} phone="(514) 555-0100" onPrimary={onPrimary} />);
    fireEvent.click(screen.getByRole("button", { name: /Vérifier avec Clara/ }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Appeler/ }).getAttribute("href")).toBe("tel:5145550100");
    expect(screen.getByRole("link", { name: /Texto/ }).getAttribute("href")).toBe("sms:5145550100");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByTestId("profile-status")).toBeNull();
    rerender(<ProfileSummary name="Test Synthétique" onPrimary={onPrimary} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("preview mode has no nested interactive controls", () => {
    render(<ProfileSummary preview name="Test" phone="5145550100" lang="en" publicStatus="verified_active" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("profile-status").textContent).toContain("Verified by UNPRO");
  });
});
