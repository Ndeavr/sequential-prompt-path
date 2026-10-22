import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseList, validateListFile, hashRows, MAX_ROWS } from "@/features/affiliate/addLead/stageImport";

describe("Import affilié en brouillon", () => {
  it("collage tableur avec en-têtes", () => {
    const { rows } = parseList("Entreprise\tTéléphone\tVille\nToiture Test QA\t514 555-0199\tLaval");
    expect(rows).toEqual([{ company_name: "Toiture Test QA", phone: "514 555-0199", city: "Laval" }]);
  });
  it("CSV sans en-tête : devine téléphone, courriel, site", () => {
    const { rows } = parseList('"Plomberie, QA",qa@example.com,www.qa-test.ca,4505550100');
    expect(rows[0]).toMatchObject({ company_name: "Plomberie, QA", email: "qa@example.com", website: "www.qa-test.ca", phone: "4505550100" });
  });
  it("limite 100 lignes par lot", () => {
    const { rows, truncated } = parseList(Array.from({ length: 120 }, (_, i) => `QA ${i}\t51455501${String(i).padStart(2, "0")}`).join("\n"));
    expect(rows.length).toBe(MAX_ROWS); expect(truncated).toBe(true);
  });
  it("rejette XLSX, fichier vide et trop lourd", () => {
    expect(validateListFile(new File(["x"], "liste.xlsx"))).toMatch(/CSV/);
    expect(validateListFile(new File([], "liste.csv"))).toMatch(/vide/);
    expect(validateListFile(new File(["a".repeat(210 * 1024)], "liste.csv"))).toMatch(/lourd/);
    expect(validateListFile(new File(["a,b"], "liste.csv"))).toBeNull();
  });
  it("même lot = même empreinte (idempotence)", async () => {
    const r = [{ company_name: "QA" }];
    expect(await hashRows("paste", r)).toBe(await hashRows("paste", r));
    expect(await hashRows("paste", r)).not.toBe(await hashRows("csv", r));
  });
  it("le serveur ne réserve ni n'attribue jamais, et bloque l'auto-attribution", () => {
    const sql = readFileSync("drizzle/migrations/0026_affiliate_import_staging.sql", "utf8");
    expect(sql).not.toMatch(/INSERT INTO contractor_leads/i);
    expect(sql).toMatch(/'reserved', false/);
    expect(sql).toMatch(/AS RESTRICTIVE FOR INSERT/);
    expect(sql).toMatch(/attribution_change_forbidden/);
    expect(sql).toMatch(/WHERE user_id = auth\.uid\(\)/);
  });
  it("l'ancien contrôle de doublons ne divulgue plus rien", () => {
    const fn = readFileSync("supabase/functions/lead-dedupe-check/index.ts", "utf8");
    expect(fn).not.toMatch(/SERVICE_ROLE|from\(/);
  });
});
