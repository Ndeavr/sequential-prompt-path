import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArticleContentWithVisuals from "@/components/blog/ArticleContentWithVisuals";
import { THREE_QUOTES_ARTICLE_SLUG } from "@/components/blog/ThreeQuotesEditorialVisuals";

describe("Article canonique sur les trois soumissions", () => {
  it("place les trois visuels aux marqueurs éditoriaux", () => {
    render(
      <ArticleContentWithVisuals
        slug={THREE_QUOTES_ARTICLE_SLUG}
        html={'<p>Introduction</p><!--unpro:timeline--><h2>Comparer</h2><!--unpro:compatibility--><h2>Prix</h2><!--unpro:comparison--><p>Conclusion</p>'}
      />,
    );

    expect(screen.getByRole("heading", { name: /De la comparaison à la recommandation expliquée/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Les signaux reliés à la compatibilité/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Deux façons d’organiser la décision/i })).toBeInTheDocument();
    expect(screen.getByText(/repères narratifs/i)).toBeInTheDocument();
  });

  it("n’injecte aucun visuel dans les autres articles", () => {
    const { container } = render(
      <ArticleContentWithVisuals slug="autre-article" html="<p>Contenu ordinaire</p><!--unpro:timeline-->" />,
    );

    expect(screen.getByText("Contenu ordinaire")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /De la comparaison/i })).not.toBeInTheDocument();
    expect(container.innerHTML).toContain("unpro:timeline");
  });
});