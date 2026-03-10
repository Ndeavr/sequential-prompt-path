import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminDocuments } from "@/hooks/useAdmin";

const AdminDocuments = () => {
  const { data: docs, isLoading } = useAdminDocuments();
  const [bucketFilter, setBucketFilter] = useState("all");

  const buckets = [...new Set((docs ?? []).map((d) => d.bucket))] as string[];
  const filtered = bucketFilter === "all" ? (docs ?? []) : (docs ?? []).filter((d) => d.bucket === bucketFilter);

  return (
    <AdminLayout>
      <PageHeader title="Documents" description="Tous les documents téléversés" />
      <div className="flex gap-3 mb-4">
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Bucket" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les buckets</SelectItem>
            {buckets.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <LoadingState /> : !filtered.length ? <EmptyState message="Aucun document." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.bucket}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_size ? `${(d.file_size / 1024).toFixed(0)} Ko` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDocuments;
