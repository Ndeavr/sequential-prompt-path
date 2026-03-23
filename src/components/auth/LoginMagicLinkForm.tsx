/**
 * UNPRO — Magic Link Email Form
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CheckCircle } from "lucide-react";

export default function LoginMagicLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Lien envoyé ! Vérifiez votre courriel.");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle className="h-10 w-10 text-success" />
        <p className="text-sm text-center text-muted-foreground">
          Un lien de connexion a été envoyé à <strong className="text-foreground">{email}</strong>
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-xs text-primary hover:underline"
        >
          Utiliser un autre courriel
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        placeholder="votre@courriel.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-11 rounded-xl"
      />
      <Button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full h-11 rounded-xl gap-2"
      >
        <Mail className="h-4 w-4" />
        {loading ? "Envoi…" : "Recevoir un lien de connexion"}
      </Button>
    </form>
  );
}
