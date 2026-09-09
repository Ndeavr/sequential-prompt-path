/**
 * UNPRO — Campagne « 12 mois gratuits » (entreprises de services résidentiels).
 *
 * Objectif unique : 10 ACTIVATIONS RÉELLES.
 * Une activation = une ligne `founder_memberships` réellement activée
 * (status founder_activated / first_referral / renewal_due / renewed).
 * Un envoi, une livraison, un clic ou un formulaire commencé ne comptent PAS.
 *
 * Contrat fail-closed : si le compteur est illisible, la campagne est
 * considérée comme ARRÊTÉE (aucun envoi), jamais l'inverse.
 */

export const FREE_CAMPAIGN_TARGET = 10;

export const FREE_ACTIVATED_STATUSES = [
  "founder_activated",
  "first_referral",
  "renewal_due",
  "renewed",
] as const;

export type FreeCampaignStatus = {
  activated: number;
  target: number;
  /** true → la cible est atteinte : plus aucun envoi d'offre gratuite. */
  reached: boolean;
  /** true → compteur illisible : on bloque par sécurité. */
  unreadable: boolean;
};

type MinimalClient = {
  from: (table: string) => any;
};

/** Compte les activations gratuites réellement enregistrées en base. */
export async function freeCampaignStatus(sb: MinimalClient): Promise<FreeCampaignStatus> {
  try {
    const { count, error } = await sb
      .from("founder_memberships")
      .select("id", { count: "exact", head: true })
      .in("status", FREE_ACTIVATED_STATUSES as unknown as string[]);
    if (error) {
      return { activated: 0, target: FREE_CAMPAIGN_TARGET, reached: true, unreadable: true };
    }
    const activated = Number(count ?? 0);
    return {
      activated,
      target: FREE_CAMPAIGN_TARGET,
      reached: activated >= FREE_CAMPAIGN_TARGET,
      unreadable: false,
    };
  } catch {
    return { activated: 0, target: FREE_CAMPAIGN_TARGET, reached: true, unreadable: true };
  }
}

/** Décision pure, testable sans base. */
export function shouldStopFreeCampaign(activated: number | null | undefined): boolean {
  if (typeof activated !== "number" || Number.isNaN(activated)) return true;
  return activated >= FREE_CAMPAIGN_TARGET;
}
