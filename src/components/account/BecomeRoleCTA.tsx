/**
 * UNPRO — Become Contractor / Become Homeowner CTA
 * Shows a card prompting user to add another role to their account.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Home, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BecomeRoleCTAProps {
  targetRole: "contractor" | "homeowner";
  compact?: boolean;
}

export default function BecomeRoleCTA({ targetRole, compact = false }: BecomeRoleCTAProps) {
  const { user } = useAuth();
  const { setActiveRole } = useActiveRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const isContractor = targetRole === "contractor";
  const Icon = isContractor ? Briefcase : Home;
  const title = isContractor ? "Devenir entrepreneur" : "Devenir propriétaire";
  const titleEn = isContractor ? "Become a contractor" : "Become a homeowner";
  const description = isContractor
    ? "Recevez des rendez-vous qualifiés et développez votre entreprise avec UNPRO."
    : "Gérez vos propriétés et trouvez les meilleurs professionnels.";

  const handleActivate = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: user.id, role: targetRole as any },
        { onConflict: "user_id,role" }
      );
      if (error) throw error;

      // If becoming contractor, create contractor record
      if (isContractor) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        await (supabase.from("contractors") as any).upsert(
          {
            user_id: user.id,
            business_name: profile?.full_name || "",
            email: profile?.email || user.email || "",
            phone: profile?.phone || "",
          },
          { onConflict: "user_id" }
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["user-role"] });
      
      toast.success(isContractor ? "Rôle entrepreneur activé !" : "Rôle propriétaire activé !");
      setActiveRole(targetRole);

      // Navigate to the appropriate dashboard
      navigate(isContractor ? "/pro" : "/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation du rôle");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleActivate}
        disabled={loading}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {title}
        <ArrowRight className="h-3 w-3 ml-auto" />
      </button>
    );
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={handleActivate} disabled={loading} className="gap-2 mt-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Activation…" : "Activer maintenant"}
        </Button>
      </CardContent>
    </Card>
  );
}
