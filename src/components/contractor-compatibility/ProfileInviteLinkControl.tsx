/**
 * UNPRO — Admin : génération / copie / révocation du lien questionnaire entrepreneur.
 * Le jeton n'est affiché qu'à la création ou à la rotation (il est stocké haché).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Link2, Loader2, RefreshCw, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Invite {
  id: string;
  status: string;
  expires_at: string | null;
  opened_count: number;
  submitted_at: string | null;
  created_at: string;
}

export default function ProfileInviteLinkControl({ contractorId }: { contractorId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const call = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("contractor-profile-invite", {
      body: { action, contractor_id: contractorId, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const refresh = async () => {
    try {
      const res = await call("list");
      setInvites(res.invites ?? []);
    } catch {
      /* silencieux : l'admin peut toujours en créer un */
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [contractorId]);

  const active = invites.find((i) => i.status === "active");

  const run = async (action: "create" | "rotate" | "revoke", inviteId?: string) => {
    setBusy(true);
    try {
      const res = await call(action, inviteId ? { invite_id: inviteId } : {});
      if (res.url) {
        setUrl(res.url);
        await navigator.clipboard.writeText(res.url).catch(() => undefined);
        toast.success("Lien copié");
      } else {
        toast.success("Lien révoqué");
        setUrl(null);
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4" /> Lien questionnaire (sans compte)
        </div>
        {active ? (
          <Badge variant="secondary">
            Actif · {active.opened_count} ouverture(s){active.submitted_at ? " · complété" : ""}
          </Badge>
        ) : (
          <Badge variant="outline">Aucun lien actif</Badge>
        )}
      </div>

      {url && (
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{url}</code>
          <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(url); toast.success("Lien copié"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {!active && (
          <Button size="sm" disabled={busy} onClick={() => void run("create")}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
            Générer le lien questionnaire
          </Button>
        )}
        {active && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("rotate", active.id)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regénérer et copier
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run("revoke", active.id)}>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> Révoquer
            </Button>
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Le lien donne uniquement accès à cette fiche : aucun accès admin, propriétaire, rendez-vous ou paiement.
      </p>
    </div>
  );
}
