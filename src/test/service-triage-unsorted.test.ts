/**
 * UNPRO — « À classer » (unsorted) : aucun effet sur le matching.
 * Garantit qu'un service non tranché ne crée ni boost ni exclusion.
 */
import { describe, it, expect } from "vitest";
import { sanitizeAnswers, materialize } from "../../supabase/functions/_shared/contractorCompatibility.ts";

describe("service à classer", () => {
  it("conserve le statut unsorted au lieu de le transformer en accepté", () => {
    const a = sanitizeAnswers({ services: { isolation_soufflee: { stance: "unsorted" } } });
    expect(a.services.isolation_soufflee.stance).toBe("unsorted");
  });

  it("classe par défaut un statut inconnu en À classer, jamais en accepté", () => {
    const a = sanitizeAnswers({ services: { ventilation_comble: { stance: "n_importe_quoi" } } });
    expect(a.services.ventilation_comble.stance).toBe("unsorted");
  });

  it("n'écrit aucune règle de matching pour un service à classer", async () => {
    const answers = sanitizeAnswers({
      services: {
        isolation_soufflee: { stance: "unsorted", min_project_cents: 500000 },
        scellage_air: { stance: "priority" },
        excavation: { stance: "not_wanted" },
      },
    });

    const captured: Record<string, unknown>[] = [];
    const chain = () => {
      const c: Record<string, unknown> = {};
      ["upsert", "update", "eq", "delete", "insert", "select", "not", "in", "neq"].forEach((k) => {
        c[k] = () => c;
      });
      (c as { then: unknown }).then = (res: (v: unknown) => unknown) => res({ data: null, error: null });
      return c;
    };
    const supabase = {
      from(table: string) {
        const c = chain();
        if (table === "contractor_matching_rules") {
          c.upsert = (rows: Record<string, unknown>[]) => {
            captured.push(...rows);
            return c;
          };
        }
        return c;
      },
    };

    await materialize(supabase, "c1", answers, { finalize: true });
    const keys = captured.map((r) => r.rule_key);
    expect(keys).not.toContain("service:isolation_soufflee");
    expect(keys).not.toContain("service_min:isolation_soufflee");
    expect(keys).toContain("service:scellage_air");
    expect(keys).toContain("service:excavation");
  });
});
