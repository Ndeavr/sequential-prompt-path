/**
 * UNPRO — Add Document Dialog
 * Allows homeowners to register documents in the vault (metadata only for now).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

const DOC_TYPES = [
  { value: "quote", label: "Soumission" },
  { value: "invoice", label: "Facture" },
  { value: "warranty", label: "Garantie" },
  { value: "manual", label: "Manuel" },
  { value: "insurance", label: "Assurance" },
  { value: "tax_bill", label: "Compte de taxes" },
  { value: "inspection", label: "Rapport d'inspection" },
  { value: "permit", label: "Permis" },
  { value: "other", label: "Autre" },
];

export default function AddDocumentDialog({ open, onOpenChange, propertyId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    document_type: "quote",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("property_documents").insert({
        property_id: propertyId,
        user_id: user!.id,
        title: form.title,
        document_type: form.document_type,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-documents", propertyId] });
      toast({ title: "Document ajouté ✓" });
      onOpenChange(false);
      setForm({ title: "", document_type: "quote", notes: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type de document</Label>
            <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Soumission toiture 2024" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes optionnelles..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
            {mutation.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
