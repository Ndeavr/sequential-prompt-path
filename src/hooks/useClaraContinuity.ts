/**
 * UNPRO — ONE CLARA : rattachement de la conversation après authentification.
 *
 * Monté une seule fois dans l'application. À chaque session authentifiée, la
 * conversation anonyme existante est rattachée au compte de façon idempotente
 * (une seule tentative par compte et par jeton de conversation).
 *
 * Aucun envoi sortant, aucune redirection, aucune écriture métier ici.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { peekClaraSessionToken, promoteClaraSession } from "@/services/clara/claraSession";

export function useClaraContinuity() {
  const done = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const promoteFor = async (userId: string | undefined) => {
      if (!userId || cancelled) return;
      const token = peekClaraSessionToken();
      if (!token) return;
      const key = `${userId}:${token}`;
      if (done.current.has(key)) return;
      done.current.add(key);
      try {
        await promoteClaraSession();
      } catch {
        // Réessayable au prochain montage : on ne bloque jamais la navigation.
        done.current.delete(key);
      }
    };

    supabase.auth.getSession().then(({ data }) => promoteFor(data.session?.user?.id));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        promoteFor(session?.user?.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
}

export default function ClaraContinuityMount() {
  useClaraContinuity();
  return null;
}
