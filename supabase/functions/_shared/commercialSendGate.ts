/**
 * UNPRO — Appel de la porte canonique `commercial-send-gate`.
 *
 * Tout message électronique commercial DOIT passer par cette porte avant
 * d'atteindre un fournisseur. Échec fermé : toute erreur réseau ou réponse
 * inattendue est traitée comme un refus.
 *
 * L'identifiant d'audit retourné (`gate_audit_id`) doit être conservé sur la
 * ligne d'envoi (crm_action_log / affiliate_lead_events).
 */

export interface GateDecision {
  pass: boolean;
  blocked_reasons: string[];
  decisions: Array<{ check: string; result: string; detail?: string }>;
  gate_audit_id: string | null;
  evidence_id: string | null;
}

export interface GateRequest {
  contractor_lead_id: string;
  destination_type: "phone_sms" | "email";
  destination: string;
  campaign_id?: string | null;
  sender_name?: string;
}

export async function callCommercialSendGate(req: GateRequest): Promise<GateDecision> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/commercial-send-gate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        contractor_lead_id: req.contractor_lead_id,
        destination_type: req.destination_type,
        destination: req.destination,
        message_purpose: "commercial_outreach",
        campaign_id: req.campaign_id ?? null,
        sender_identity: { name: req.sender_name ?? "UNPRO", unsubscribe_footer: true },
      }),
    });
    const body = (await res.json().catch(() => null)) as Partial<GateDecision> | null;
    if (!body || typeof body.pass !== "boolean") {
      return { pass: false, blocked_reasons: ["gate_unavailable"], decisions: [], gate_audit_id: null, evidence_id: null };
    }
    return {
      pass: body.pass === true,
      blocked_reasons: body.blocked_reasons ?? [],
      decisions: body.decisions ?? [],
      gate_audit_id: body.gate_audit_id ?? null,
      evidence_id: body.evidence_id ?? null,
    };
  } catch (e) {
    return {
      pass: false,
      blocked_reasons: [`gate_unavailable:${e instanceof Error ? e.message : String(e)}`],
      decisions: [],
      gate_audit_id: null,
      evidence_id: null,
    };
  }
}

/** Message lisible en français pour un refus de la porte. */
export function gateBlockMessage(d: GateDecision): string {
  if (d.blocked_reasons.length === 0) return "Envoi non autorisé.";
  return `Envoi bloqué : ${d.blocked_reasons.join(", ")}`;
}
