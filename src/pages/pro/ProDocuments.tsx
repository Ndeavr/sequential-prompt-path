import { useRef } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContractorDocuments, useUploadContractorDocument } from "@/hooks/useContractor";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const ProDocuments = () => {
  const { data: docs, isLoading } = useContractorDocuments();
  const upload = useUploadContractorDocument();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success("Document téléversé !");
    } catch {
      toast.error("Erreur lors du téléversement.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ContractorLayout>
      <PageHeader
        title="Documents"
        description="Documents de vérification (licence, assurance, etc.)"
        action={
          <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-4 w-4 mr-1" /> {upload.isPending ? "Envoi…" : "Téléverser"}
          </Button>
        }
      />
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      {isLoading ? <LoadingState /> : !docs?.length ? (
        <EmptyState message="Aucun document téléversé." action={<Button variant="outline" onClick={() => inputRef.current?.click()}>Téléverser un document</Button>} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du fichier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_size ? `${(d.file_size / 1024).toFixed(0)} Ko` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProDocuments;
