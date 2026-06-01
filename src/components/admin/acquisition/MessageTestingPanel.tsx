import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, XCircle, Mail, MessageSquare } from "lucide-react";

type Variant = {
  id: string;
  channel: "email" | "sms";
  variant_index: number;
  angle: string;
  tone: string | null;
  subject: string | null;
  body: string;
  cta: string | null;
  predicted_score: number | null;
  status: string;
};

const ANGLE_LABELS: Record<string, string> = {
  ai_gap: "Faille IA",
  competitor: "Concurrence",
  territory: "Territoire",
  reputation: "Réputation",
  revenue: "Revenue",
};

export function MessageTestingPanel({
  prospect,
  onRefresh,
}: {
  prospect: { id: string; business_name: string };
  onRefresh: () => void;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contractor_outreach_tests")
      .select("*")
      .eq("prospect_id", prospect.id)
      .order("channel")
      .order("variant_index");
    setVariants((data as Variant[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [prospect.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("acq-generate-test-variants", {
        body: { prospect_id: prospect.id, force_regenerate: true },
      });
      if (error) throw error;
      toast.success("10 variantes générées (5 email + 5 SMS)");
      await load();
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("contractor_outreach_tests")
      .update({
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Variante ${status === "approved" ? "approuvée" : "rejetée"}`);
      load();
    }
  };

  if (loading) {
    return <div className="text-zinc-400 text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…</div>;
  }

  if (variants.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 p-8 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-zinc-500 mb-3" />
        <p className="text-zinc-400 mb-4">Aucune variante générée pour ce prospect.</p>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Générer 5 emails + 5 SMS
        </Button>
      </Card>
    );
  }

  const emails = variants.filter((v) => v.channel === "email");
  const sms = variants.filter((v) => v.channel === "sms");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Régénérer
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Emails ({emails.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {emails.map((v) => (
            <VariantCard key={v.id} v={v} onAction={setStatus} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> SMS ({sms.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sms.map((v) => (
            <VariantCard key={v.id} v={v} onAction={setStatus} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VariantCard({
  v,
  onAction,
}: {
  v: Variant;
  onAction: (id: string, status: "approved" | "rejected") => void;
}) {
  const scoreColor =
    (v.predicted_score ?? 0) >= 70 ? "text-emerald-400" :
    (v.predicted_score ?? 0) >= 50 ? "text-amber-400" : "text-red-400";
  const statusBadge =
    v.status === "approved" ? "bg-emerald-700 text-emerald-100" :
    v.status === "rejected" ? "bg-red-700 text-red-100" :
    v.status === "dispatched" ? "bg-blue-700 text-blue-100" :
    "bg-zinc-700 text-zinc-200";

  return (
    <Card className="bg-white/5 border-white/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {ANGLE_LABELS[v.angle] ?? v.angle} · {v.tone}
        </Badge>
        <span className={`text-sm font-mono font-semibold ${scoreColor}`}>
          {v.predicted_score ?? "?"}
        </span>
      </div>
      {v.subject && (
        <div className="text-sm font-semibold mb-1 line-clamp-1">{v.subject}</div>
      )}
      <div className="text-xs text-zinc-300 line-clamp-5 flex-1 whitespace-pre-wrap">
        {v.body}
      </div>
      {v.cta && (
        <div className="text-xs text-blue-400 mt-2 font-medium">→ {v.cta}</div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <Badge className={statusBadge}>{v.status}</Badge>
        {v.status === "draft" && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAction(v.id, "rejected")}>
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAction(v.id, "approved")}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
