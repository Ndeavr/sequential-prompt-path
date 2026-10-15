type RoleClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

/** Only an authenticated user id and a verified database role can grant exemption. */
export async function isQuotaAdmin(client: RoleClient, authenticatedUserId: string): Promise<boolean> {
  try {
    const { data, error } = await client.rpc("has_role", { _user_id: authenticatedUserId, _role: "admin" });
    return !error && data === true;
  } catch { return false; }
}

export const ADMIN_QUOTA = {
  allowed: true, unlimited: true, limit: null, used: 0, remaining: -1,
  planCode: "admin", upgradeTarget: null, blockedBy: null,
} as const;
