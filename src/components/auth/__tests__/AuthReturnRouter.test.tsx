import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const navigate = vi.fn();
let currentPath = "/";
let authCb: ((e: string, s: any) => void) | null = null;
let resolveGetSession: (v: any) => void = () => {};
let intentOutcome: any = { role: null, applied: false, failed: false, returnPath: null, source: "none" };
let gateOutcome: Promise<void> | null = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: currentPath }),
}));

const chain = () => {
  const c: any = {
    select: () => c, eq: () => c,
    maybeSingle: async () => ({ data: null }),
    upsert: async () => ({}),
    then: (r: any) => r({ data: [{ role: "contractor" }], error: null }),
  };
  return c;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: any) => { authCb = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
      getSession: () => new Promise((r) => { resolveGetSession = r; }),
    },
    from: () => chain(),
  },
}));
vi.mock("@/services/auth/authIntentService", () => ({
  clearAuthIntent: vi.fn(),
  peekAuthIntent: () => ({ returnPath: "/entrepreneurs/profil", timestamp: Date.now() }),
  getDefaultRedirectForRole: () => "/dashboard",
}));
vi.mock("@/hooks/useAuthOverlay", () => ({ closeAuthOverlay: vi.fn() }));
vi.mock("@/services/auth/trackAuthEvent", () => ({ trackAuthEvent: vi.fn() }));
vi.mock("@/services/auth/authDebugBus", () => ({ authDebug: { error: vi.fn() } }));
vi.mock("@/services/auth/authIntentOrchestrator", () => ({
  resolveAuthIntentOnce: async () => { if (gateOutcome) await gateOutcome; return intentOutcome; },
}));

import AuthReturnRouter from "../AuthReturnRouter";

const user = { id: "u1", email: "a@b.c", user_metadata: {}, app_metadata: {} };
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 10)); }); };

beforeEach(() => {
  navigate.mockReset(); authCb = null; gateOutcome = null;
  intentOutcome = { role: null, applied: false, failed: false, returnPath: null, source: "none" };
});

describe("AuthReturnRouter", () => {
  it("INITIAL_SESSION existing user then SIGNED_IN on /condos/diagnostic → no navigation", async () => {
    currentPath = "/condos/diagnostic";
    render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", { user }));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("SIGNED_IN before getSession resolves (unknown state) → no hijack", async () => {
    currentPath = "/condos/diagnostic";
    render(<AuthReturnRouter />);
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    resolveGetSession({ data: { session: { user } } });
    await flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("fresh overlay login from explicit signed-out → returnPath honored", async () => {
    currentPath = "/condos/diagnostic";
    render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", null));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    expect(navigate).toHaveBeenCalledWith("/entrepreneurs/profil", { replace: true });
  });

  it("route change during successful resolution → no redirect", async () => {
    currentPath = "/condos/diagnostic";
    let release!: () => void; gateOutcome = new Promise((r) => { release = r; });
    const { rerender } = render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", null));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    currentPath = "/condos/onboarding"; rerender(<AuthReturnRouter />);
    release(); await flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("route change during failed resolution → no redirect", async () => {
    currentPath = "/login";
    intentOutcome = { role: "contractor", applied: false, failed: true, returnPath: null, source: "local" };
    let release!: () => void; gateOutcome = new Promise((r) => { release = r; });
    const { rerender } = render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", null));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    currentPath = "/condos/diagnostic"; rerender(<AuthReturnRouter />);
    release(); await flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("unmount during resolution → no redirect", async () => {
    currentPath = "/login";
    let release!: () => void; gateOutcome = new Promise((r) => { release = r; });
    const { unmount } = render(<AuthReturnRouter />);
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    unmount(); release(); await flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("auth surface: re-emitted SIGNED_IN on /login still redirects", async () => {
    currentPath = "/login";
    render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", { user }));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    expect(navigate).toHaveBeenCalledWith("/entrepreneurs/profil", { replace: true });
  });

  it("/auth/callback is left to the callback page", async () => {
    currentPath = "/auth/callback";
    render(<AuthReturnRouter />);
    act(() => authCb!("INITIAL_SESSION", null));
    act(() => authCb!("SIGNED_IN", { user }));
    await flush();
    expect(navigate).not.toHaveBeenCalled();
  });
});
