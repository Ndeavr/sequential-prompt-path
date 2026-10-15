export interface DesignQuotaNotice {
  current: number;
  limit: number;
  upgradeLabel: string;
  upgradeTarget: string;
  resetsAt: string | null;
}

export function parseDesignQuota(raw: unknown): DesignQuotaNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.quota_exceeded !== true && value.usage_limit !== true) return null;
  const target = value.upgrade_target === "home_signature" ? "home_signature" : "home_plus";
  return {
    current: Number(value.used ?? value.current_count ?? 0),
    limit: Number(value.limit ?? 0),
    upgradeLabel: target === "home_signature" ? "Gold" : "Plus",
    upgradeTarget: target,
    resetsAt: typeof value.resets_at === "string" ? value.resets_at : null,
  };
}
