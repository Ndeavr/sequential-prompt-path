import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateSelf } from "@/hooks/useAffiliateSelf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { activationCommissionCents, formatCad, resolveRate } from "../offers";
import { loadProposal, saveProposal, proposalClientLink, type ProposalKind } from "../proposalService";
import type { PricingIntakeInput } from "@/services/contractorPricingQuoteService";

export default function AffiliateOffersPanel({ prospectId, companyName, trade, city }: { prospectId: string; companyName?: string | null; trade?: string | null; city?: string | null }) {
 const { data: affiliate } = useAffiliateSelf();
 const qc = useQueryClient();
 const [kind, setKind] = useState<ProposalKind>("activation_350");
 const [inputs, setInputs] = useState<Partial<PricingIntakeInput>>({ trade_primary: trade ?? "", city: city ?? "" });
 const [busy, setBusy] = useState(false);
 const [dirty, setDirty] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const proposal = useQuery({ queryKey: ["affiliate-proposal", affiliate?.user_id, prospectId], enabled: Boolean(affiliate), queryFn: () => loadProposal(prospectId), retry: false });
 const rateQ = useQuery({ queryKey: ["affiliate-rate", affiliate?.id], enabled: Boolean(affiliate), queryFn: async () => {
  if (!affiliate) return null;
  const { data, error } = await supabase.from("affiliates").select("commission_rate, commission_pct").eq("id",affiliate.id).maybeSingle();
  if (error) throw error;
  return resolveRate(data);
 }});
 useEffect(() => { if (proposal.data) { setKind(proposal.data.offer_type); setInputs(proposal.data.inputs); setDirty(false); } }, [proposal.data]);
 const update = (patch: Partial<PricingIntakeInput>) => { setInputs(v => ({ ...v, ...patch })); setDirty(true); setError(null); };
 const persist = async () => {
  setBusy(true); setError(null);
  try {
   const saved = await saveProposal(prospectId, kind, inputs);
   qc.setQueryData(["affiliate-proposal", affiliate?.user_id, prospectId], saved);
   setDirty(false); toast.success("Brouillon sauvegardé. Aucun message envoyé.");
  } catch(e) { setError(e instanceof Error ? e.message : "Sauvegarde non confirmée. Réessayez."); }
  finally { setBusy(false); }
 };
 const url = proposal.data && !dirty ? proposalClientLink(proposal.data, window.location.origin) : null;
 const fields: { key: keyof PricingIntakeInput; label: string; percent?: boolean }[] = [
  {key:"target_monthly_appointments",label:"Rendez-vous souhaités par mois"},
  {key:"monthly_capacity",label:"Capacité par mois"},
  {key:"average_project_value",label:"Panier moyen ($ HT)"},
  {key:"close_rate_estimate",label:"Conversion (%)",percent:true},
 ];
 return <section id="affiliate-offer" className="rounded-2xl border border-border bg-card p-5 space-y-4">
  <h2 className="text-base font-semibold">Offres pour {companyName ?? "cette entreprise"}</h2>
  <div className="flex flex-col gap-2" aria-label="Choisir l’offre">
   <Button variant={kind === "activation_350" ? "default" : "outline"} onClick={() => {setKind("activation_350");setDirty(true);}}>Activation 350 $ + taxes</Button>
   <Button variant={kind === "personnalise" ? "default" : "outline"} onClick={() => {setKind("personnalise");setDirty(true);}}>Plan personnalisé</Button>
  </div>
  {kind === "activation_350" ? <p className="text-sm text-muted-foreground">Paiement unique : 350 $ HT; 402,41 $ si TPS/TVQ applicables. Profil et présence IA UNPRO 12 mois. Publication après vérification. Aucun rendez-vous inclus par défaut.</p> : <>
   <p className="text-sm text-muted-foreground">Objectifs déclarés à confirmer par l’entreprise. Prix, volume et frais d’activation calculés par le serveur avant paiement; aucune double activation.</p>
   <label className="block text-sm">Services / métier<Input value={inputs.trade_primary ?? ""} maxLength={160} onChange={e=>update({trade_primary:e.target.value})}/></label>
   <label className="block text-sm">Territoire / ville<Input value={inputs.city ?? ""} maxLength={160} onChange={e=>update({city:e.target.value})}/></label>
   {fields.map(f=><label key={f.key} className="block text-sm">{f.label}<Input type="number" inputMode="decimal" value={typeof inputs[f.key] === "number" ? Number(inputs[f.key])*(f.percent ? 100 : 1) : ""} onChange={e=>update({[f.key]:e.target.value === "" ? undefined : Number(e.target.value)/(f.percent ? 100 : 1)})}/></label>)}
   <label className="block text-sm">Types de projets (séparés par des virgules)<Input value={inputs.preferred_project_types?.join(", ") ?? ""} maxLength={500} onChange={e=>update({preferred_project_types:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></label>
  </>}
  {proposal.isLoading && <p role="status">Lecture du brouillon…</p>}
  {(error || proposal.error) && <div role="alert" className="text-sm text-destructive"><p>{error ?? proposal.error?.message}</p><Button variant="outline" onClick={()=>void proposal.refetch()}>Réessayer la lecture</Button></div>}
  <Button className="w-full" disabled={busy || !affiliate || proposal.isLoading || Boolean(proposal.error)} onClick={()=>void persist()}>{busy ? "Sauvegarde…" : "Sauvegarder le brouillon et préparer l’aperçu"}</Button>
  {url && <div className="space-y-2 border-t border-border pt-3">
   <p className="text-sm font-semibold">Brouillon sauvegardé — aucun envoi</p>
   <p className="text-xs text-muted-foreground">Prochaine action : vérifier l’aperçu client. Le contact reste soumis aux autorisations de votre dossier.</p>
   <div className="flex gap-2"><Button variant="outline" size="sm" onClick={async()=>{try {await navigator.clipboard.writeText(url);toast.success("Lien copié");} catch {toast.error("Copie impossible. Ouvrez l’aperçu.");}}}><Copy className="mr-1 h-4 w-4"/>Copier le lien</Button><Button variant="outline" size="sm" onClick={()=>window.open(url,"_blank","noopener,noreferrer")}><ExternalLink className="mr-1 h-4 w-4"/>Aperçu client</Button></div>
  </div>}
  <div className="border-t border-border pt-3 space-y-1 text-sm">
   <h3 className="font-semibold">Commissions</h3>
   <p>Estimée — activation unique HT : <strong>{formatCad(activationCommissionCents(rateQ.data ?? null))}</strong></p>
   <p>Récurrente : à déterminer selon le devis et les conditions confirmées.</p>
   <p>Confirmée : à déterminer dans le registre de commissions.</p>
   {rateQ.error && <p className="text-destructive">Lecture du taux impossible. Réessayez avant de communiquer une estimation.</p>}
  </div>
 </section>;
}
