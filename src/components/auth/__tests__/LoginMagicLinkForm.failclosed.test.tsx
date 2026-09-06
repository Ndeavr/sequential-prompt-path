import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const rpc = vi.fn();
const signInWithOtp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { signInWithOtp: (...args: unknown[]) => signInWithOtp(...args) },
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import LoginMagicLinkForm from "../LoginMagicLinkForm";
import { clearRoleIntent, saveRoleIntent } from "@/services/auth/roleIntent";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearRoleIntent();
  rpc.mockReset();
  signInWithOtp.mockReset();
  signInWithOtp.mockResolvedValue({ error: null });
});

async function submit(email: string) {
  render(<LoginMagicLinkForm />);
  const input = screen.getByPlaceholderText("votre@courriel.com");
  fireEvent.change(input, { target: { value: email } });
  fireEvent.submit(input.closest("form")!);
}

describe("magic link fail-closed on role intent", () => {
  it("does NOT send the link when a valid contractor intent could not be tokenized", async () => {
    saveRoleIntent("contractor", { returnPath: "/join/profile" });
    rpc.mockResolvedValue({ data: null, error: { message: "rpc down" } });

    await submit("pro@example.com");

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the link with the opaque token when the intent is tokenized", async () => {
    saveRoleIntent("contractor");
    rpc.mockResolvedValue({ data: { ok: true }, error: null });

    await submit("pro@example.com");

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalled());
    const options = signInWithOtp.mock.calls[0][0].options as { emailRedirectTo: string };
    expect(options.emailRedirectTo).toMatch(/[?&]ri=/);
    expect(options.emailRedirectTo).not.toMatch(/contractor|pro@example/);
  });

  it("sends the link normally when there is no public intent at all", async () => {
    await submit("someone@example.com");

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalled());
    expect(rpc).not.toHaveBeenCalled();
    const options = signInWithOtp.mock.calls[0][0].options as { emailRedirectTo: string };
    expect(options.emailRedirectTo).not.toMatch(/[?&]ri=/);
  });
});
