/**
 * PageAdminQrCodes — /admin/qr-codes
 * Admin listing of every user-generated QR code with scan totals and toggle.
 */
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Power } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  user_id: string;
  qr_type: string | null;
  short_code: string;
  destination_url: string;
  is_active: boolean | null;
  created_at: string | null;
  label: string | null;
  scans: number;
  last_scan: string | null;
  owner_email: string | null;
}

export default function PageAdminQrCodes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: links } = await supabase
      .from("qr_user_links")
      .select("id, user_id, qr_type, short_code, destination_url, is_active, created_at, label")
      .order("created_at", { ascending: false })
      .limit(200);
    const linkRows = (links || []) as any[];
    const ids = linkRows.map((l) => l.id);
    const userIds = Array.from(new Set(linkRows.map((l) => l.user_id)));

    const counts: Record<string, number> = {};
    const lastScans: Record<string, string> = {};
    if (ids.length) {
      const { data: scans } = await supabase
        .from("qr_scans")
        .select("link_id, created_at")
        .in("link_id", ids)
        .order("created_at", { ascending: false });
      (scans || []).forEach((s: any) => {
        if (!s.link_id) return;
        counts[s.link_id] = (counts[s.link_id] || 0) + 1;
        if (!lastScans[s.link_id]) lastScans[s.link_id] = s.created_at;
      });
    }

    const emails: Record<string, string> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      (profiles || []).forEach((p: any) => { emails[p.user_id] = p.email; });
    }

    setRows(linkRows.map((l) => ({
      ...l,
      scans: counts[l.id] || 0,
      last_scan: lastScans[l.id] || null,
      owner_email: emails[l.user_id] || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(r: Row) {
    const { error } = await supabase.from("qr_user_links").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error("Échec"); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
  }

  const visible = rows.filter((r) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (r.short_code.toLowerCase().includes(f)
      || (r.qr_type || "").toLowerCase().includes(f)
      || (r.owner_email || "").toLowerCase().includes(f));
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Helmet><title>QR Codes — Admin UNPRO</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">QR Codes utilisateurs</h1>
      <Input placeholder="Filtrer par code, type, email…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-4 max-w-md" />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Propriétaire</th>
              <th className="p-3">Type</th>
              <th className="p-3">Short code</th>
              <th className="p-3">Destination</th>
              <th className="p-3 text-right">Scans</th>
              <th className="p-3">Dernier scan</th>
              <th className="p-3">Actif</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucun QR</td></tr>
            ) : visible.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.owner_email || r.user_id.slice(0, 8)}</td>
                <td className="p-3">{r.qr_type || r.label || "—"}</td>
                <td className="p-3 font-mono">{r.short_code}</td>
                <td className="p-3 max-w-[260px] truncate text-muted-foreground">{r.destination_url}</td>
                <td className="p-3 text-right font-bold">{r.scans}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.last_scan ? new Date(r.last_scan).toLocaleString("fr-CA") : "—"}</td>
                <td className="p-3">{r.is_active ? <span className="text-emerald-500">●</span> : <span className="text-muted-foreground">○</span>}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => toggle(r)} aria-label="Toggle">
                    <Power className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
