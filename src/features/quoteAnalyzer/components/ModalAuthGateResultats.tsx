/**
 * ModalAuthGateResultats — Blocking modal requiring login or signup before showing analysis.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

interface Props {
  open: boolean;
  fileCount: number;
  onAuthSuccess: () => void;
}

export default function ModalAuthGateResultats({ open, fileCount, onAuthSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Identifiants invalides");
      return;
    }
    onAuthSuccess();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé. Consultez votre courriel pour confirmer.");
    // If email confirmation disabled, session is active
    const { data } = await supabase.auth.getSession();
    if (data.session) onAuthSuccess();
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Connexion Google indisponible");
      return;
    }
    if (result.redirected) return;
    onAuthSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md px-4 sm:px-6"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Votre analyse est prête
            </h2>
            <p className="text-xs text-muted-foreground">
              {fileCount} soumission{fileCount > 1 ? "s" : ""} analysée{fileCount > 1 ? "s" : ""} · Connectez-vous pour la voir
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2 items-start">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground">
            Sauvegardez votre analyse dans votre Passeport Maison et recevez le rapport complet.
          </p>
        </div>

        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full rounded-xl">
          Continuer avec Google
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          ou
          <div className="flex-1 h-px bg-border" />
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer un compte</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-3 pt-3">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-email" className="text-xs">Courriel</Label>
                <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-pwd" className="text-xs">Mot de passe</Label>
                <Input id="li-pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? "Connexion…" : "Voir mon analyse"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 pt-3">
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-email" className="text-xs">Courriel</Label>
                <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pwd" className="text-xs">Mot de passe</Label>
                <Input id="su-pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? "Création…" : "Créer mon compte et voir l'analyse"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
