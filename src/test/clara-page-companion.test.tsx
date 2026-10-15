import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClaraVoiceDock from "@/components/voice/ClaraVoiceDock";
import ClaraPageContextObserver from "@/components/clara/ClaraPageContextObserver";
import { CLARA_PAGE_CONTEXT_EVENT, readClaraPageContext, publishClaraPageContext, getClaraPageContext } from "@/services/clara/claraPageContext";

afterEach(() => { cleanup(); document.body.innerHTML = ""; vi.useRealTimers(); });
function fixture() {
  document.body.innerHTML = `<main data-clara-page data-clara-step="Objectif"><h1>Votre projet</h1><input data-clara-field="goal_amount" value="35000"><input type="email" data-clara-field="avg_sale" value="private@example.com"><input autocomplete="one-time-code" data-clara-field="margin_pct" value="123456"><input autocomplete="cc-number" data-clara-field="conversion_pct" value="4111111111111111"><input type="tel" data-clara-field="monthly_capacity" value="5145551234"><input type="password" data-clara-field="service_radius_km" value="secret"><input value="Other secret"><button>Voir les plans</button><button disabled>Continuer</button><div data-clara-blocker="subscription_required"></div><section data-clara-dock><button>Continuer par écrit</button></section></main>`;
}
describe("Clara page companion", () => {
  it("shares only opted-in numeric entries and actual available page actions", () => {
    fixture();
    const context = readClaraPageContext("/pro/leads?token=secret");
    expect(context.fields).toEqual({ goal_amount: 35000 });
    expect(context.actions).toEqual(["Voir les plans"]);
    expect(context.blockers).toEqual(["subscription_required"]);
    expect(context.path).toBe("/pro/leads");
    expect(JSON.stringify(context)).not.toMatch(/secret|123456|411111|514555|example.com/);
  });
  it("distinguishes an active field, hesitation and actual invalidity", () => {
    fixture(); const input = document.querySelector("input")!; input.focus();
    expect(readClaraPageContext("/form").status).toBe("editing");
    expect(readClaraPageContext("/form", true).status).toBe("hesitating");
    input.setAttribute("aria-invalid", "true");
    expect(readClaraPageContext("/form").status).toBe("invalid");
    expect(readClaraPageContext("/form").focusedField).toBe("goal_amount");
  });
  it("does not report focus on credentials even if annotated", () => {
    fixture(); document.querySelector<HTMLInputElement>('input[type="password"]')!.focus();
    expect(readClaraPageContext("/form").focusedField).toBeNull();
  });
  it("deduplicates identical snapshots", () => {
    fixture(); const listener = vi.fn(); window.addEventListener(CLARA_PAGE_CONTEXT_EVENT, listener);
    const context = readClaraPageContext("/unique"); publishClaraPageContext(context); publishClaraPageContext(context);
    expect(listener).toHaveBeenCalledTimes(1); window.removeEventListener(CLARA_PAGE_CONTEXT_EVENT, listener);
  });
  it("updates while the user types without changing their input", () => {
    vi.useFakeTimers();
    render(<MemoryRouter initialEntries={["/entrepreneur/devis-personnalise"]}><main data-clara-page data-clara-step="Objectif"><input aria-label="Montant" data-clara-field="goal_amount" defaultValue="35000" /></main><ClaraPageContextObserver /></MemoryRouter>);
    const input = screen.getByLabelText("Montant");
    fireEvent.focusIn(input); (input as HTMLInputElement).focus(); fireEvent.input(input, { target: { value: "45000" } });
    act(() => vi.advanceTimersByTime(500)); expect(getClaraPageContext()?.fields.goal_amount).toBe(45000);
    act(() => vi.advanceTimersByTime(20000)); expect(getClaraPageContext()?.status).toBe("hesitating");
    expect((input as HTMLInputElement).value).toBe("45000");
  });
  it("resizing and navigation preserve voice callbacks and page interaction", () => {
    const pause = vi.fn(), resume = vi.fn(), close = vi.fn(), chat = vi.fn(), pageAction = vi.fn();
    const context = { ...readClaraPageContext("/pro/leads"), step: "Abonnement" };
    const props = {caption:"Je vous écoute", paused:false, context, transcripts:[{id:"1",role:"alex" as const,text:"Vous pouvez voir les plans ici."}],onPause:pause,onResume:resume,onClose:close,onChat:chat};
    const {rerender} = render(<><button onClick={pageAction}>Voir les plans</button><ClaraVoiceDock {...props}/></>);
    fireEvent.click(screen.getByRole("button",{name:"Voir les plans"})); expect(pageAction).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button",{name:"Afficher la discussion avec Clara"})); expect(screen.getByRole("log")).toHaveTextContent("Vous pouvez voir les plans ici.");
    rerender(<ClaraVoiceDock {...props} context={{...context,path:"/entrepreneur/plan-personnalise/id",step:"Proposition"}}/>);
    expect(screen.queryByRole("log")).toBeNull(); expect(pause).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Mettre la voix en pause"})); expect(pause).toHaveBeenCalledOnce();
    rerender(<ClaraVoiceDock {...props} paused/>); fireEvent.click(screen.getByRole("button",{name:"Reprendre la voix"})); expect(resume).toHaveBeenCalledOnce();
  });
});
