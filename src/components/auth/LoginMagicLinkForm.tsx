/**
 * UNPRO — Magic Link Email Form (premium dark, mobile-first)
 *
 * Fixes:
 *  - Visible white text + light placeholder on dark surfaces
 *  - Trim + lowercase + validate before submit
 *  - Active CTA only when email is valid
 *  - 3s soft timeout — UI never sticks in "Envoi…" forever
 *  - inputMode/email + autocomplete + autocapitalize off + spellcheck off
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { authDebug } from "@/services/auth/authDebugBus";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  ctaLabel?: string;
  successMessage?: string;
}

export default function LoginMagicLinkForm({
  ctaLabel = "Recevoir un lien de connexion",
  successMessage = "Lien envoyé ! Vérifiez votre courriel.",
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const cleaned = email.trim().toLowerCase();
  const isValid = EMAIL_RE.test(cleaned);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTouched(true);
      toast.error("Adresse courriel invalide");
      return;
    }
    setLoading(true);
    authDebug.set({
      auth_step: "magic_link_submitting",
      auth_method: "magic_link",
      last_error: null,
      last_error_step: null,
    });
    // Hard 8s safety — never leave the user staring at a spinner
    const safety = window.setTimeout(() => {
      setLoading(false);
      toast.error("Envoi trop long. Réessayez.");
    }, 8000);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      window.clearTimeout(safety);
      if (error) throw error;
      authDebug.set({ auth_step: "magic_link_sent" });
      setSent(true);
      toast.success(successMessage);
    } catch (err: any) {
      window.clearTimeout(safety);
      authDebug.error(err, "magic_link_submitting");
      toast.error(err?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle className="h-10 w-10" style={{ color: "hsl(142 70% 55%)" }} />
        <p className="text-sm text-center" style={{ color: "hsl(220 20% 90%)" }}>
          Lien envoyé à <strong style={{ color: "white" }}>{cleaned}</strong>
        </p>
        <p className="text-xs text-center" style={{ color: "hsl(220 14% 60%)" }}>
          Ouvrez votre boîte courriel pour terminer la connexion.
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail(""); setTouched(false); }}
          className="text-xs underline underline-offset-2"
          style={{ color: "hsl(222 100% 75%)" }}
        >
          Utiliser un autre courriel
        </button>
      </div>
    );
  }

  const showError = touched && email.length > 0 && !isValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="votre@courriel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          required
          aria-invalid={showError || undefined}
          aria-describedby={showError ? "magic-link-error" : undefined}
          className="w-full h-12 px-4 rounded-xl text-[16px] outline-none transition-colors"
          style={{
            background: "hsl(228 20% 14% / 0.85)",
            border: showError
              ? "1px solid hsl(0 75% 60% / 0.7)"
              : "1px solid hsl(228 18% 22%)",
            color: "white",
            // @ts-ignore — vendor placeholder color
            ["--tw-placeholder-opacity" as any]: 1,
            caretColor: "hsl(222 100% 75%)",
          }}
        />
        {showError && (
          <p id="magic-link-error" className="mt-1.5 text-xs" style={{ color: "hsl(0 75% 70%)" }}>
            Entrez une adresse courriel valide
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={loading || !isValid}
        className="w-full h-12 rounded-xl gap-2 text-sm font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi…
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            {ctaLabel}
          </>
        )}
      </Button>
      <style>{`
        input[type="email"]::placeholder { color: hsl(220 14% 55%); opacity: 1; }
      `}</style>
    </form>
  );
}
