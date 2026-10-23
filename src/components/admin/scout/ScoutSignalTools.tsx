/**
 * UNPRO Radar — admin signal intake + per-capture review (person ↔ company links).
 * Every action goes through scout-ingest (admin-gated). Nothing here sends a message.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { buildSearchLinks } from "../../../../supabase/functions/_shared/scoutRadar";

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("scout-ingest", { body });
  if (error) throw new Error((data as { error?: string })?.error ?? "Action refusée");
  return data as Record<string, any>;
}

const STATUS_LABEL: Record<string, string> = {
  review: "Signal reçu — en révision",
  homeowner_review: "Demande propriétaire — pour Clara, en révision",
  new: "Nouvelle piste (non vérifiée)",
  duplicate: "Déjà connue — provenance ajoutée",
  already_captured: "Déjà capté — aucun doublon créé",
};

export const SIGNAL_LABEL: Record<string, string> = {
  contractor_offer: "Entrepreneur",
  homeowner_request: "Propriétaire",
  uncertain: "Incertain",
};

export function ScoutSignalIntake({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [context, setContext] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocr, setOcr] = useState<Array<{ commenter_name?: string; raw_comment?: string }>>([]);

  async function submit(raw: string, who: string) {
    if (!raw.trim()) { toast.error("Collez le message exact."); return; }
    setBusy(true);
    try {
      const r = await call({
        action: "capture", extraction_mode: "manual", raw_text: raw.trim(), author_name: who.trim() || null,
        post_context: context.trim() || null, source_url: url.trim() || null, post_url: url.trim() || null,
      });
      toast.success(STATUS_LABEL[r.status] ?? `Résultat : ${r.status}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function readPhoto(file: File) {
    if (file.size > 6_000_000) { toast.error("Image trop lourde (6 Mo max)."); return; }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("fb-extract-comments", {
        body: { preview_only: true, screenshots: [dataUrl] },
      });
      if (error) throw error;
      const list = (data?.comments ?? []) as typeof ocr;
      setOcr(list);
      if (!list.length) toast.message("Aucun commentaire lisible sur cette capture.");
    } catch {
      toast.error("Lecture de la capture impossible pour l'instant.");
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Ajouter un signal</h2>
        <p className="text-xs text-muted-foreground">Message exact, auteur et source. Rien n'est envoyé : chaque signal reste en révision.</p>
      </div>
      <Textarea placeholder="Message exact (ex. « Disponible »)" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input placeholder="Auteur affiché" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <Input placeholder="URL source (publication)" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
      </div>
      <Textarea placeholder="Publication d'origine (contexte, facultatif)" value={context} onChange={(e) => setContext(e.target.value)} rows={2} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => submit(text, author)}>{busy ? "Analyse en cours…" : "Analyser le signal"}</Button>
        <label className="inline-flex">
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0])} />
          <span className="inline-flex items-center rounded-md border border-border px-3 text-sm cursor-pointer min-h-10">Lire une capture d'écran</span>
        </label>
      </div>
      {ocr.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Commentaires lus — vérifiez avant d'analyser :</p>
          {ocr.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 p-2 text-sm">
              <span className="font-medium">{c.commenter_name ?? "Auteur inconnu"}</span>
              <span className="text-muted-foreground break-words min-w-0 flex-1">« {c.raw_comment} »</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => submit(String(c.raw_comment ?? ""), String(c.commenter_name ?? ""))}>Analyser</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type Link = {
  id: string; company_name: string; person_name: string | null; relation: string; status: string;
  source: string; evidence: string | null; evidence_url: string | null; public_phone: string | null;
  public_email: string | null; public_website: string | null; city: string | null; prospect_id: string | null;
};

const RELATION_LABEL: Record<string, string> = {
  employee_declared: "Se dit employé (non propriétaire)",
  owner_declared: "Se dit propriétaire (à prouver)",
  mentioned: "Mentionnée",
  candidate_manual: "Candidate ajoutée par un admin",
};
const LINK_STATUS: Record<string, string> = { inferred: "Inféré", pending: "En attente", verified: "Vérifié", rejected: "Rejeté" };

export function ScoutCaptureReview({ captureId, author, city, reviewStatus }: { captureId: string; author: string | null; city: string | null; reviewStatus: string }) {
  const qc = useQueryClient();
  const [cand, setCand] = useState("");
  const [proof, setProof] = useState<Record<string, { url: string; phone: string; email: string; site: string }>>({});
  const links = useQuery({
    queryKey: ["scout-links", captureId],
    queryFn: async () => {
      const { data, error } = await supabase.from("scout_entity_links").select("*").eq("capture_id", captureId).order("created_at");
      if (error) throw error;
      return (data ?? []) as Link[];
    },
  });
  const refresh = () => { links.refetch(); qc.invalidateQueries({ queryKey: ["scout-captures"] }); };
  const run = async (body: Record<string, unknown>, ok: string) => {
    try { const r = await call(body); toast.success(r.status ? `${ok}` : ok); refresh(); }
    catch (e) { toast.error((e as Error).message === "evidence_url_required" ? "Source https requise pour vérifier." : (e as Error).message); }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {buildSearchLinks({ person_name: author, city }).map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="underline">{l.label} (auteur)</a>
        ))}
        <span className="text-muted-foreground">Enrichissement automatique non activé — recherche manuelle, statut en attente.</span>
      </div>

      {(links.data ?? []).map((l) => {
        const p = proof[l.id] ?? { url: "", phone: "", email: "", site: "" };
        const set = (k: keyof typeof p, v: string) => setProof((s) => ({ ...s, [l.id]: { ...p, [k]: v } }));
        return (
          <div key={l.id} className="rounded-lg border border-border/50 p-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{l.company_name}</span>
              <Badge variant="outline">{RELATION_LABEL[l.relation] ?? l.relation}</Badge>
              <Badge variant={l.status === "verified" ? "default" : "secondary"}>{LINK_STATUS[l.status] ?? l.status}</Badge>
              {l.prospect_id && <Badge>Transférée au pipeline</Badge>}
            </div>
            {l.evidence && <p className="text-xs text-muted-foreground">Preuve : « {l.evidence} »</p>}
            {l.evidence_url && <a className="text-xs underline break-all" href={l.evidence_url} target="_blank" rel="noreferrer">Source de vérification</a>}
            {(l.public_phone || l.public_email || l.public_website) && (
              <p className="text-xs">Coordonnées publiques sourcées : {[l.public_phone, l.public_email, l.public_website].filter(Boolean).join(" · ")}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {buildSearchLinks({ company_name: l.company_name, city: l.city }).map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="underline">{s.label}</a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">La licence RBQ d'une entreprise n'est jamais attribuée à la personne.</p>
            {l.status !== "verified" && l.status !== "rejected" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Source https du lien (obligatoire)" value={p.url} onChange={(e) => set("url", e.target.value)} />
                <Input placeholder="Téléphone pro public" value={p.phone} onChange={(e) => set("phone", e.target.value)} />
                <Input placeholder="Courriel pro public" value={p.email} onChange={(e) => set("email", e.target.value)} />
                <Input placeholder="Site web" value={p.site} onChange={(e) => set("site", e.target.value)} />
                <div className="flex gap-2 sm:col-span-2">
                  <Button size="sm" onClick={() => run({ action: "review_link", link_id: l.id, decision: "verified", evidence_url: p.url, public_phone: p.phone || null, public_email: p.email || null, public_website: p.site || null, city }, "Lien vérifié")}>Valider la correspondance</Button>
                  <Button size="sm" variant="outline" onClick={() => run({ action: "review_link", link_id: l.id, decision: "rejected" }, "Lien rejeté")}>Rejeter</Button>
                </div>
              </div>
            )}
            {l.status === "verified" && !l.prospect_id && (
              <Button size="sm" onClick={() => run({ action: "promote_link", link_id: l.id }, "Transférée au pipeline (non vérifiée, aucun envoi)")}>Transférer au pipeline</Button>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Entreprise candidate" value={cand} onChange={(e) => setCand(e.target.value)} className="max-w-xs" />
        <Button size="sm" variant="outline" disabled={!cand.trim()} onClick={() => { run({ action: "add_candidate", capture_id: captureId, company_name: cand.trim() }, "Candidate ajoutée (en attente)"); setCand(""); }}>Ajouter</Button>
        {reviewStatus !== "dismissed" && (
          <Button size="sm" variant="ghost" onClick={() => run({ action: "set_capture_review", capture_id: captureId, review_status: "dismissed" }, "Signal classé")}>Classer sans suite</Button>
        )}
      </div>
    </div>
  );
}
