import { beforeEach, describe, expect, it, vi } from "vitest";
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));
import { getMatchingSessionKey } from "@/lib/matching/sessionKey";
import { qualificationMatchingAnswers, persistClaraQualification, loadClaraQualification } from "@/services/clara/claraQualificationPersistence";
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); invoke.mockReset(); });
describe("Clara — canonical matching persistence", () => {
  it("reuses the existing matching session key", () => {
    localStorage.setItem("unpro_matching_session_key", "mp_existing_123");
    expect(getMatchingSessionKey()).toBe("mp_existing_123");
  });
  it("stores useful matching fields and exclusions without inventing monetary sizes or verified credentials", () => {
    const answers = qualificationMatchingAnswers({ preferred_work: ["Isolation"], excluded_work: ["Petites réparations"], service_areas: ["Laval", "Montréal"], excluded_areas: ["Montréal"], customer_type: "Résidentiel", preferred_project_sizes: ["Projets d’envergure"] });
    expect(answers).toMatchObject({ services_wanted: ["Isolation"], services_refused: ["Petites réparations"], territories: ["Laval"], excluded_territories: ["Montréal"], client_type: "residential" });
    expect(answers).not.toHaveProperty("project_size"); expect(answers).not.toHaveProperty("credentials");
  });
  it("saves to the existing matching profile, never the session workflow", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await persistClaraQualification({ business_name: "QA", business_city: "Terrebonne", service_areas: ["Laval"] });
    expect(invoke).toHaveBeenCalledWith("matching-profile", { body: expect.objectContaining({ action: "save", city: "Terrebonne", answers: expect.objectContaining({ territories: ["Laval"] }) }) });
    expect(invoke).not.toHaveBeenCalledWith("clara-session", expect.anything());
  });
  it("surfaces a rejected save and restores the compact profile returned by the server", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false }, error: null });
    await expect(persistClaraQualification({ service_areas: ["Laval"] })).rejects.toThrow("sauvegardé");
    invoke.mockResolvedValueOnce({ data: { ok: true, profile: { answers: { clara_qualification: { excluded_areas: ["Montréal"] } } } }, error: null });
    expect(await loadClaraQualification()).toEqual({ excluded_areas: ["Montréal"] });
  });
});
