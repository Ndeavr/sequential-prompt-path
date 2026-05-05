export interface VisualStyleOption {
  id: string;
  label: string;
  bullets: string[];
  after_image_url: string | null;
}

export interface VisualStylesResponse {
  detected_area: string;
  project_type: string;
  recommended_trade: string;
  intro_text: string;
  original_image_url: string;
  styles: VisualStyleOption[];
}

/** Card injected as an Alex action — rendered inline in the chat. */
export interface AlexAction {
  id: string;
  type:
    | "upload_zone"
    | "visual_style_comparison"
    | "before_after"
    | "recommended_pro"
    | "contractor_intake"
    | "contractor_growth_dashboard"
    | "contractor_plan_table"
    | "contractor_growth_path"
    | "contractor_checkout";
  payload?: any;
}
