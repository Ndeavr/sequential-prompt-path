/**
 * ONE CLARA — contrat de continuité conversationnelle.
 * Autorité canonique : alex_sessions + alex_messages (via `clara-session`).
 * Couvre : create → write → refresh → resume → reopen → auth.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}));

import {
  appendClaraMessage,
  getClaraSessionToken,
  peekClaraSessionToken,
  promoteClaraSession,
  rememberClaraArtifact,
  saveClaraContext,
  startOrResumeClaraSession,
} from "../claraSession";

const sessionState = (overrides: Record<string, unknown> = {}) => ({
  data: {
    session_id: "sess-1",
    session_token: "tok-1",
    auth_state: "guest",
    current_step: "start",
    language: "fr",
    role: null,
    last_intent: null,
    project_type: null,
    project_city: null,
    recommended_contractor_id: null,
    context: {},
    messages: [],
    resumed: false,
    ...overrides,
  },
  error: null,
});

describe("Clara canonical session continuity", () => {
  beforeEach(() => {
    invoke.mockReset();
    localStorage.clear();
  });

  it("creates one stable browser token and reuses it on refresh / reopen", async () => {
    invoke.mockResolvedValue(sessionState());
    await startOrResumeClaraSession();
    const first = peekClaraSessionToken();
    expect(first).toBe("tok-1");

    await startOrResumeClaraSession();
    expect(peekClaraSessionToken()).toBe("tok-1");
    expect(invoke.mock.calls[1][1].body).toMatchObject({ action: "start", session_token: "tok-1" });
  });

  it("generates a token before the first server call", () => {
    const token = getClaraSessionToken();
    expect(token).toBeTruthy();
    expect(getClaraSessionToken()).toBe(token);
  });

  it("restores previously written messages on resume", async () => {
    invoke.mockResolvedValue(
      sessionState({
        resumed: true,
        messages: [{ id: "m1", role: "user", text: "Ma toiture coule" }],
      }),
    );
    const state = await startOrResumeClaraSession();
    expect(state.resumed).toBe(true);
    expect(state.messages[0].text).toBe("Ma toiture coule");
  });

  it("writes messages idempotently with a client message id", async () => {
    invoke.mockResolvedValue(sessionState());
    await startOrResumeClaraSession();
    invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await appendClaraMessage({ role: "user", text: "Bonjour", clientMessageId: "c-1" });
    expect(invoke.mock.calls.at(-1)?.[1].body).toMatchObject({
      action: "append",
      role: "user",
      client_message_id: "c-1",
    });
  });

  it("does not write when there is no conversation token yet", async () => {
    await appendClaraMessage({ role: "user", text: "Bonjour" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("stores only business references in the conversation context", async () => {
    invoke.mockResolvedValue(sessionState());
    await startOrResumeClaraSession();
    invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await saveClaraContext({ active_project_id: "p-1" });
    expect(invoke.mock.calls.at(-1)?.[1].body).toMatchObject({
      action: "context",
      patch: { active_project_id: "p-1" },
    });

    await rememberClaraArtifact("quote_analysis_ids", "qa-1");
    expect(invoke.mock.calls.at(-1)?.[1].body.patch).toEqual({ quote_analysis_ids: ["qa-1"] });
  });

  it("promotes the guest conversation to the account after authentication", async () => {
    invoke.mockResolvedValue(sessionState());
    await startOrResumeClaraSession();
    invoke.mockResolvedValue(sessionState({ auth_state: "authenticated", resumed: true }));

    const state = await promoteClaraSession();
    expect(invoke.mock.calls.at(-1)?.[1].body).toMatchObject({ action: "promote", session_token: "tok-1" });
    expect(state?.auth_state).toBe("authenticated");
  });

  it("does nothing on promotion when no conversation exists", async () => {
    await expect(promoteClaraSession()).resolves.toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});
