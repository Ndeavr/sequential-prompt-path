import { describe, expect, it } from "vitest";
import { parseSelectedServiceIntent } from "@/services/clara/selectedServiceIntent";

describe("Clara — passage menu propriétaire vers conversation", () => {
  it("reprend le nettoyage de gouttières sans salutation générique", () => {
    const selected = parseSelectedServiceIntent("J’ai besoin du service suivant : Nettoyage de gouttières");
    expect(selected?.serviceLabel).toBe("Nettoyage de gouttières");
    expect(selected?.openingFr).toContain("nettoyage de vos gouttières");
    expect(selected?.openingFr).toContain("Dans quelle ville");
    expect(selected?.openingFr).not.toContain("Comment puis-je vous aider");
  });

  it("respecte les autres choix du menu", () => {
    const selected = parseSelectedServiceIntent("J'ai besoin du service suivant : Isolation");
    expect(selected?.serviceLabel).toBe("Isolation");
    expect(selected?.openingFr).toContain("Isolation");
  });

  it("ne modifie pas les recherches libres ni les paramètres malformés", () => {
    expect(parseSelectedServiceIntent("Je cherche un plombier à Laval")).toBeNull();
    expect(parseSelectedServiceIntent("J’ai besoin du service suivant : <script>")).toBeNull();
    expect(parseSelectedServiceIntent("J’ai besoin du service suivant : " + "a".repeat(121))).toBeNull();
  });
});
