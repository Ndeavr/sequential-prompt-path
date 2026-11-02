import { describe, it, expect } from "vitest";
import { buildImageBrief } from "../../supabase/functions/blog-image-generator/brief";
describe("blog image brief", () => {
  it("never embeds the title and forbids text", () => {
    const b = buildImageBrief({ slug: "ia-attirer-clients-entrepreneurs-quebec", category: "entrepreneur" });
    expect(b).toMatch(/tablet/);
    expect(b).not.toMatch(/fiberglass|Est-ce que/);
    expect(b).toMatch(/no text/i);
  });
  it("R-60 maps to blown-in attic", () => {
    expect(buildImageBrief({ slug: "r-60-vraiment-necessaire" })).toMatch(/blown-in/);
  });
});
