/**
 * UNPRO Smart Context Engine — types
 * Every strategic field/setting/metric resolves to a SmartContextEntry.
 */

export type AiVisibilityImpact = "high" | "medium" | "low" | "none";

export type SmartRecommendationKind =
  | "recommended"
  | "not_recommended"
  | "upgrade"
  | "opportunity"
  | "high_demand"
  | "visibility"
  | "capacity_warning";

export interface SmartRecommendation {
  kind: SmartRecommendationKind;
  value?: string | number;
  reasonFr: string;
  source: "ai" | "benchmark" | "territory" | "goal";
}

export interface SmartContextEntry {
  /** Stable dotted id, e.g. "territory.radius_km" */
  id: string;
  /** Short human label, fr-CA */
  label: string;
  /** WHAT IS THIS? — one phrase */
  what: string;
  /** WHY DOES IT MATTER? — revenue/visibility angle */
  why: string;
  /** Money/conversion impact phrasing */
  moneyImpact?: string;
  /** What happens if enabled / chosen */
  ifEnabled?: string;
  /** Warning copy when relevant */
  warning?: string;
  /** AI / benchmark recommendation */
  recommendation?: SmartRecommendation;
  /** AI visibility impact tag */
  aiVisibilityImpact?: AiVisibilityImpact;
  /** Dynamic examples (city / trade aware) */
  examples?: string[];
  /** What Alex should SAY (strategist tone), never the label */
  alexScript?: string;
}

export interface SmartContextRuntime {
  cityName?: string | null;
  tradeSlug?: string | null;
  capacity?: number | null;
  goal?: string | null;
  currentValue?: string | number | null;
}

export type GoalKey =
  | "few_projects"
  | "fill_schedule"
  | "grow_fast"
  | "less_travel"
  | "bigger_contracts"
  | "dominate_territory"
  | "optimize_team";

export interface GoalOption {
  key: GoalKey;
  labelFr: string;
  subFr: string;
  emoji: string;
}
