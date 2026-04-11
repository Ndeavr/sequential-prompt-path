/**
 * ModalLoginContinueConversation — Login prompt that appears inline
 * when authentication is needed to continue the booking flow.
 * Preserves conversation context.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onAuthenticated?: (userId: string) => void;
  onDismiss?: () => void;
  contextMessage?: string;
}

export default function ModalLoginContinueConversation({ onAuthenticated, onDismiss, contextMessage }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthenticated?.(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          toast({ title: "Vérifiez vos courriels", description: "Un lien de confirmation a été envoyé." });
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <LogIn className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          {isLogin ? "Connectez-vous pour continuer" : "Créer un compte"}
        </h4>
      </div>

      {contextMessage && (
        <p className="text-xs text-muted-foreground">{contextMessage}</p>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="courriel@exemple.com"
            type="email"
            className="h-9 text-sm pl-9"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            type="password"
            className="h-9 text-sm pl-9"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !email || !password}
        className="w-full h-9 text-sm"
        size="sm"
      >
        {loading ? "..." : isLogin ? "Se connecter" : "Créer le compte"}
        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
      </Button>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-xs text-primary hover:underline w-full text-center"
      >
        {isLogin ? "Pas de compte? Créer un compte" : "Déjà un compte? Se connecter"}
      </button>
    </motion.div>
  );
}
