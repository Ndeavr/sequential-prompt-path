import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import IsrSubsidiesPage, { ISR_SUBSIDIES_PATH } from "./IsrSubsidiesPage";
afterEach(cleanup);
it("exposes an indexable canonical page with real FAQ schema and the ISR booking entry", () => {
  const { container } = render(<MemoryRouter><IsrSubsidiesPage /></MemoryRouter>);
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://unpro.ca${ISR_SUBSIDIES_PATH}`);
  expect(document.querySelector('meta[name="robots"]')).toBeNull();
  expect(document.querySelector('link[hreflang="en-CA"]')).toBeNull();
  expect(screen.getAllByRole("link", { name: /Prenez rendez-vous maintenant/ })).toHaveLength(2);
  expect(screen.getAllByRole("link", { name: /Prenez rendez-vous maintenant/ })[0].getAttribute("href")).toContain("/c/isolation-solution-royal/isolation-entretoit?");
  const schema = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
  expect(schema["@graph"][1].mainEntity).toHaveLength(3);
  for (const question of schema["@graph"][1].mainEntity) expect(screen.getByText(question.name)).toBeTruthy();
});
