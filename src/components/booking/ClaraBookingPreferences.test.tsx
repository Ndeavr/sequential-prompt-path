import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const upsert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
        // The embedded calendar-integration request loads independently on mount.
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
      upsert,
    }),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u" } } }) },
  },
}));
const request = vi.fn();
vi.mock("@/lib/permissionManager", () => ({ request: (...a: unknown[]) => request(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ClaraBookingPreferences from "./ClaraBookingPreferences";

const rows = [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: "11:00", end_time: "19:00", is_active: true }));

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  upsert.mockClear();
  request.mockReset();
});

describe("ClaraBookingPreferences", () => {
  it("without speech support: no inert mic, text path recaps then asks representatives one at a time", async () => {
    const onApply = vi.fn();
    render(<ClaraBookingPreferences contractorId="c1" availability={rows} onApplyHours={onApply} />);
    expect(screen.queryByRole("button", { name: /dicter/i })).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Au plus tard à 21h en semaine, sauf vendredi 16h. Max 3 soirs par semaine." } });
    fireEvent.click(screen.getByRole("button", { name: /résumez/i }));
    expect(screen.getByText(/Au plus 3 soirées par semaine/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /exact/i }));
    expect(screen.getByText("Combien de représentants peuvent effectuer des visites simultanément?")).toBeTruthy();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
    expect(screen.getByText(/temps de déplacement maximal/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /pas de limite précisée/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    const payload = upsert.mock.calls[0][0];
    expect(payload).toMatchObject({ max_evenings_per_week: 3, visit_capacity: 1, declared_representatives: 1 });
    expect(onApply.mock.calls[0][0].find((r: { day_of_week: number }) => r.day_of_week === 5).end_time).toBe("16:00");
  });

  it("mic refused: falls back to typing, never starts listening", async () => {
    const start = vi.fn();
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = function () {
      return { start, stop: vi.fn() };
    };
    request.mockResolvedValue("denied");
    render(<ClaraBookingPreferences contractorId="c1" availability={rows} onApplyHours={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /dicter/i }));
    expect(await screen.findByText(/Vous pouvez simplement écrire/)).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it("several representatives: capacity stays 1, assignment asked, nothing invented", async () => {
    render(<ClaraBookingPreferences contractorId="c1" availability={rows} onApplyHours={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Nous avons deux représentants. Max 2 soirs par semaine." } });
    fireEvent.click(screen.getByRole("button", { name: /résumez/i }));
    fireEvent.click(screen.getByRole("button", { name: /exact/i }));
    expect(screen.getByText(/répartir les agendas/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Chacun son secteur" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(screen.getByText(/temps de déplacement maximal/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /pas de limite précisée/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0]).toMatchObject({ visit_capacity: 1, declared_representatives: 2, representatives_note: "Chacun son secteur" });
  });
});
