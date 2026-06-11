export interface ScenarioData {
  summary?: string;
  risks?: string[];
  gains?: string[];
  projection_5y?: string;
}

export interface TimelinePoint {
  reputation: number;
  visibility: number;
  ai_recommendations: number;
  growth_potential: number;
}

export interface FutureAnalysis {
  id: string;
  company_id: string | null;
  contractor_id: string | null;
  current_score: number | null;
  current_visibility: number | null;
  current_authority: number | null;
  scenario_no_change: ScenarioData;
  scenario_growth: ScenarioData;
  scenario_unpro: ScenarioData;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  timeline_data: {
    now?: TimelinePoint;
    y1?: TimelinePoint;
    y3?: TimelinePoint;
    y5?: TimelinePoint;
  };
  confidence_score: number | null;
  generated_at: string;
}
