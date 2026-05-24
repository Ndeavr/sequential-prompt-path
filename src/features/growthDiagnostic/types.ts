export type SharedLeads = "yes" | "no" | "sometimes";

export type BusinessType =
  | "roofing" | "insulation" | "hvac" | "electrical" | "landscaping"
  | "plumbing" | "renovation" | "painting" | "flooring" | "other";

export interface DiagnosticInputs {
  business_type?: BusinessType;
  city?: string;
  team_size?: number;
  sales_reps?: number;
  trucks?: number;
  monthly_projects?: number;
  annual_revenue?: number;
  avg_contract_value?: number;
  monthly_appointments?: number;
  monthly_leads?: number;
  closing_rate?: number;
  seasonality?: string;
  uses_shared_leads?: SharedLeads;
}

export type DiagnosticStep =
  | "hero" | "business_type" | "location" | "team" | "revenue"
  | "shared_leads" | "diagnosis" | "plan";

export interface DiagnosticResult {
  loss_monthly: number;
  loss_breakdown: {
    missed_leads: number;
    shared_leads_tax: number;
    capacity_gap: number;
  };
  projected_revenue: number;
  current_revenue: number;
  uplift_pct: number;
  recommended_plan: "Recrue" | "Pro" | "Premium" | "Élite" | "Signature";
  plan_reason: string;
}

export type BubbleCategory = "insight" | "loss" | "opportunity" | "social_proof";

export interface Bubble {
  id: string;
  category: BubbleCategory;
  title: string;
  detail: string;
  value_numeric?: number;
  formatted_value?: string;
}
