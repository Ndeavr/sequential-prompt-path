import { describe, expect, it } from "vitest";
import { contractorIdentityFromQuote, missingContractorIdentity } from "../../supabase/functions/_shared/contractorIdentity";
describe("checkout public identity", () => {
  it("carries the confirmed company, trade, city and real contact fields", () => {
    expect(contractorIdentityFromQuote({company_name:"  Atelier QA  ",city:"Laval",trade_primary:"Cuisine",input_payload:{website_url:"atelier.example",business_phone:"123",business_address:"Adresse déclarée",business_province:"QC"}},"fallback")).toEqual({business_name:"Atelier QA",city:"Laval",specialty:"Cuisine",website:"https://atelier.example/",phone:"123",address:"Adresse déclarée",province:"QC"});
  });
  it("never copies verification, payment or regulatory claims", () => {
    expect(contractorIdentityFromQuote({company_name:"Entreprise",admin_verified:true,rbq_number:"123",input_payload:{neq:"1234567890",logo_url:"invented",verification_status:"verified",is_published:true}},"fallback")).toEqual({business_name:"Entreprise"});
  });
  it("does not publish credential-bearing or malformed website links", () => {
    for (const website_url of ["https://user:pass@example.com", "javascript:alert(1)", "https://["]) expect(contractorIdentityFromQuote({input_payload:{website_url}},"fallback")).toEqual({business_name:"fallback"});
  });
  it("preserves owner edits and fills only missing fields or the initial email name", () => {
    const quote={company_name:"Entreprise confirmée",city:"Laval",trade_primary:"Cuisine",input_payload:{website_url:"atelier.example"}};
    expect(missingContractorIdentity({business_name:"Compte corrigé",city:"Québec",specialty:"",website:""},quote,"qa@example.com")).toEqual({specialty:"Cuisine",website:"https://atelier.example/"});
    expect(missingContractorIdentity({business_name:"qa@example.com",city:"Laval",specialty:"Cuisine",website:"https://atelier.example/"},quote,"qa@example.com")).toEqual({business_name:"Entreprise confirmée"});
    expect(missingContractorIdentity({},null,"qa@example.com")).toEqual({});
  });
  it("handles missing quote and empty identity without guessing company details", () => {
    expect(contractorIdentityFromQuote(null,"Compte")).toEqual({business_name:"Compte"});
  });
});
