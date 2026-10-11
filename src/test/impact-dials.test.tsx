import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeImpactCounter from "@/components/impact-counter/HomeImpactCounter";
import { impactAnimationProgress, impactScenario } from "@/lib/impactScenario";
import type { ImpactSnapshot } from "@/hooks/useImpactSnapshot";

const state = vi.hoisted(() => ({ data: null as ImpactSnapshot | null }));
vi.mock("@/hooks/useImpactSnapshot", () => ({ useImpactSnapshot: () => ({ data: state.data }), fmtHours: (n: number) => `${n.toLocaleString("fr-CA")} h` }));
const snapshot = { homeowner_hours_per_match: 1.5, contractor_hours_per_match: 2, assumptions: "Deux démarches supplémentaires évitées, estimation non mesurée.", hours_saved: 7000, eligible_matches: 2000, dollars_saved: 99999 } as ImpactSnapshot;
let enter: IntersectionObserverCallback;
let frames: FrameRequestCallback[];
let reduced = false;
const disconnect = vi.fn();
beforeEach(() => {
  state.data = snapshot;
  frames = [];
  reduced = false;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(cb: IntersectionObserverCallback) { enter = cb; }
    observe() {} disconnect = disconnect;
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { frames.push(cb); return frames.length; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter><HomeImpactCounter /></MemoryRouter>);
const visible = () => act(() => enter([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
const tick = (now: number) => act(() => { const next = frames.shift(); next?.(now); });
const value = () => document.querySelector('[data-impact-value="Temps total potentiel"]')?.textContent;

describe("honest impact instruments", () => {
  it("uses only per-journey hypotheses, not appointment or money aggregates", () => {
    expect(impactScenario(snapshot)?.total).toBe(3.5);
    expect(impactScenario(null)).toBeNull();
    expect(impactScenario({ ...snapshot, homeowner_hours_per_match: NaN })).toBeNull();
    expect(impactScenario({ ...snapshot, contractor_hours_per_match: -1 })).toBeNull();
    expect(impactScenario({ ...snapshot, assumptions: "" })).toBeNull();
  });
  it("eases monotonically from zero to a stable target in two seconds", () => {
    expect(impactAnimationProgress(0)).toBe(0);
    expect(impactAnimationProgress(1000)).toBe(0.875);
    expect(impactAnimationProgress(2000)).toBe(1);
    expect(impactAnimationProgress(999999)).toBe(1);
  });
  it("waits for visibility, sweeps once and never disappears or repeats on scroll", () => {
    mount();
    expect(value()).toContain("0,0");
    expect(frames).toHaveLength(0);
    visible(); tick(0); tick(1000);
    expect(value()).toContain("3,1");
    tick(2000);
    expect(value()).toContain("3,5");
    expect(frames).toHaveLength(0);
    visible();
    expect(frames).toHaveLength(0);
    expect(screen.getByRole("link", { name: /Comment nous calculons/ })).toHaveAttribute("href", "/impact#calcul");
    expect(document.body.textContent).not.toMatch(/7000|2000|99999|rendez-vous confirmés|calculé le|formule v/);
  });
  it("starts afresh on a new visit", () => {
    const first = mount(); visible(); tick(0); tick(2000);
    first.unmount(); mount();
    expect(value()).toContain("0,0");
  });
  it("does not reset when a refreshed snapshot only changes aggregates", () => {
    const view = mount(); visible(); tick(0); tick(2000);
    state.data = { ...snapshot, hours_saved: 999999 };
    view.rerender(<MemoryRouter><HomeImpactCounter /></MemoryRouter>);
    expect(value()).toContain("3,5");
    expect(frames).toHaveLength(0);
  });
  it("shows stable accessible targets without frame announcements and respects reduced motion", () => {
    reduced = true; mount(); visible();
    expect(value()).toContain("3,5");
    expect(frames).toHaveLength(0);
    expect(screen.getByText("3,5 h, estimation par parcours type")).toBeInTheDocument();
    expect(document.querySelector("dl")?.hasAttribute("aria-live")).toBe(false);
  });
  it("fails closed and animates only after hypotheses arrive", () => {
    state.data = null;
    const view = mount(); visible();
    expect(screen.getByRole("status")).toHaveTextContent("Données en consolidation");
    expect(frames).toHaveLength(0);
    state.data = snapshot;
    view.rerender(<MemoryRouter><HomeImpactCounter /></MemoryRouter>);
    tick(0); tick(2000);
    expect(value()).toContain("3,5");
  });
  it("has a no-observer fallback and cleans up animation on exit", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const view = mount();
    expect(frames).toHaveLength(1);
    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});