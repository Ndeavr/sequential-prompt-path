/**
 * UNPRO — Admin Domain Intelligence Dashboard
 * Monitoring all contractor domains, priorities, notes.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Globe, AlertTriangle, Shield, Search, RefreshCw, MessageSquare, Filter, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminDomainIntelligence = () => {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterScore, setFilterScore] = useState("all");

  const fetchDomains = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contractor_domains")
        .select("*, contractors(business_name, slug)")
        .order("last_checked_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("live_status", filterStatus);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      setDomains(data || []);
    } catch (e: any) {
      toast.error("Erreur chargement domaines: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, [filterStatus]);

  const filtered = domains.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = d.normalized_domain?.toLowerCase().includes(q) ||
        (d.contractors as any)?.business_name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterScore === "low" && (d.technical_score || 100) > 50) return false;
    if (filterScore === "ssl_broken" && d.ssl_status !== "missing") return false;
    if (filterScore === "urgent") {
      if (d.live_status !== "down" && d.ssl_status !== "missing" && (d.technical_score || 100) > 30) return false;
    }
    return true;
  });

  const priorities = filtered.filter(
    (d) => d.live_status === "down" || d.ssl_status === "missing" || (d.technical_score || 100) < 30
  );

  const scoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 70) return "text-success";
    if (score >= 45) return "text-accent";
    return "text-destructive";
  };

  const statusBadge = (status: string | null) => {
    const map: Record<string, { label: string; cls: string }> = {
      live: { label: "En ligne", cls: "bg-success/10 text-success" },
      partial: { label: "Partiel", cls: "bg-yellow-500/10 text-yellow-600" },
      down: { label: "Hors ligne", cls: "bg-destructive/10 text-destructive" },
    };
    const s = map[status || ""] || { label: status || "—", cls: "bg-muted text-muted-foreground" };
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Domain Intelligence — Admin | UNPRO</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Domain Intelligence — Admin</h1>
            <p className="text-sm text-muted-foreground">{domains.length} domaines analysés</p>
          </div>
          <Button variant="outline" onClick={fetchDomains}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Rafraîchir
          </Button>
        </div>

        {/* Priority Queue */}
        {priorities.length > 0 && (
          <Card className="mb-6 border-destructive/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                À traiter en priorité — {priorities.length} domaine{priorities.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {priorities.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {statusBadge(d.live_status)}
                      <span className="font-mono text-xs">{d.normalized_domain}</span>
                      <span className="text-muted-foreground text-xs">— {(d.contractors as any)?.business_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.ssl_status === "missing" && <Badge variant="destructive" className="text-[10px]">SSL ✗</Badge>}
                      <span className={`text-xs font-bold ${scoreColor(d.technical_score)}`}>{d.technical_score ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Rechercher domaine ou entrepreneur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="live">En ligne</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
              <SelectItem value="down">Hors ligne</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous scores</SelectItem>
              <SelectItem value="low">Score &lt; 50</SelectItem>
              <SelectItem value="ssl_broken">SSL cassé</SelectItem>
              <SelectItem value="urgent">Urgences</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Entrepreneur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Tech</TableHead>
                  <TableHead className="text-center">SEO</TableHead>
                  <TableHead className="text-center">AISEO</TableHead>
                  <TableHead className="text-center">Autorité</TableHead>
                  <TableHead className="text-center">Confiance</TableHead>
                  <TableHead>Dernière vérif.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucun domaine trouvé</TableCell></TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{d.normalized_domain}</span>
                          {d.final_url && (
                            <a href={d.final_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{(d.contractors as any)?.business_name || "—"}</TableCell>
                      <TableCell>{statusBadge(d.live_status)}</TableCell>
                      <TableCell className={`text-center text-xs font-bold ${scoreColor(d.technical_score)}`}>{d.technical_score ?? "—"}</TableCell>
                      <TableCell className={`text-center text-xs font-bold ${scoreColor(d.seo_score)}`}>{d.seo_score ?? "—"}</TableCell>
                      <TableCell className={`text-center text-xs font-bold ${scoreColor(d.aiseo_score)}`}>{d.aiseo_score ?? "—"}</TableCell>
                      <TableCell className={`text-center text-xs font-bold ${scoreColor(d.authority_score)}`}>{d.authority_score ?? "—"}</TableCell>
                      <TableCell className={`text-center text-xs font-bold ${scoreColor(d.confidence_score)}`}>{d.confidence_score ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.last_checked_at ? new Date(d.last_checked_at).toLocaleDateString("fr-CA") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDomainIntelligence;
