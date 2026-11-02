// Règles pures (aucune I/O) : libération du rendez-vous pour une demande
// propriétaire sans partenaire admissible, et premier RDV offert sur invitation.
// La vérité (paiement, invitation, droits) vient du serveur ; aucun paramètre
// URL/client ne peut conférer de droit.

export const ACTIVATION_OFFER_COPY_FR =
  "Activation — 350 $ + taxes, profil et 12 mois de présence IA UNPRO. Dans le cadre de cette invitation, votre premier rendez-vous qualifié est offert.";

export interface ServerInvitation {
  id: string;
  demand_id: string;
  contractor_id: string;
  source: "server"; // créée uniquement côté serveur
  revoked?: boolean;
}

export interface ReleaseInput {
  contractorId: string;
  demandId: string;
  identityReliable: boolean;
  scopeCompatible: boolean; // métier/surfaces/territoire + précisions répondues
  mandatoryQualificationsVerified: boolean; // ex. RBQ actif
  liveActivationPaid: boolean; // webhook Stripe signé LIVE, non remboursé
  invitation?: ServerInvitation | null;
  existingGrants: { invitation_id: string; kind: "first_offered" }[];
}

export type ReleaseDecision =
  | { release: false; reason: "identity" | "scope" | "qualification" | "activation_unpaid" }
  | {
      release: true;
      grant: { kind: "first_offered"; invitation_id: string; appointment_fee_cents: 0; consumes_paid_pack: false } | null;
      grantIsNew: boolean;
      appointmentFeeCents: number | null; // null = règles de forfait existantes
    };

function validInvitation(i: ReleaseInput): ServerInvitation | null {
  const inv = i.invitation;
  if (!inv || inv.source !== "server" || inv.revoked) return null;
  if (inv.contractor_id !== i.contractorId || inv.demand_id !== i.demandId) return null;
  return inv;
}

export function decideRelease(i: ReleaseInput): ReleaseDecision {
  if (!i.identityReliable) return { release: false, reason: "identity" };
  if (!i.mandatoryQualificationsVerified) return { release: false, reason: "qualification" };
  if (!i.scopeCompatible) return { release: false, reason: "scope" };
  if (!i.liveActivationPaid) return { release: false, reason: "activation_unpaid" };

  const inv = validInvitation(i);
  if (!inv) return { release: true, grant: null, grantIsNew: false, appointmentFeeCents: null };

  const already = i.existingGrants.some((g) => g.invitation_id === inv.id && g.kind === "first_offered");
  return {
    release: true,
    grant: { kind: "first_offered", invitation_id: inv.id, appointment_fee_cents: 0, consumes_paid_pack: false },
    grantIsNew: !already, // replay/double clic : même droit, jamais un second
    appointmentFeeCents: 0,
  };
}

/** Clé d'idempotence unique : une invitation = au plus un droit offert. */
export const firstOfferedGrantKey = (invitationId: string) => `first_offered:${invitationId}`;
