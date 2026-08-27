/**
 * UNPRO — Canal OTP téléphone canonique (client).
 *
 * Un seul chemin SMS : les fonctions edge Twilio `send-otp` / `verify-otp`.
 * Ne jamais appeler `supabase.auth.signInWithOtp({ phone })` : le fournisseur
 * SMS natif n'est pas activé sur ce projet (« Unsupported phone provider »).
 *
 * Aucun code OTP n'est journalisé.
 */
import { supabase } from "@/integrations/supabase/client";
import { phoneToE164 } from "@/utils/formatPhone";

const SMS_FALLBACK_FR =
  "Impossible d'envoyer le code par SMS pour le moment. Réessayez ou utilisez le lien par courriel.";

const VERIFY_ERRORS_FR: Record<string, string> = {
  invalid_code: "Code invalide.",
  expired_or_invalid: "Code expiré. Demandez un nouveau code.",
  too_many_attempts: "Trop de tentatives. Réessayez plus tard.",
  invalid_input: "Code à 6 chiffres requis.",
  account_failed: "Impossible de finaliser la vérification. Réessayez.",
  session_failed: "Impossible d'ouvrir la session. Réessayez.",
  server_error: "Service temporairement indisponible. Réessayez.",
};

export interface OtpResult {
  ok: boolean;
  /** Message fr-CA prêt à afficher (jamais d'erreur technique anglaise). */
  message?: string;
}

export interface VerifyResult extends OtpResult {
  isNewUser?: boolean;
  needsRole?: boolean;
}

/** Envoie un code SMS. `raw` peut être dans n'importe quel format courant. */
export async function sendPhoneOtp(raw: string): Promise<OtpResult> {
  const e164 = phoneToE164(raw);
  if (!e164) return { ok: false, message: "Veuillez entrer un numéro valide." };

  try {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { phone: e164 },
    });
    if (error || (data && data.error)) {
      console.error("[phoneOtp] send-otp failed", error?.message ?? data?.error);
      return { ok: false, message: SMS_FALLBACK_FR };
    }
    return { ok: true };
  } catch (e) {
    console.error("[phoneOtp] send-otp network", e);
    return { ok: false, message: SMS_FALLBACK_FR };
  }
}

/** Vérifie le code et ouvre la session. Appelé UNIQUEMENT sur clic utilisateur. */
export async function verifyPhoneOtp(raw: string, code: string): Promise<VerifyResult> {
  const e164 = phoneToE164(raw);
  const digits = (code || "").replace(/\D/g, "");
  if (!e164) return { ok: false, message: "Veuillez entrer un numéro valide." };
  if (digits.length !== 6) return { ok: false, message: "Code à 6 chiffres requis." };

  try {
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { phone: e164, code: digits },
    });

    if (error && !data) {
      console.error("[phoneOtp] verify-otp transport", error.message);
      return { ok: false, message: "Code invalide. Réessayez." };
    }
    if (data?.error) {
      return { ok: false, message: VERIFY_ERRORS_FR[data.error] ?? "Code invalide. Réessayez." };
    }
    if (data?.session?.access_token && data?.session?.refresh_token) {
      const { error: sErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sErr) {
        console.error("[phoneOtp] setSession", sErr.message);
        return { ok: false, message: "Impossible d'ouvrir la session. Réessayez." };
      }
    }
    return { ok: true, isNewUser: !!data?.isNewUser, needsRole: !!data?.needsRole };
  } catch (e) {
    console.error("[phoneOtp] verify-otp network", e);
    return { ok: false, message: "Connexion instable. Réessayez." };
  }
}
