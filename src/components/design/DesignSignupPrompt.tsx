/**
 * DesignSignupPrompt — Shown during AI generation to encourage account creation.
 * Dismissible — returns user to workspace after signup or skip.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DesignSignupPrompt({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Already logged in — don't show
  if (user) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      setSent(true);
      toast.success("Lien magique envoyé ! Vérifiez vos courriels.");
    } catch {
      toast.error("Erreur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/design` },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-[var(--shadow-2xl)] p-6 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                Votre design est en cours…
              </h3>
              <p className="text-sm text-muted-foreground">
                Créez un compte gratuit pour sauvegarder vos créations et recevoir 3 variantes.
              </p>

              {/* Loading indicator */}
              <div className="flex items-center justify-center gap-2 mt-4 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-medium">Génération en cours…</span>
              </div>
            </div>

            {!sent ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 h-11"
                  onClick={handleGoogle}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continuer avec Google
                </Button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <form onSubmit={handleSignup} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="votre@courriel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={loading} size="sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
                  </Button>
                </form>

                <button
                  onClick={onClose}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Continuer sans compte →
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-foreground font-medium">
                  ✅ Lien envoyé à {email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez vos courriels. Votre design sera prêt à votre retour.
                </p>
                <Button onClick={onClose} variant="outline" size="sm">
                  Voir mon design
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
