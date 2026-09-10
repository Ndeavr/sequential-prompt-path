/**
 * Regression locks for the free local-service founder journey.
 * A server-confirmed $0 entitlement must never fall into the paid quote flow.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LEGACY_REDIRECTS } from "@/config/routeRegistry";
import {
  type FreeServiceEntitlement,
  founderProfileDestination,
  isActiveFreeServiceEntitlement,
  postMatchingProfileDestination,
} from "@/lib/founderEntitlement";

const ACTIVE_FOUNDER: FreeServiceEntitlement = {
  authenticated: true,
  active: true,
  membership_id: "membership-1",
  contractor_id: "contractor-1",
  business_name: "Entretien Paysager BDM",
  city: "Laval",
  category_slug: "entretien-gazon",
  status: "founder_activated",
  founder_start: "2026-09-10T11:31:00.000Z",
  founder_end: "2099-09-10T11:31:00.000Z",
  offer_code: "free_year_local_service",
  profile_complete: false,
  calendar_connected: false,
  booking_enabled: false,
};

describe("continuité de l'inscription gratuite", () => {
  it("utilise la route canonique du profil et ne propage que l'attribution permise", () => {
    const params = new URLSearchParams(
      "utm_source=sms&utm_medium=direct&ref=bdm&p=prospect-1&token=secret&unexpected=no",
    );

    expect(founderProfileDestination(params)).toBe(
      "/entrepreneurs/profil?source=founder_free&utm_source=sms&utm_medium=direct&ref=bdm&p=prospect-1",
    );
    expect(LEGACY_REDIRECTS["/entrepreneur/profil"]).toBe("/entrepreneurs/profil");
  });

  it("envoie une adhésion gratuite active vers l'agenda inclus", () => {
    expect(isActiveFreeServiceEntitlement(ACTIVE_FOUNDER)).toBe(true);
    expect(postMatchingProfileDestination(ACTIVE_FOUNDER)).toBe(
      "/calendar/connect?role=contractor&surface=founder_free_profile",
    );
  });

  it("ne fabrique jamais l'accès gratuit depuis un statut expiré ou absent", () => {
    expect(
      isActiveFreeServiceEntitlement({ ...ACTIVE_FOUNDER, founder_end: "2020-01-01T00:00:00.000Z" }),
    ).toBe(false);
    expect(postMatchingProfileDestination(null)).toBe("/entrepreneur/devis-personnalise");
  });

  it("vérifie l'adhésion avec auth.uid et ne donne pas le RPC aux visiteurs anonymes", () => {
    const migration = readFileSync(
      "supabase/migrations/20260910123000_free_service_entitlement_continuity.sql",
      "utf8",
    );

    expect(migration).toContain("v_user_id uuid := auth.uid()");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_my_free_service_entitlement() TO authenticated",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.get_my_free_service_entitlement() FROM anon",
    );
    expect(migration).not.toMatch(/GRANT EXECUTE[^;]+TO anon/i);
  });
});
