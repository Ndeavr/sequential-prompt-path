/**
 * UNPRO — Counter Engine
 * Pure calculation logic for the Quebec AI Impact counter.
 * All times in America/Montreal timezone.
 */

export interface CounterModelConfig {
  launchDate: string; // ISO 8601
  baseSavedSubmissionsPerDay: number;
  weeklyGrowthRate: number;
  dayWindowStart: number; // hour 0-23
  dayWindowEnd: number;   // hour 0-23
  daySpeedMultiplier: number;
  nightSpeedMultiplier: number;
  hoursSavedPerSubmission: number;
  adSavingsPerSubmissionCad: number;
}

export interface CounterSnapshot {
  savedSubmissions: number;
  hoursSaved: number;
  adSavingsCad: number;
  perSecondRate: number;
  isDaytime: boolean;
}

export const SCENARIO_CONFIGS: Record<string, CounterModelConfig> = {
  prudent: {
    launchDate: "2026-01-01T00:00:00-05:00",
    baseSavedSubmissionsPerDay: 180,
    weeklyGrowthRate: 0.012,
    dayWindowStart: 7,
    dayWindowEnd: 22,
    daySpeedMultiplier: 1.85,
    nightSpeedMultiplier: 0.55,
    hoursSavedPerSubmission: 1.5,
    adSavingsPerSubmissionCad: 22,
  },
  realiste: {
    launchDate: "2026-01-01T00:00:00-05:00",
    baseSavedSubmissionsPerDay: 300,
    weeklyGrowthRate: 0.02,
    dayWindowStart: 7,
    dayWindowEnd: 22,
    daySpeedMultiplier: 1.85,
    nightSpeedMultiplier: 0.55,
    hoursSavedPerSubmission: 1.75,
    adSavingsPerSubmissionCad: 28,
  },
  agressif: {
    launchDate: "2026-01-01T00:00:00-05:00",
    baseSavedSubmissionsPerDay: 420,
    weeklyGrowthRate: 0.03,
    dayWindowStart: 7,
    dayWindowEnd: 22,
    daySpeedMultiplier: 1.85,
    nightSpeedMultiplier: 0.55,
    hoursSavedPerSubmission: 1.9,
    adSavingsPerSubmissionCad: 34,
  },
};

const MS_PER_WEEK = 7 * 24 * 3600 * 1000;
const MS_PER_DAY = 24 * 3600 * 1000;

/** Get the current Montreal hour (0-23) */
function getMontrealHour(now: Date): number {
  const str = now.toLocaleString("en-US", { timeZone: "America/Montreal", hour: "numeric", hour12: false });
  return parseInt(str, 10);
}

/** Compute daily volume for a given day offset from launch */
function dailyVolume(cfg: CounterModelConfig, weeksSinceLaunch: number): number {
  return cfg.baseSavedSubmissionsPerDay * Math.pow(1 + cfg.weeklyGrowthRate, weeksSinceLaunch);
}

/** Weighted hours in a day */
function weightedHours(cfg: CounterModelConfig): number {
  const dayHours = cfg.dayWindowEnd - cfg.dayWindowStart;
  const nightHours = 24 - dayHours;
  return dayHours * cfg.daySpeedMultiplier + nightHours * cfg.nightSpeedMultiplier;
}

/** Weekend factor (slightly lower on weekends) */
function weekendFactor(dayOfWeek: number): number {
  return dayOfWeek === 0 || dayOfWeek === 6 ? 0.82 : 1.0;
}

/**
 * Compute the cumulative saved submissions from launch to `now`.
 * Uses day-by-day summation for accuracy with growth.
 */
export function computeSnapshot(cfg: CounterModelConfig, now: Date = new Date()): CounterSnapshot {
  const launch = new Date(cfg.launchDate);
  if (now <= launch) {
    return { savedSubmissions: 0, hoursSaved: 0, adSavingsCad: 0, perSecondRate: 0, isDaytime: false };
  }

  const totalMs = now.getTime() - launch.getTime();
  const totalDays = totalMs / MS_PER_DAY;
  const fullDays = Math.floor(totalDays);
  const wh = weightedHours(cfg);

  let cumulative = 0;

  // Sum full completed days
  for (let d = 0; d < fullDays; d++) {
    const dayDate = new Date(launch.getTime() + d * MS_PER_DAY);
    const weeks = d / 7;
    const dow = dayDate.getDay();
    cumulative += dailyVolume(cfg, weeks) * weekendFactor(dow);
  }

  // Partial current day
  const currentDayStart = new Date(launch.getTime() + fullDays * MS_PER_DAY);
  const currentWeeks = fullDays / 7;
  const currentDayVolume = dailyVolume(cfg, currentWeeks) * weekendFactor(now.getDay());
  const montrealHour = getMontrealHour(now);
  const isDaytime = montrealHour >= cfg.dayWindowStart && montrealHour < cfg.dayWindowEnd;
  const currentMultiplier = isDaytime ? cfg.daySpeedMultiplier : cfg.nightSpeedMultiplier;

  // Approximate partial day: assume uniform rate within current period
  const elapsedHoursToday = (now.getTime() - currentDayStart.getTime()) / 3600000;
  // Simplified: proportional share of daily volume based on elapsed weighted hours
  const partialFraction = Math.min(elapsedHoursToday * currentMultiplier / wh, 1);
  cumulative += currentDayVolume * partialFraction;

  const perSecondRate = (currentDayVolume * currentMultiplier / wh) / 3600;

  return {
    savedSubmissions: cumulative,
    hoursSaved: cumulative * cfg.hoursSavedPerSubmission,
    adSavingsCad: cumulative * cfg.adSavingsPerSubmissionCad,
    perSecondRate,
    isDaytime,
  };
}

/** Compute projection at a future date */
export function computeProjection(
  cfg: CounterModelConfig,
  targetDate: Date
): { savedSubmissions: number; hoursSaved: number; adSavingsCad: number } {
  const snap = computeSnapshot(cfg, targetDate);
  return {
    savedSubmissions: snap.savedSubmissions,
    hoursSaved: snap.hoursSaved,
    adSavingsCad: snap.adSavingsCad,
  };
}

/** Format number with space separators (Quebec style) */
export function formatNumberQc(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA");
}

/** Format currency CAD */
export function formatCurrencyQc(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA") + " $";
}
