import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Share2, UserPlus, Trash2, Mail, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SharePropertyDialogProps {
  propertyId: string;
}

interface PropertyShare {
  id: string;
  shared_with_email: string;
  role: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
}

export default function SharePropertyDialog({ propertyId }: SharePropertyDialogProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["property-shares", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_shares")
        .select("*")
        .eq("property_id", propertyId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PropertyShare[];
    },
    enabled: open && !!propertyId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (inviteEmail: string) => {
      const { error } = await supabase.from("property_shares").insert({
        property_id: propertyId,
        owner_user_id: user!.id,
        shared_with_email: inviteEmail.toLowerCase().trim(),
        role: "viewer",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation envoyée");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["property-shares", propertyId] });
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Cette personne a déjà été invitée");
      } else {
        toast.error("Erreur lors de l'invitation");
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from("property_shares").delete().eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Accès révoqué");
      qc.invalidateQueries({ queryKey: ["property-shares", propertyId] });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate(email);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Partager le Passeport
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Invitez un conjoint, copropriétaire ou membre de la famille à consulter ce Passeport Maison.
        </p>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label htmlFor="share-email" className="sr-only">Courriel</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="courriel@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={inviteMutation.isPending} className="shrink-0">
            <Mail className="h-4 w-4 mr-1" />
            Inviter
          </Button>
        </form>

        {/* Shares list */}
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun partage actif.</p>
          ) : (
            shares.map((share) => (
              <div key={share.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{share.shared_with_email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {share.status === "accepted" ? (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Accepté
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" /> En attente
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">{share.role}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(share.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}