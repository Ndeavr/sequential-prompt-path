/**
 * useProfileCompletionGate — single source of truth for booking eligibility.
 *
 * Rule (Alex): never show a manual contact form when the user is logged out.
 * Once logged in, only ask Alex for the missing field(s), one at a time.
 *
 * Reads from `profiles` (full_name, phone, address_line_1, email).
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type BookingProfileField = "full_name" | "phone" | "project_address";

export interface BookingProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  project_address: string | null; // mirrors profiles.address_line_1
}

export interface ProfileCompletionGate {
  isLoggedIn: boolean;
  isLoading: boolean;
  profile: BookingProfile | null;
  missingFields: BookingProfileField[];
  isComplete: boolean;
  refresh: () => Promise<void>;
  /** Update one missing field on the user's profile. */
  updateField: (field: BookingProfileField, value: string) => Promise<void>;
}

const FIELD_TO_COLUMN: Record<BookingProfileField, keyof BookingProfile | "address_line_1"> = {
  full_name: "full_name",
  phone: "phone",
  project_address: "address_line_1",
};

export const FIELD_LABEL_FR: Record<BookingProfileField, string> = {
  full_name: "votre nom complet",
  phone: "votre numéro de téléphone",
  project_address: "l'adresse du projet",
};

function computeMissing(p: BookingProfile | null): BookingProfileField[] {
  if (!p) return ["full_name", "phone", "project_address"];
  const missing: BookingProfileField[] = [];
  if (!p.full_name || p.full_name.trim().length < 2) missing.push("full_name");
  if (!p.phone || p.phone.trim().length < 7) missing.push("phone");
  if (!p.project_address || p.project_address.trim().length < 4) missing.push("project_address");
  return missing;
}

export function useProfileCompletionGate(): ProfileCompletionGate {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<BookingProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, email, address_line_1")
      .eq("user_id", user.id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      setProfile({
        user_id: user.id,
        full_name: null,
        phone: null,
        email: user.email ?? null,
        project_address: null,
      });
      return;
    }
    setProfile({
      user_id: data.user_id,
      full_name: data.full_name ?? null,
      phone: data.phone ?? null,
      email: data.email ?? user.email ?? null,
      project_address: data.address_line_1 ?? null,
    });
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateField = useCallback(
    async (field: BookingProfileField, value: string) => {
      if (!user) return;
      const column = FIELD_TO_COLUMN[field];
      const { error } = await supabase
        .from("profiles")
        .update({ [column]: value.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      await fetchProfile();
    },
    [user, fetchProfile]
  );

  const missingFields = computeMissing(profile);

  return {
    isLoggedIn: !!user,
    isLoading: authLoading || loading,
    profile,
    missingFields,
    isComplete: !!user && missingFields.length === 0,
    refresh: fetchProfile,
    updateField,
  };
}
