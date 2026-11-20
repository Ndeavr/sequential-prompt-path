import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke, getSession, openAuthOverlay } = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn(), openAuthOverlay: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, auth: { getSession } } }));
vi.mock("@/hooks/useAuthOverlay", () => ({ openAuthOverlay }));
import { invokeMatchingProfile } from "@/lib/matching/invokeMatchingProfile";
beforeEach(() => { vi.clearAllMocks(); });
describe("matching profile ownership recovery", () => {
  it("keeps guest drafts accessible", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, profile: null }, error: null });
    expect((await invokeMatchingProfile({ action: "get", session_key: "guest_draft" })).data?.ok).toBe(true);
    expect(openAuthOverlay).not.toHaveBeenCalled();
  });
  it("reads the real 401 body, preserves the key, stops signed-out retries and resumes after sign-in", async () => {
    const body = { action: "get", session_key: "owned_draft" };
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ ok: false, error: "authentication_required" }), { status: 401 }) } });
    const rejected = await invokeMatchingProfile(body);
    expect(rejected.data?.error).toBe("authentication_required");
    expect(openAuthOverlay).toHaveBeenCalledWith(expect.objectContaining({ returnPath: window.location.pathname + window.location.search }));
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await invokeMatchingProfile(body);
    expect(invoke).toHaveBeenCalledTimes(1);
    getSession.mockResolvedValueOnce({ data: { session: { user: { id: "isolated-qa" } } }, error: null });
    invoke.mockResolvedValueOnce({ data: { ok: true, profile: { answers: { territories: ["Laval"] } } }, error: null });
    expect((await invokeMatchingProfile(body)).data?.profile.answers.territories).toEqual(["Laval"]);
    expect(invoke).toHaveBeenLastCalledWith("matching-profile", { body });
  });
  it("does not reinterpret a permission refusal as a successful save", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false, error: "profile_access_denied" }, error: null });
    expect((await invokeMatchingProfile({ action: "save", session_key: "other_account" })).data?.ok).toBe(false);
    expect(openAuthOverlay).not.toHaveBeenCalled();
  });
});
describe("background resume of an account-owned draft while signed out", () => {
  it("never opens the sign-in overlay and remembers the refusal for the tab", async () => {
    const body = { action: "get", session_key: "owned_background_draft" };
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ ok: false, error: "authentication_required" }), { status: 401 }) } });
    const first = await invokeMatchingProfile(body, { promptSignIn: false });
    expect(first.data?.error).toBe("authentication_required");
    expect(openAuthOverlay).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem("unpro_matching_blocked_drafts") || "[]")).toContain("owned_background_draft");
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await invokeMatchingProfile(body, { promptSignIn: false });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(openAuthOverlay).not.toHaveBeenCalled();
  });
});
