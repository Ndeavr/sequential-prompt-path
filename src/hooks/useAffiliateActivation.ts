/**
 * useAffiliateActivation — Active le rôle affilié pour l'utilisateur courant
 * en réutilisant `profiles` + `user_roles` + `affiliates`. Aucun compte séparé.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export type AffiliateType =
  | "contractor"
  | "homeowner"
  | "partner"
  | "rep"
  | "creator"
  | "other";

export type DisplayPreference =
  | "full_name"
  | "first_name"
  | "business"
  | "neutral";

export interface AffiliateActivationInput {
  affiliate_type: AffiliateType;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  primary_city?: string;
  preferred_language?: "fr" | "en";
  display_preference?: DisplayPreference;
  phone?: string;
  website_url?: string;
  bio?: string;
}

function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "unpro";
}

function randCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function pickUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase
      .from("affiliates" as any)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 5)}`;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export function useAffiliateActivation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const activate = async (input: AffiliateActivationInput) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté.");
      return null;
    }
    setLoading(true);
    try {
      // Ensure role
      await supabase
        .from("user_roles" as any)
        .upsert(
          { user_id: user.id, role: "affiliate" as any },
          { onConflict: "user_id,role" }
        );

      // Existing affiliate row?
      const { data: existing } = await supabase
        .from("affiliates" as any)
        .select("id, slug, referral_code")
        .eq("user_id", user.id)
        .maybeSingle<any>();

      const displayBase =
        input.display_preference === "business" && input.business_name
          ? input.business_name
          : input.first_name || input.last_name || user.email?.split("@")[0] || "affilie";
      const slug = existing?.slug || (await pickUniqueSlug(toSlug(displayBase)));
      const referral_code =
        existing?.referral_code || randCode("UNPRO");

      const payload: any = {
        user_id: user.id,
        name:
          [input.first_name, input.last_name].filter(Boolean).join(" ").trim() ||
          input.business_name ||
          displayBase,
        first_name: input.first_name || null,
        last_name: input.last_name || null,
        business_name: input.business_name || null,
        phone: input.phone || null,
        primary_city: input.primary_city || null,
        preferred_language: input.preferred_language || "fr",
        display_preference: input.display_preference || "first_name",
        affiliate_type: input.affiliate_type,
        website_url: input.website_url || null,
        bio: input.bio || null,
        slug,
        referral_code,
        status: "active",
        email: user.email || null,
      };

      const { error } = await (supabase as any)
        .from("affiliates")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Votre statut d'affilié est actif.");
      navigate("/affiliate", { replace: true });
      return { slug, referral_code };
    } catch (e: any) {
      console.error("[affiliate activate]", e);
      toast.error(e.message || "Erreur lors de l'activation.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { activate, loading };
}
