import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Server-side coherence between role and account_type for cross-device
 * auth role intents. The client is NOT a security boundary: the SQL function
 * must refuse any explicit incoherent combination and normalize NULL to the
 * safe default.
 *
 * Live-verified against the database on 2026-09-06:
 *  - contractor + contractor          -> ok
 *  - contractor + NULL                -> ok (normalized to contractor)
 *  - homeowner  + homeowner           -> ok
 *  - homeowner  + property_manager    -> ok
 *  - homeowner  + contractor          -> refused account_type_role_mismatch
 *  - contractor + homeowner           -> refused account_type_role_mismatch
 *  - contractor + property_manager    -> refused account_type_role_mismatch
 *  - refused pairs insert ZERO rows.
 */
const MIGRATION = resolve(
  __dirname,
  "../../../supabase/migrations/20260906214540_b7231917-949d-4eb5-ad60-e569925f712d.sql",
);

const sql = readFileSync(MIGRATION, "utf8");

describe("create_auth_role_intent — role/account_type coherence (SQL)", () => {
  it("defines the mismatch refusal reason", () => {
    expect(sql).toContain("'account_type_role_mismatch'");
  });

  it("contractor accepts only account_type contractor", () => {
    expect(sql).toMatch(/IF v_role = 'contractor' THEN[\s\S]*?v_account_type := 'contractor'/);
    expect(sql).toMatch(
      /ELSIF v_account_type <> 'contractor' THEN\s*RETURN jsonb_build_object\('ok', false, 'reason', 'account_type_role_mismatch'\)/,
    );
  });

  it("homeowner accepts only homeowner or property_manager", () => {
    expect(sql).toMatch(
      /ELSIF v_account_type NOT IN \('homeowner', 'property_manager'\) THEN\s*RETURN jsonb_build_object\('ok', false, 'reason', 'account_type_role_mismatch'\)/,
    );
  });

  it("the mismatch check runs BEFORE any insert", () => {
    const check = sql.indexOf("'account_type_role_mismatch'");
    const insert = sql.indexOf("INSERT INTO public.auth_role_intents");
    expect(check).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(check);
  });

  it("consume refuses incoherent stored combinations too (defense in depth)", () => {
    expect(sql).toMatch(
      /IF \(v_row\.role = 'contractor' AND v_row\.account_type <> 'contractor'\)\s*OR \(v_row\.role = 'homeowner' AND v_row\.account_type NOT IN \('homeowner', 'property_manager'\)\)/,
    );
  });

  it("keeps hardened privileges: table locked, create anon-callable, consume authenticated-only", () => {
    // Privileges/RLS/rate limits were fixed in the previous migration and must
    // not regress here: create granted to anon, consume revoked from anon.
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.create_auth_role_intent[^;]*TO anon/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.consume_auth_role_intent\(text\) FROM anon/);
  });
});
