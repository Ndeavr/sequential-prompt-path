vi.mock("@/services/clara/claraQualificationPersistence", () => ({ persistClaraQualification: vi.fn(() => Promise.resolve()), loadClaraQualification: vi.fn(() => Promise.resolve(null)) }));
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
vi.mock("@/services/clara/claraSession", () => ({ saveClaraContext: vi.fn(() => Promise.resolve()), peekClaraSessionToken: () => "qa-session" }));
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));
import { getClaraQualification, saveClaraQualification } from "@/services/clara/claraContractorQualification";
import { captureClaraContractorAnswer } from "@/services/clara/claraQualificationSummary";
import { sanitizeQualificationSummary } from "../../supabase/functions/_shared/claraQualificationSummary";
import ClaraQualificationPreview from "@/components/home-light/ClaraQualificationPreview";

beforeEach(() => { localStorage.clear(); invoke.mockReset(); });
afterEach(cleanup);
describe("Clara — résumé utile dans la qualification existante", () => {
  it("refuse les états paiement/vérification et les longues transcriptions", () => {
    expect(sanitizeQualificationSummary({ primary_trade: "Isolation", service_areas: ["Laval"], paid: true, rbq_verified: true, preferred_work: ["x".repeat(1000)] })).toEqual({ primary_trade: "Isolation", service_areas: ["Laval"] });
  });
  it("stocke les critères courts et permet de retirer explicitement une exclusion", async () => {
    saveClaraQualification({ business_city: "Terrebonne", service_areas: ["Montréal", "Laval"], excluded_areas: ["Québec"] });
    invoke.mockResolvedValue({ data: { patch: { service_areas: ["Laval"], excluded_areas: ["Montréal"], preferred_project_sizes: ["Projets d’envergure"] }, clarification: null }, error: null });
    await captureClaraContractorAnswer("Je ne travaille jamais à Montréal, j’aime les gros projets à Laval.");
    expect(getClaraQualification()).toMatchObject({ business_city: "Terrebonne", service_areas: ["Laval"], excluded_areas: ["Montréal"], preferred_project_sizes: ["Projets d’envergure"] });
    saveClaraQualification({ excluded_areas: [] }, "declared", { replaceLists: true });
    expect(getClaraQualification().excluded_areas).toEqual([]);
  });
  it("préserve une correction manuelle pendant l’analyse", async () => {
    saveClaraQualification({ primary_trade: "Toiture" });
    let resolve!: (data: unknown) => void;
    invoke.mockReturnValue(new Promise(r => { resolve = r; }));
    const capture = captureClaraContractorAnswer("Isolation");
    saveClaraQualification({ primary_trade: "Plomberie" });
    resolve({ data: { patch: { primary_trade: "Isolation" } }, error: null });
    await capture;
    expect(getClaraQualification().primary_trade).toBe("Plomberie");
  });
  it("ne modifie rien lorsque l’analyse échoue", async () => {
    saveClaraQualification({ primary_trade: "Toiture" });
    invoke.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(captureClaraContractorAnswer("Isolation")).rejects.toThrow("conservés");
    expect(getClaraQualification().primary_trade).toBe("Toiture");
  });
  it("affiche seulement le résumé, permet la correction et la validation", () => {
    saveClaraQualification({ preferred_work: ["Isolation"], excluded_areas: ["Montréal"], preferences_captured: true });
    const confirmed = vi.fn(); render(<ClaraQualificationPreview onConfirm={confirmed} />);
    fireEvent.change(screen.getByLabelText(/Territoires exclus/), { target: { value: "Québec" } });
    expect(getClaraQualification().excluded_areas).toEqual(["Québec"]);
    fireEvent.click(screen.getByRole("button", { name: "C’est bien ça" }));
    expect(getClaraQualification().preferences_confirmed).toBe(true); expect(confirmed).toHaveBeenCalledOnce();
  });
});
