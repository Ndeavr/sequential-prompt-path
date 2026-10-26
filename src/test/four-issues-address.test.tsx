import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
const mocks = vi.hoisted(() => ({ start: vi.fn(), invoke: vi.fn() }));
vi.mock("@/services/clara/claraSession", () => ({ startOrResumeClaraSession: mocks.start }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { getAddressAccessToken } from "@/services/addressAccessToken";
import GooglePlacesAutocomplete from "@/components/business-import/GooglePlacesAutocomplete";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
function Field({ onSelect }: { onSelect: (...args: unknown[]) => void }) {
  const [value,setValue]=useState("");
  return <GooglePlacesInput value={value} onChange={setValue} onPlaceSelect={onSelect} />;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("adresse visiteur — protocole existant", () => {
  it("business selection preserves establishment mode and guest ownership on details", async () => {
    mocks.start.mockResolvedValue({ session_token: "confirmed-guest-session" });
    mocks.invoke.mockImplementation(async (_name, {body}) => ({data: body.place_id
      ? {result:{place_id:"qa-business",name:"Entreprise QA",phone:"synthetic",website:"https://example.test"}}
      : {predictions:[{place_id:"qa-business",description:"Entreprise QA, Laval",structured_formatting:{main_text:"Entreprise QA",secondary_text:"Laval"}}]},error:null}));
    const selected=vi.fn(); render(<GooglePlacesAutocomplete onSelect={selected} />);
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Entreprise QA"}});
    fireEvent.click(await screen.findByRole("button",{name:/Entreprise QA/}));
    await waitFor(() => expect(selected).toHaveBeenCalled());
    expect(mocks.invoke.mock.calls[1][1].body).toMatchObject({place_id:"qa-business",types:"establishment",session_token:"confirmed-guest-session"});
  });
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
    await waitFor(() => expect(selected).toHaveBeenCalledWith({placeId:"qa-place",provenance:"google_places",address:"123 rue QA",city:"Laval",lat:45,lng:-73,postalCode:"H7A 1A1"}));
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

describe("actual Places handler — intercepted connector only", () => {
  async function setup() {
    let handler: ((req: Request) => Promise<Response>) | undefined;
    const details=vi.fn(async (_id: string, _opts: unknown) => ({data:{place_id:"qa-business",name:"Entreprise QA",phone:"synthetic",website:"https://example.test"},source:"fixture"}));
    const predictions=vi.fn(async (_input: string, _opts: unknown) => ({data:[],source:"fixture"}));
    const chain: any={}; for(const method of ["select","eq","gte","limit"]) chain[method]=()=>chain;
    chain.maybeSingle=async()=>({data:{id:"guest",user_id:null}});
    const source=readFileSync("supabase/functions/google-places-autocomplete/index.ts","utf8").replace(/^import[\s\S]*?;\n/gm,"");
    runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
      exports:{}, serve:(fn: typeof handler)=>{handler=fn;},
      Deno:{env:{get:()=>"synthetic"}},createClient:()=>({from:()=>chain,rpc:async()=>({data:{allowed:true},error:null})}),
      addressCors:()=>({}),guestAddressSessionAllowed:()=>true,getGoogleMapsCredentials:()=>({}),googleConnectorAvailable:()=>true,
      placeDetails:details,placesAutocomplete:predictions,crypto:globalThis.crypto,TextEncoder,Request,Response,Date,console,
    });
    return {details,predictions,async run(body: Record<string, unknown>){if(!handler) throw new Error("missing handler"); return handler(new Request("https://example.test",{method:"POST",body:JSON.stringify({session_token:"confirmed-guest-session",...body})}));}};
  }
  it("business details request name/contact fields; public addresses stay minimal",async()=>{
    const h=await setup();
    await h.run({place_id:"qa-business",types:"establishment"});
    expect(h.details.mock.calls[0][1]).toMatchObject({fields:"id,displayName,formattedAddress,addressComponents,location,nationalPhoneNumber,websiteUri,types"});
    await h.run({place_id:"qa-address"});
    expect(h.details.mock.calls[1][1]).toMatchObject({fields:"id,formattedAddress,addressComponents,location"});
  });
  it("prediction cache separates business and address mode without changing quota",async()=>{
    const h=await setup();
    await h.run({input:"Entreprise QA",types:"establishment"});
    await h.run({input:"Entreprise QA",types:"address"});
    await h.run({input:"Entreprise QA",types:"establishment"});
    expect(h.predictions).toHaveBeenCalledTimes(2);
    expect(h.predictions.mock.calls[0][1]).toMatchObject({types:"establishment"});
    expect(h.predictions.mock.calls[1][1]).toMatchObject({types:"address"});
  });
});