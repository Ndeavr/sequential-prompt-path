/**
 * ModalInlineAuth — Inline auth gate for Alex concierge.
 * Overlay, not redirect. "Ça prend 10 secondes."
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalInlineAuth({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {mode === "signup" ? "Créer mon accès" : "Se connecter"}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          {mode === "signup" ? "Ça prend 10 secondes. Accédez à Alex et trouvez votre professionnel." : "Content de vous revoir."}
        </p>

        <Button
          variant="outline"
          className="w-full mb-4 h-11"
          onClick={handleGoogle}
        >
          <img src="https://www.google.com/favicon.ico" className="h-4 w-4 mr-2" alt="" />
          Continuer avec Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <div className="flex-1 h-px bg-border" />
          <span>ou par courriel</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="votre@courriel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Créer mon accès" : "Se connecter"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors"
        >
          {mode === "signup" ? "Déjà un compte? Se connecter" : "Pas de compte? Créer un accès"}
        </button>
      </motion.div>
    </motion.div>
  );
}
