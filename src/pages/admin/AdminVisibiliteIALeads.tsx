/**
 * UNPRO — /admin/demandes-visibilite-ia
 * Demandes provenant de la landing /visibilite-ia-entrepreneurs (table canonique `leads`).
 */
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface LeadRow {
  id: string;
  status: string | null;
  created_at: string;
  payload: Record<string, string | null> | null;
}

export default function AdminVisibiliteIALeads() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-visibility-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, status, created_at, payload")
        .eq("intent", "ai_visibility_audit")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Demandes — Visibilité IA"
        description="Formulaire /visibilite-ia-entrepreneurs — prospects entrants (table leads)"
      />

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState message="Aucune demande pour le moment." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Site Web</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Source / UTM</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l) => {
                const p = l.payload ?? {};
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{p.company_name || "—"}</TableCell>
                    <TableCell>{p.contact_name || "—"}</TableCell>
                    <TableCell>
                      {p.phone ? <a href={`tel:${p.phone}`} className="text-primary underline">{p.phone}</a> : "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{p.website || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.primary_service || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[p.utm_source, p.utm_medium, p.utm_campaign].filter(Boolean).join(" / ") || p.source || "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.status || "new"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("fr-CA")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
}
