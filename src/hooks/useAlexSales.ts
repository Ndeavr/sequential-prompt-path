/**
 * UNPRO — useAlexSales Hook
 * Fetches AI sales analysis for the current contractor.
 */
import { useState, useCallback } from "react";
import { useContractorProfile, useContractorReviews } from "./useContractor";
import { useAppointments } from "./useAppointments";
import { useAuth } from "./useAuth";

export interface SalesAnalysis {
  diagnosis: string;
  impact_statement: string;
  missed_opportunities: number;
  estimated_monthly_loss_cad: number;
  recommended_plan: string;
  recommended_plan_reason: string;
  priority_actions: string[];
  confidence: number;
  sales_message: string;
  objection_handler: string;
}

export function useAlexSales() {
  const { user } = useAuth();
  const { data: profile } = useContractorProfile();
  const { data: reviews } = useContractorReviews();
  const { data: appointments } = useAppointments();

  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildContext = useCallback(() => {
    if (!profile) return null;
    const fields = [
      profile.business_name, profile.specialty, profile.description,
      profile.phone, profile.email, profile.city, profile.license_number,
      profile.insurance_info, profile.logo_url, profile.website,
    ];
    const filled = fields.filter(Boolean).length;
    const completeness = Math.round((filled / fields.length) * 100);
    const missing: string[] = [];
    if (!profile.business_name) missing.push("nom entreprise");
    if (!profile.specialty) missing.push("spécialité");
    if (!profile.description) missing.push("description");
    if (!profile.phone) missing.push("téléphone");
    if (!profile.email) missing.push("email");
    if (!profile.city) missing.push("ville");
    if (!profile.license_number) missing.push("licence RBQ");
    if (!profile.insurance_info) missing.push("assurance");
    if (!profile.logo_url) missing.push("logo");
    if (!profile.website) missing.push("site web");

    const appts = appointments ?? [];
    return {
      business_name: profile.business_name,
      specialty: profile.specialty,
      city: profile.city,
      aipp_score: profile.aipp_score,
      rating: profile.rating,
      review_count: reviews?.length ?? 0,
      completeness,
      plan: "recrue",
      license_number: profile.license_number,
      insurance_info: profile.insurance_info,
      logo_url: profile.logo_url,
      website: profile.website,
      years_experience: profile.years_experience,
      missing_fields: missing,
      new_appointments: appts.filter((a: any) => a.status === "requested" || a.status === "under_review").length,
      completed_appointments: appts.filter((a: any) => a.status === "completed").length,
    };
  }, [profile, reviews, appointments]);

  const analyze = useCallback(async () => {
    const ctx = buildContext();
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-sales-analyzer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ contractorContext: ctx }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur d'analyse");
      }

      const data: SalesAnalysis = await resp.json();
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  }, [buildContext]);

  return { analysis, isLoading, error, analyze, hasProfile: !!profile };
}
