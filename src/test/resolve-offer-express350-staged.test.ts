// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const DIR = "docs/migrations-staged/20261018_resolve_contractor_offer_express350_only";
async function db(sql: string) {
  const d = new PGlite();
  await d.exec(`
    CREATE TABLE founder_eligible_categories(slug text primary key, group_type text, is_active boolean);
    CREATE TABLE founder_memberships(id serial, city text, category_slug text, status text);
    CREATE TABLE project_trade_categories(slug text primary key, is_active boolean);
    CREATE FUNCTION check_founder_eligibility(text,text) RETURNS jsonb LANGUAGE sql AS $$ select '{"eligible":true}'::jsonb $$;
    INSERT INTO founder_eligible_categories VALUES ('menage','local_service',true),('notaire','professional',true);
    INSERT INTO project_trade_categories VALUES ('toiture',true);
    INSERT INTO founder_memberships(city,category_slug,status) VALUES ('Laval','menage','founder_activated');`);
  await d.exec(sql);
  const offer = async (city: string | null, slug: string | null) =>
    (await d.query<{ r: any }>("select public.resolve_contractor_offer($1,$2) r", [city, slug])).rows[0].r;
  return { d, offer };
}

describe("staged resolve_contractor_offer — nouveaux entrepreneurs = 350 $", () => {
  it("services locaux : express_350, plus jamais free_founding, sans rareté", async () => {
    const { offer, d } = await db(readFileSync(`${DIR}.sql`, "utf8"));
    for (const city of ["Laval", "Gatineau", null]) {
      const r = await offer(city, "menage");
      expect(r.offer).toBe("express_350");
      expect(r.city_remaining).toBeNull();
    }
    expect((await offer("Laval", "toiture")).offer).toBe("express_350");
    expect((await offer("Laval", "notaire")).offer).toBe("none");
    expect((await offer("Laval", "inconnu")).offer).toBe("unknown");
    expect((await offer("Laval", null)).reason).toBe("missing_category");
    // Historique préservé : la fonction ne touche aucune adhésion existante.
    expect((await d.query("select * from founder_memberships where status='founder_activated'")).rows).toHaveLength(1);
    await d.close();
  }, 30000);
  it("rollback restaure exactement le comportement précédent (free_founding si admissible)", async () => {
    const { offer, d } = await db(readFileSync(`${DIR}.sql`, "utf8") + readFileSync(`${DIR}.rollback.sql`, "utf8"));
    const r = await offer("Laval", "menage");
    expect(r.offer).toBe("free_founding");
    expect(r.city_remaining).toBe(9);
    await d.close();
  }, 30000);
});

describe("12 mois calendaires (arithmétique Postgres utilisée par contractor_plan_code)", () => {
  it("fin janvier et 29 février", async () => {
    const d = new PGlite();
    const r = await d.query<{ a: string; b: string; c: string }>(`select
      (timestamptz '2027-01-31 12:00+00' + interval '12 months')::date::text a,
      (timestamptz '2028-02-29 12:00+00' + interval '12 months')::date::text b,
      (timestamptz '2026-10-18 12:00+00' + interval '12 months')::date::text c`);
    expect(r.rows[0]).toEqual({ a: "2028-01-31", b: "2029-02-28", c: "2027-10-18" });
    await d.close();
  }, 30000);
});
