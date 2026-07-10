/**
 * UNPRO — Feature Freeze Gate
 * New feature work is paused until these thresholds are all green.
 * Purely informational — no route blocking.
 */
import { useOutreachFunnel, useFirstRevenueSnapshot } from "@/hooks/useOutreachCommandCenter";

export interface FreezeThreshold {
  key: string;
  label: string;
  target: string;
  value: number;
  target_value: number;
  passing: boolean;
}

export interface FreezeStatus {
  frozen: boolean;
  thresholds: FreezeThreshold[];
}

export const FREEZE_THRESHOLDS = {
  sms_delivered_rate: 90,
  click_rate: 5,
  registration_rate: 2,
  paid_activations_7d: 3,
} as const;

export function useFeatureFreezeStatus(): FreezeStatus {
  const funnel = useOutreachFunnel().data ?? [];
  const revenue = useFirstRevenueSnapshot().data;

  const byKey = new Map(funnel.map(f => [f.stage_key, f]));
  const sent = byKey.get("sms_sent")?.total ?? 0;
  const delivered = byKey.get("sms_delivered")?.total ?? 0;
  const clicked = byKey.get("clicked")?.total ?? 0;
  const registered = byKey.get("registration_started")?.total ?? 0;
  const activated7d = revenue?.activations_7d ?? 0;

  const smsRate = sent > 0 ? (delivered / sent) * 100 : 0;
  const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
  const regRate = clicked > 0 ? (registered / clicked) * 100 : 0;

  const thresholds: FreezeThreshold[] = [
    {
      key: "sms_delivered_rate",
      label: "Taux de livraison SMS",
      target: "≥ 90 %",
      value: Math.round(smsRate * 10) / 10,
      target_value: FREEZE_THRESHOLDS.sms_delivered_rate,
      passing: smsRate >= FREEZE_THRESHOLDS.sms_delivered_rate,
    },
    {
      key: "click_rate",
      label: "Taux de clic",
      target: "≥ 5 %",
      value: Math.round(clickRate * 10) / 10,
      target_value: FREEZE_THRESHOLDS.click_rate,
      passing: clickRate >= FREEZE_THRESHOLDS.click_rate,
    },
    {
      key: "registration_rate",
      label: "Taux d'inscription",
      target: "≥ 2 %",
      value: Math.round(regRate * 10) / 10,
      target_value: FREEZE_THRESHOLDS.registration_rate,
      passing: regRate >= FREEZE_THRESHOLDS.registration_rate,
    },
    {
      key: "paid_activations_7d",
      label: "Activations payantes (7j)",
      target: "≥ 3",
      value: activated7d,
      target_value: FREEZE_THRESHOLDS.paid_activations_7d,
      passing: activated7d >= FREEZE_THRESHOLDS.paid_activations_7d,
    },
  ];

  return {
    frozen: thresholds.some(t => !t.passing),
    thresholds,
  };
}
