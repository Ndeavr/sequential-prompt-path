import { useState } from "react";
import { useRecruitmentProspects } from "@/hooks/useRecruitmentProspects";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Star } from "lucide-react";

const qualBadge: Record<string, string> = {
  valid: "bg-green-500/10 text-green-500 border-green-500/30",
  new: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  excluded: "bg-red-500/10 text-red-500 border-red-500/30",
  duplicate: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low_confidence: "bg-orange-500/10 text-orange-500 border-orange-500/30",
};

const outreachBadge: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  contacted: "bg-amber-500/10 text-amber-400",
  replied: "bg-green-500/10 text-green-400",
  stopped: "bg-red-500/10 text-red-400",
};

export default function PageAdminRecruitmentProspects() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [qualification, setQualification] = useState<string>("");

  const { prospects } = useRecruitmentProspects({
    search: search || undefined,
    category_slug: category || undefined,
    qualification_status: qualification || undefined,
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Prospects</h1>
          <p className="text-sm text-muted-foreground">{prospects.data?.length ?? 0} prospects</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="isolation">Isolation</SelectItem>
              <SelectItem value="toiture">Toiture</SelectItem>
              <SelectItem value="asphalte">Asphalte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={qualification} onValueChange={setQualification}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="valid">Qualifié</SelectItem>
              <SelectItem value="new">Nouveau</SelectItem>
              <SelectItem value="excluded">Exclu</SelectItem>
              <SelectItem value="low_confidence">Faible confiance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
          {prospects.isLoading ? (
            <CardContent className="p-4"><Skeleton className="h-60" /></CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Avis</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Outreach</TableHead>
                    <TableHead>Paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.data?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.business_name}</p>
                          <p className="text-xs text-muted-foreground">{p.owner_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.city}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{p.category_slug}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {p.review_rating} ({p.review_count})
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${qualBadge[p.qualification_status] || ""}`}>{p.qualification_status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${outreachBadge[p.outreach_status] || ""}`}>{p.outreach_status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{p.payment_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
