/**
 * Extraction du `reason` structuré renvoyé par une fonction Edge.
 *
 * `supabase.functions.invoke` renvoie `data = null` sur toute réponse non-2xx :
 * le corps JSON réel (`{ ok: false, reason: "already_claimed" }`) n'est
 * accessible que via `error.context`, qui est la `Response` brute.
 *
 * Sans cette lecture, l'UI retombait sur "network_error" alors que le serveur
 * avait bien répondu — fail-closed muet. On ne devine jamais : si le corps ne
 * contient pas de `reason`, on laisse la valeur de repli au code appelant.
 */
export async function extractEdgeReason(
  error: unknown,
  data: unknown,
): Promise<string | null> {
  const inlineReason = (data as { reason?: string } | null)?.reason;
  if (typeof inlineReason === "string" && inlineReason) return inlineReason;

  const context = (error as { context?: unknown } | null)?.context;
  if (!context) return null;

  try {
    // Response (cas standard de FunctionsHttpError)
    if (typeof (context as Response).json === "function") {
      const cloned =
        typeof (context as Response).clone === "function"
          ? (context as Response).clone()
          : (context as Response);
      const body = await cloned.json();
      const reason = (body as { reason?: string } | null)?.reason;
      if (typeof reason === "string" && reason) return reason;
      return null;
    }
    // Corps déjà désérialisé par certaines versions du client
    const reason = (context as { reason?: string }).reason;
    if (typeof reason === "string" && reason) return reason;
  } catch {
    return null;
  }
  return null;
}

/** Statut HTTP de la réponse d'erreur, quand il est disponible. */
export function extractEdgeStatus(error: unknown): number | null {
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  return typeof status === "number" ? status : null;
}
