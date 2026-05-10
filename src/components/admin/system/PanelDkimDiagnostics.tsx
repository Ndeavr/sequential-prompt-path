import { useState } from "react";
import type { DomainDiagnostic } from "@/hooks/useOutboundHealth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Copy, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const REASON_LABEL: Record<string, string> = {
  ok: "DKIM valide",
  selector_missing: "Sélecteur DKIM introuvable",
  invalid_public_key: "Clé DKIM invalide",
  propagation_pending: "Propagation DNS en cours",
  malformed_txt: "Enregistrement DKIM mal formé",
  dns_timeout: "Timeout DNS",
  signature_mismatch: "Signature DKIM non concordante",
  wrong_domain: "Domaine DKIM non aligné",
  proxied_record: "Enregistrement proxifié (CNAME caché)",
  not_checked: "Non vérifié",
};

function reasonStyle(reason: string) {
  if (reason === "ok") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  if (reason === "propagation_pending" || reason === "dns_timeout") return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copié"));
}

function DomainBlock({ d }: { d: DomainDiagnostic }) {
  const [open, setOpen] = useState(false);
  const dkimReason = d.dkim.reason || "not_checked";
  const dkimLabel = d.dkim.reasonLabel || REASON_LABEL[dkimReason] || dkimReason;

  const checks = [
    { label: "SPF", ok: d.spf.valid, reason: d.spf.reason, record: d.spf.record },
    { label: "DKIM", ok: d.dkim.valid, reason: dkimReason, record: d.dkim.record, custom: dkimLabel },
    { label: "DMARC", ok: d.dmarc.valid, reason: d.dmarc.reason, record: d.dmarc.record },
    { label: "MX", ok: d.mx.valid, reason: d.mx.valid ? "ok" : "mx_missing" },
  ];

  return (
    <div className="rounded-lg border bg-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{d.domain}</div>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Détails
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {checks.map((c) => (
          <div key={c.label} className={`rounded border px-2 py-1.5 ${reasonStyle(c.reason)}`}>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
              {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {c.label}
            </div>
            <div className="text-[11px] font-medium mt-0.5 truncate">
              {(c as any).custom ?? REASON_LABEL[c.reason] ?? c.reason}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          {/* DKIM detail */}
          <div className="text-[11px] space-y-1">
            <div className="font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> DKIM</div>
            <div className="text-muted-foreground">Sélecteur utilisé · <span className="font-mono text-foreground">{d.dkim.selector ?? "—"}</span></div>
            <div className="text-muted-foreground">Sélecteurs essayés · {d.dkim.selectorsTried?.map((s) => s.selector).join(", ") || "—"}</div>
            {d.dkim.record && (
              <div className="rounded bg-muted/40 p-1.5 font-mono text-[10px] break-all max-h-20 overflow-auto">
                {d.dkim.record}
              </div>
            )}
            <div className="text-muted-foreground">Longueur clé publique · {d.dkim.publicKeyLength || 0} chars</div>
          </div>

          {/* Alignment */}
          <div className="text-[11px] space-y-1">
            <div className="font-semibold">Alignement</div>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <div>From ↔ DKIM · {d.alignment.from_dkim_aligned ? "✓" : "✗"}</div>
              <div>SPF aligné · {d.alignment.spf_aligned ? "✓" : "✗"}</div>
              <div>Return-Path · {d.alignment.return_path_domain}</div>
              <div>SMTP host · {d.alignment.smtp_hostname}</div>
            </div>
          </div>

          {/* SPF/DMARC records */}
          {d.spf.record && (
            <div className="text-[11px]">
              <div className="font-semibold">SPF</div>
              <div className="rounded bg-muted/40 p-1.5 font-mono text-[10px] break-all">{d.spf.record}</div>
            </div>
          )}
          {d.dmarc.record && (
            <div className="text-[11px]">
              <div className="font-semibold">DMARC</div>
              <div className="rounded bg-muted/40 p-1.5 font-mono text-[10px] break-all">{d.dmarc.record}</div>
            </div>
          )}

          {/* Fix panel */}
          {d.suggestedDkim && (
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] space-y-1">
              <div className="font-semibold text-amber-500">Correctif DKIM à publier</div>
              <div className="font-mono text-[10px] break-all bg-background/40 p-1.5 rounded">{d.suggestedDkim}</div>
              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => copy(d.suggestedDkim!)}>
                <Copy className="h-3 w-3 mr-1" /> Copier
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PanelDkimDiagnostics({ domains }: { domains?: DomainDiagnostic[] }) {
  if (!domains || domains.length === 0) {
    return <div className="text-xs text-muted-foreground">Aucun domaine analysé.</div>;
  }
  return (
    <div className="space-y-2">
      {domains.map((d) => <DomainBlock key={d.domain} d={d} />)}
    </div>
  );
}
