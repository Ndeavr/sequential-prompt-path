import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const invoke = vi.fn();
const upsert = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: () => ({ upsert: (...args: unknown[]) => upsert(...args) }),
  },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import { resetAuthIntentCache, resolveAuthIntentOnce } from "./authIntentOrchestrator";
import {
  isSelfAssignableRole,
  resolvePublicRoleSelection,
  withIntentToken,
  issueRoleIntentToken,
} from "./crossDeviceRoleIntent";
import { clearRoleIntent, readRoleIntent, saveRoleIntent } from "./roleIntent";

const USER = { id: "user-1", email: "pro@example.com" };

function setUrl(search: string) {
  window.history.replaceState({}, "", `/auth/callback${search}`);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearRoleIntent();
  resetAuthIntentCache();
  rpc.mockReset();
  invoke.mockReset();
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
  setUrl("");
});

describe("public role whitelist", () => {
  it("accepts only homeowner and contractor, with legitimate UI mappings", () => {
    expect(resolvePublicRoleSelection("contractor")).toEqual({ role: "contractor", accountType: "contractor" });
    expect(resolvePublicRoleSelection("professional")).toEqual({ role: "contractor", accountType: "contractor" });
    expect(resolvePublicRoleSelection("condo_manager")).toEqual({ role: "homeowner", accountType: "property_manager" });
    expect(resolvePublicRoleSelection("homeowner")).toEqual({ role: "homeowner", accountType: "homeowner" });
  });

  it("refuses privileged roles coming from the URL or the browser (test G)", () => {
    expect(resolvePublicRoleSelection("admin")).toBeNull();
    expect(resolvePublicRoleSelection("affiliate")).toBeNull();
    expect(resolvePublicRoleSelection("superadmin")).toBeNull();
    expect(isSelfAssignableRole("admin")).toBe(false);
    expect(isSelfAssignableRole("partner")).toBe(false);
  });

  it("explicitly refuses partner/partenaire instead of remapping them to homeowner", () => {
    expect(resolvePublicRoleSelection("partner")).toBeNull();
    expect(resolvePublicRoleSelection("partenaire")).toBeNull();
    expect(resolvePublicRoleSelection("ambassador")).toBeNull();
  });

  it("never mints a token for a privileged role", async () => {
    saveRoleIntent("affiliate");
    const result = await issueRoleIntentToken("x@y.ca", readRoleIntent());
    expect(result).toEqual({ status: "none" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a discriminated failure when the mint RPC fails", async () => {
    saveRoleIntent("contractor");
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await issueRoleIntentToken("pro@example.com", readRoleIntent());
    expect(result).toEqual({ status: "failed", reason: "boom" });
  });

  it("appends the opaque token only, never the email or the role", () => {
    const url = withIntentToken("https://unpro.ca/auth/callback", "abc123");
    expect(url).toBe("https://unpro.ca/auth/callback?ri=abc123");
    expect(url).not.toMatch(/email|contractor|role=/);
  });
});

describe("cross-device magic link", () => {
  it("A/C — applies the contractor intent with no local storage at all", async () => {
    setUrl("?ri=tok-cross-device");
    rpc.mockResolvedValue({
      data: { ok: true, role: "contractor", account_type: "contractor", return_path: "/join/profile", affiliate_ref: null, metadata: {} },
      error: null,
    });
    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-1" }, error: null });

    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ role: "contractor", applied: true, failed: false, source: "server", returnPath: "/join/profile" });
    expect(invoke).toHaveBeenCalledWith("matching-profile", expect.objectContaining({
      body: expect.objectContaining({ action: "activate_account" }),
    }));
  });

  it("I — a second callback/refresh never applies the intent twice", async () => {
    setUrl("?ri=tok-once");
    rpc.mockResolvedValue({ data: { ok: true, role: "contractor", account_type: "contractor", return_path: null, metadata: {} }, error: null });
    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-1" }, error: null });

    const [a, b] = await Promise.all([resolveAuthIntentOnce(USER), resolveAuthIntentOnce(USER)]);
    expect(a.applied && b.applied).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("H — expired / already consumed / email mismatch is refused cleanly", async () => {
    for (const reason of ["intent_expired", "intent_already_consumed", "email_mismatch"]) {
      resetAuthIntentCache();
      sessionStorage.clear();
      setUrl("?ri=tok-bad");
      rpc.mockResolvedValue({ data: { ok: false, reason }, error: null });
      const outcome = await resolveAuthIntentOnce(USER);
      expect(outcome.applied).toBe(false);
      expect(outcome.failed).toBe(true);
      expect(outcome.error).toBe(reason);
      expect(invoke).not.toHaveBeenCalled();
    }
  });

  it("keeps the intent unconsumed when activation fails (test 6)", async () => {
    setUrl("?ri=tok-fail");
    rpc.mockImplementation((fn: string) => {
      if (fn === "consume_auth_role_intent") {
        return Promise.resolve({ data: { ok: true, role: "contractor", account_type: "contractor", metadata: {} }, error: null });
      }
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    invoke.mockResolvedValue({ data: { ok: false, reason: "business_name_required" }, error: null });

    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ applied: false, failed: true, role: "contractor" });
    expect(rpc).toHaveBeenCalledWith("release_auth_role_intent", { _token: "tok-fail" });
  });
});

describe("true single use", () => {
  it("a successful application strips ?ri= so a refresh never re-invokes matching-profile", async () => {
    setUrl("?ri=tok-single");
    rpc.mockImplementation((fn: string) => {
      if (fn === "consume_auth_role_intent") {
        return Promise.resolve({ data: { ok: true, role: "contractor", account_type: "contractor", metadata: {} }, error: null });
      }
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-9" }, error: null });

    const first = await resolveAuthIntentOnce(USER);
    expect(first.applied).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(window.location.search).not.toContain("ri=");
    expect(sessionStorage.getItem("unpro_role_intent_token")).toBeNull();

    // Real refresh: cache reset, URL re-read from scratch.
    resetAuthIntentCache();
    const second = await resolveAuthIntentOnce(USER);
    expect(second.source).toBe("none");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("refuses a token the server reports as already consumed", async () => {
    setUrl("?ri=tok-used");
    rpc.mockResolvedValue({ data: { ok: false, reason: "intent_already_consumed" }, error: null });
    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ applied: false, failed: true, error: "intent_already_consumed" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("releases on application failure and lets a retry succeed", async () => {
    setUrl("?ri=tok-retry");
    rpc.mockImplementation((fn: string) => {
      if (fn === "consume_auth_role_intent") {
        return Promise.resolve({ data: { ok: true, role: "contractor", account_type: "contractor", metadata: {} }, error: null });
      }
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    invoke.mockResolvedValueOnce({ data: { ok: false, reason: "transient" }, error: null });

    const failed = await resolveAuthIntentOnce(USER);
    expect(failed).toMatchObject({ applied: false, failed: true, role: "contractor" });
    expect(rpc).toHaveBeenCalledWith("release_auth_role_intent", { _token: "tok-retry" });
    expect(window.location.search).toContain("ri=");

    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-10" }, error: null });
    const retry = await resolveAuthIntentOnce(USER);
    expect(retry.applied).toBe(true);
  });
});

describe("same-device intent", () => {
  it("D — the SMS same-device path keeps the local intent and uses the same orchestrator", async () => {
    saveRoleIntent("contractor", { returnPath: "/join/profile" });
    expect(readRoleIntent()?.role).toBe("contractor");
    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-sms" }, error: null });

    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ role: "contractor", applied: true, failed: false, source: "local" });
    expect(invoke).toHaveBeenCalledWith("matching-profile", expect.objectContaining({
      body: expect.objectContaining({ action: "activate_account" }),
    }));
    expect(rpc).not.toHaveBeenCalledWith("consume_auth_role_intent", expect.anything());
  });

  it("B — a stored contractor intent (same browser) is applied", async () => {
    saveRoleIntent("contractor", { returnPath: "/join/profile" });
    invoke.mockResolvedValue({ data: { ok: true, contractor_id: "c-2" }, error: null });

    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ role: "contractor", applied: true, source: "local" });
    expect(readRoleIntent()).toBeNull();
  });

  it("returns a no-op outcome when there is no intent at all", async () => {
    const outcome = await resolveAuthIntentOnce(USER);
    expect(outcome).toMatchObject({ role: null, applied: false, failed: false, source: "none" });
  });
});
