/**
 * UNPRO Condo — CTA Waitlist Section
 */
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionContainer from "@/components/unpro/SectionContainer";

export default function SectionCondoCTAWaitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("condo_waitlist_leads").insert({ email: email.trim(), interest_type: "waitlist" });
      if (error) throw error;
      setDone(true);
      toast.success("Vous êtes inscrit! Nous vous contacterons bientôt.");
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionContainer gradient>
      <div className="max-w-xl mx-auto text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">
          Prêt à simplifier votre copropriété?
        </h2>
        <p className="text-muted-foreground">
          Inscrivez-vous pour obtenir l'accès prioritaire à UNPRO Condo.
        </p>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Inscription confirmée!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="votre@courriel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Demander l'accès <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        )}

        <p className="text-xs text-muted-foreground">Aucun engagement. Aucune carte de crédit.</p>
      </div>
    </SectionContainer>
  );
}
