import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
const mocks = vi.hoisted(() => ({ start: vi.fn(), invoke: vi.fn() }));
vi.mock("@/services/clara/claraSession", () => ({ startOrResumeClaraSession: mocks.start }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { getAddressAccessToken } from "@/services/addressAccessToken";
function Field({ onSelect }: { onSelect: (...args: unknown[]) => void }) {
  const [value,setValue]=useState("");
  return <GooglePlacesInput value={value} onChange={setValue} onPlaceSelect={onSelect} />;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("adresse visiteur — protocole existant", () => {
  it("confirme le jeton en base même si un jeton existe déjà localement", async () => {
    mocks.start.mockResolvedValue({ session_token: "confirmed-guest-session" });
    expect(await getAddressAccessToken()).toBe("confirmed-guest-session");
    expect(mocks.start).toHaveBeenCalledWith({ entrypoint: "address_input" });
  });
  it("visiteur obtient prédictions et détails via la session invitée sans auth client", async () => {
    mocks.start.mockResolvedValue({ session_token: "confirmed-guest-session" });
    mocks.invoke.mockImplementation(async (_name,{body}) => ({data: body.place_id
      ? {result:{place_id:"qa-place",address:"123 rue QA",city:"Laval",latitude:45,longitude:-73,postal_code:"H7A 1A1"}}
      : {predictions:[{place_id:"qa-place",description:"123 rue QA, Laval"}]},error:null}));
    const selected=vi.fn();render(<Field onSelect={selected} />);
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"123 rue QA"}});
    fireEvent.mouseDown(await screen.findByRole("option"));
    await waitFor(() => expect(selected).toHaveBeenCalledWith({address:"123 rue QA",city:"Laval",lat:45,lng:-73,postalCode:"H7A 1A1"}));
    for(const [,options] of mocks.invoke.mock.calls) expect(options.body.session_token).toBe("confirmed-guest-session");
  });
  it("détails échoués ne fabriquent aucune adresse confirmée", async () => {
    mocks.start.mockResolvedValue({ session_token: "confirmed-guest-session" });
    mocks.invoke.mockImplementation(async (_name,{body}) => body.place_id ? {data:null,error:new Error("blocked")} : {data:{predictions:[{place_id:"qa-place",description:"123 rue QA"}]},error:null});
    const selected=vi.fn();render(<Field onSelect={selected} />);
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"123 rue QA"}});
    fireEvent.mouseDown(await screen.findByRole("option"));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
    expect(selected).not.toHaveBeenCalled();
  });
  it("fournisseur indisponible garde la saisie et zéro suggestion", async () => {
    mocks.start.mockResolvedValue({ session_token: "confirmed-guest-session" });
    mocks.invoke.mockResolvedValue({data:{error:"API_KEY_MISSING"},error:null});
    render(<Field onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"123 rue QA"}});
    await screen.findByText(/suggestions sont indisponibles/);
    expect(screen.queryByRole("option")).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("123 rue QA");
  });
});