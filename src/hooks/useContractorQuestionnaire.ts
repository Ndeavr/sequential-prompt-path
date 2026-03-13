import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface QuestionnaireData {
  // Step 1 — Identity
  business_name: string;
  legal_name: string;
  phone: string;
  email: string;
  website: string;
  languages: string[];
  // Step 2 — Activity
  specialty: string;
  primary_categories: string[];
  secondary_categories: string[];
  description: string;
  client_types: string[];
  // Step 3 — Services
  primary_services: string[];
  secondary_services: string[];
  emergency_service: boolean;
  service_scope: string[];
  project_types: string[];
  // Step 4 — Areas
  city: string;
  secondary_cities: string[];
  radius_km: number;
  travels: boolean;
  province: string;
  // Step 5 — Proof
  license_number: string;
  insurance_info: string;
  certifications: string[];
  years_experience: number;
  // Step 6 — Reputation
  gmb_linked: boolean;
  other_profiles: string[];
  testimonials_count: number;
  // Step 7 — Conversion
  accepts_appointments: boolean;
  response_delay: string;
  free_estimate: boolean;
  availability: string;
}

const DEFAULT_DATA: QuestionnaireData = {
  business_name: "", legal_name: "", phone: "", email: "", website: "", languages: ["Français"],
  specialty: "", primary_categories: [], secondary_categories: [], description: "", client_types: [],
  primary_services: [], secondary_services: [], emergency_service: false, service_scope: [], project_types: [],
  city: "", secondary_cities: [], radius_km: 25, travels: false, province: "Québec",
  license_number: "", insurance_info: "", certifications: [], years_experience: 0,
  gmb_linked: false, other_profiles: [], testimonials_count: 0,
  accepts_appointments: true, response_delay: "24h", free_estimate: true, availability: "business_hours",
};

export function useContractorQuestionnaire() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<QuestionnaireData>(DEFAULT_DATA);
  const [step, setStep] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contractorIdRef = useRef<string | null>(null);

  // Load existing contractor data
  const { data: contractor, isLoading } = useQuery({
    queryKey: ["contractor-questionnaire", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_services(*), contractor_service_areas(*), contractor_gmb_profiles(*)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pre-fill form from existing data
  useEffect(() => {
    if (!contractor) return;
    contractorIdRef.current = contractor.id;

    const services = (contractor as any).contractor_services || [];
    const areas = (contractor as any).contractor_service_areas || [];
    const gmb = (contractor as any).contractor_gmb_profiles || [];

    setForm((prev) => ({
      ...prev,
      business_name: contractor.business_name || prev.business_name,
      legal_name: (contractor as any).legal_name || prev.legal_name || "",
      phone: contractor.phone || prev.phone,
      email: contractor.email || prev.email,
      website: contractor.website || prev.website,
      languages: ((contractor as any).languages as string[]) || prev.languages,
      specialty: contractor.specialty || prev.specialty,
      description: contractor.description || prev.description,
      city: contractor.city || prev.city,
      province: contractor.province || prev.province,
      license_number: contractor.license_number || prev.license_number,
      insurance_info: contractor.insurance_info || prev.insurance_info,
      years_experience: contractor.years_experience || prev.years_experience,
      emergency_service: (contractor as any).emergency_service ?? prev.emergency_service,
      primary_categories: services.filter((s: any) => s.is_primary).map((s: any) => s.service_name_fr),
      secondary_categories: services.filter((s: any) => !s.is_primary).map((s: any) => s.service_name_fr),
      primary_services: services.filter((s: any) => s.is_primary).map((s: any) => s.category).filter(Boolean),
      secondary_cities: areas.filter((a: any) => !a.is_primary).map((a: any) => a.city_name),
      radius_km: areas[0]?.radius_km || prev.radius_km,
      gmb_linked: gmb.length > 0 && gmb[0].is_confirmed,
    }));
  }, [contractor]);

  // Auto-save with debounce
  const save = useCallback(async () => {
    if (!user || !isDirty) return;

    try {
      const payload: any = {
        business_name: form.business_name,
        legal_name: form.legal_name || null,
        phone: form.phone,
        email: form.email,
        website: form.website,
        languages: form.languages,
        specialty: form.specialty,
        description: form.description,
        city: form.city,
        province: form.province,
        license_number: form.license_number,
        insurance_info: form.insurance_info,
        years_experience: form.years_experience || null,
        emergency_service: form.emergency_service,
      };

      if (contractorIdRef.current) {
        await supabase.from("contractors").update(payload).eq("id", contractorIdRef.current);
      } else {
        const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new";
        const { data } = await supabase
          .from("contractors")
          .insert({ ...payload, user_id: user.id, slug })
          .select("id")
          .single();
        if (data) contractorIdRef.current = data.id;
      }

      // Sync services
      if (contractorIdRef.current) {
        await supabase.from("contractor_services").delete().eq("contractor_id", contractorIdRef.current);
        const serviceInserts = [
          ...form.primary_categories.map((name) => ({
            contractor_id: contractorIdRef.current!,
            service_name_fr: name,
            is_primary: true,
            data_source: "contractor_declared",
          })),
          ...form.secondary_categories.map((name) => ({
            contractor_id: contractorIdRef.current!,
            service_name_fr: name,
            is_primary: false,
            data_source: "contractor_declared",
          })),
        ];
        if (serviceInserts.length) await supabase.from("contractor_services").insert(serviceInserts);

        // Sync areas
        await supabase.from("contractor_service_areas").delete().eq("contractor_id", contractorIdRef.current);
        const areaInserts = [
          ...(form.city ? [{ contractor_id: contractorIdRef.current, city_name: form.city, is_primary: true, radius_km: form.radius_km, province: form.province, data_source: "contractor_declared" }] : []),
          ...form.secondary_cities.map((c) => ({
            contractor_id: contractorIdRef.current!,
            city_name: c,
            is_primary: false,
            radius_km: form.radius_km,
            province: form.province,
            data_source: "contractor_declared",
          })),
        ];
        if (areaInserts.length) await supabase.from("contractor_service_areas").insert(areaInserts);
      }

      setIsDirty(false);
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  }, [form, user, isDirty]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [isDirty, save]);

  const updateField = useCallback(<K extends keyof QuestionnaireData>(key: K, value: QuestionnaireData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setIsDirty(true);
  }, []);

  const toggleArrayField = useCallback((key: keyof QuestionnaireData, value: string) => {
    setForm((f) => {
      const arr = (f[key] as string[]) || [];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
    setIsDirty(true);
  }, []);

  // Completion percentage
  const completionPct = useCallback(() => {
    const checks = [
      !!form.business_name, !!form.phone, !!form.email,
      !!form.specialty, form.primary_categories.length > 0, !!form.description,
      form.primary_services.length > 0 || form.primary_categories.length > 0,
      !!form.city,
      !!form.license_number, !!form.insurance_info,
      form.years_experience > 0,
      form.gmb_linked,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const prefilledFields = useCallback((): Set<string> => {
    const fields = new Set<string>();
    if (!contractor) return fields;
    if (contractor.business_name) fields.add("business_name");
    if (contractor.phone) fields.add("phone");
    if (contractor.email) fields.add("email");
    if (contractor.website) fields.add("website");
    if (contractor.specialty) fields.add("specialty");
    if (contractor.description) fields.add("description");
    if (contractor.city) fields.add("city");
    if (contractor.license_number) fields.add("license_number");
    if (contractor.insurance_info) fields.add("insurance_info");
    return fields;
  }, [contractor]);

  return {
    form, step, setStep, updateField, toggleArrayField,
    isLoading, isDirty, save, completionPct, prefilledFields,
    contractorId: contractorIdRef.current,
  };
}
