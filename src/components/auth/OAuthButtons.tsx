/**
 * UNPRO — Google OAuth Button (Single Provider)
 * Premium styling with hover glow and tactile press.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { captureCurrentRouteAsIntent, peekAuthIntent } from "@/services/auth/authIntentService";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { authDebug } from "@/services/auth/authDebugBus";

interface OAuthButtonsProps {
  loading?: boolean;
  className?: string;
}

export default function OAuthButtons({ loading: externalLoading, className = "" }: OAuthButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    trackAuthEvent("auth_method_selected", { method: "google" });
    authDebug.set({
      auth_step: "oauth_initiating",
      auth_method: "google",
      provider: "google",
      last_error: null,
      last_error_step: null,
    });
    try {
      if (!peekAuthIntent()) {
        captureCurrentRouteAsIntent("oauth_signin");
      }

      authDebug.set({ auth_step: "oauth_redirecting" });
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        authDebug.error(error, "oauth_redirecting");
        toast.error(error.message || "Erreur de connexion");
      }
    } catch (err: any) {
      authDebug.error(err, "oauth_initiating");
      toast.error(err?.message || "Erreur de connexion");
    } finally {
      setGoogleLoading(false);
    }
  };

  const isDisabled = externalLoading || googleLoading;

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-sm font-semibold rounded-xl gap-3 transition-all active:scale-[0.98] hover:shadow-lg"
        style={{
          background: "hsl(0 0% 100% / 0.95)",
          border: "1px solid hsl(0 0% 100% / 0.2)",
          color: "#1a1a2e",
          boxShadow: "0 2px 8px -2px hsl(228 40% 3% / 0.3)",
        }}
        disabled={isDisabled}
        onClick={handleGoogle}
      >
        {googleLoading ? (
          "Connexion…"
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </>
        )}
      </Button>
    </div>
  );
}
