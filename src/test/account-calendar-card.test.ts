import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
const read = (p: string) => readFileSync(p, "utf8");

describe("account calendar card", () => {
  it("renders exactly one calendar card on /dashboard/account, returning there after Google", () => {
    const page = read("src/pages/dashboard/AccountPage.tsx");
    expect(page.match(/<CardCalendarConnectionRole/g)?.length).toBe(1);
    expect(page).toContain('returnTo="/dashboard/account"');
  });
  it("uses the explicit Google label and separate Google/Apple statuses", () => {
    const card = read("src/components/calendar/CardCalendarConnectionRole.tsx");
    expect(card).toContain('label="Connecter Google Agenda"');
    expect(card).toContain('data-testid="status-google"');
    expect(card).toContain('data-testid="status-apple"');
    expect(card).toContain("Lien d'abonnement Apple généré.");
  });
});
