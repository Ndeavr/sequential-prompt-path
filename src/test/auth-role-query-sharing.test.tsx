import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
const mocks = vi.hoisted(() => ({ session: { user: { id: "role-owner", email: "qa@example.test" } }, reads: 0, role: "contractor", failure: false }));
vi.mock("@/stores/authSessionStore", () => ({ useAuthSession: () => ({ session: mocks.session, loading: false }), forceClearAuthSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() }, from(table: string) { const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => ({ data: { id: "profile" }, error: null }), then(resolve: (value: unknown) => void) { if (table === "user_roles") mocks.reads++; return Promise.resolve(mocks.failure ? { data: null, error: new Error("role unavailable") } : { data: [{ role: mocks.role }], error: null }).then(resolve); } }; return q; } } }));
function Consumer({ id }: { id: number }) { const auth = useAuth(); return <span data-testid={`role-${id}`}>{auth.role ?? "unresolved"}</span>; }
function Group({ count }: { count: number }) { return <>{Array.from({ length: count }, (_, i) => <Consumer key={i} id={i} />)}</>; }
beforeEach(() => { mocks.reads = 0; mocks.role = "contractor"; mocks.failure = false; mocks.session = { user: { id: "role-owner", email: "qa@example.test" } }; });
describe("shared user role query", () => {
  it("shares one read across profile/layout consumers and new mounts", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const result = render(<QueryClientProvider client={client}><Group count={6} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText("contractor")).toHaveLength(6));
    expect(mocks.reads).toBe(1);
    result.rerender(<QueryClientProvider client={client}><Group count={12} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText("contractor")).toHaveLength(12));
    expect(mocks.reads).toBe(1);
    // A server-side role change still invalidates immediately, even in the shared grace period.
    mocks.role = "partner";
    await client.invalidateQueries({ queryKey: ["user-role"] });
    await waitFor(() => expect(screen.getAllByText("partner")).toHaveLength(12));
    expect(mocks.reads).toBe(2);
    // A different user gets their own read, never the previous identity's roles.
    mocks.session = { user: { id: "another-owner", email: "other@example.test" } };
    mocks.role = "homeowner";
    result.rerender(<QueryClientProvider client={client}><Group count={12} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText("homeowner")).toHaveLength(12));
    expect(mocks.reads).toBe(3);
  });
  it("does not invent a role when the server read fails", async () => {
    mocks.failure = true;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Consumer id={0} /></QueryClientProvider>);
    await waitFor(() => expect(mocks.reads).toBe(1));
    expect(screen.getByTestId("role-0").textContent).toBe("unresolved");
    expect(client.getQueryData(["user-role", "role-owner"])).toBeUndefined();
  });
});
