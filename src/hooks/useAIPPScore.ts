/**
 * UNPRO — useAIPPScore Hook
 * Computes AIPP score from live contractor data.
 */

import { useMemo } from "react";
import { useContractorProfile, useContractorReviews, useContractorDocuments } from "./useContractor";
import { useContractorAppointments } from "./useAppointments";
import { computeAIPPScore, type AIPPResult, type AIPPInput } from "@/services/aippScoreService";

export const useContractorAIPPComputed = () => {
  const { data: profile, isLoading: profileLoading } = useContractorProfile();
  const { data: reviews, isLoading: reviewsLoading } = useContractorReviews();
  const { data: docs, isLoading: docsLoading } = useContractorDocuments();
  const { data: appointments, isLoading: apptsLoading } = useAppointments();

  const isLoading = profileLoading || reviewsLoading || docsLoading || apptsLoading;

  const result: AIPPResult | null = useMemo(() => {
    if (!profile) return null;

    const contractorAppointments = (appointments ?? []).filter(
      (a: any) => a.contractor_id === profile.id
    );
    const accepted = contractorAppointments.filter(
      (a: any) => a.status === "accepted" || a.status === "completed" || a.status === "scheduled"
    );

    const input: AIPPInput = {
      business_name: profile.business_name,
      specialty: profile.specialty,
      description: profile.description,
      city: profile.city,
      province: profile.province,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      address: profile.address,
      logo_url: profile.logo_url,
      years_experience: profile.years_experience,
      verification_status: profile.verification_status,
      license_number: profile.license_number,
      insurance_info: profile.insurance_info,
      documents_count: docs?.length ?? 0,
      review_count: profile.review_count ?? reviews?.length ?? 0,
      rating: profile.rating,
      total_appointments: contractorAppointments.length,
      accepted_appointments: accepted.length,
      portfolio_urls: profile.portfolio_urls,
    };

    return computeAIPPScore(input);
  }, [profile, reviews, docs, appointments]);

  return { data: result, isLoading, profile };
};
