/**
 * Alex Voice Brain — Dedicated intelligence layer for Alex Voice.
 *
 * Separates the "thinking" from the gateway so the brain logic can be
 * reused by both the WebSocket gateway and the REST alex-voice function.
 *
 * Uses the shared French voice pipeline for consistent output processing.
 */

// ─── Types ───

export interface VoiceBrainInput {
  transcript: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  userId?: string | null;
  sessionId?: string | null;
  userName?: string | null;
  pageContext?: {
    currentPage?: string;
    activeProperty?: string;
    isAuthenticated?: boolean;
    userRole?: string;
    hasScore?: boolean;
    hasPendingBooking?: boolean;
    hasUploadedImage?: boolean;
  };
}

export interface UiAction {
  type: string;
  target?: string;
  items?: string;
  [key: string]: string | undefined;
}

export interface VoiceBrainOutput {
  alexText: string;
  uiActions: UiAction[];
  nextBestAction: string | null;
}

// ─── System prompt ───

const ALEX_VOICE_SYSTEM = `Tu es Alex, la concierge vocale premium de la plateforme UNPRO.

IDENTITÉ :
- Tu es une femme. Utilise le féminin : « je suis ravie », « bien sûr ».
- Tu ne dis JAMAIS que tu es une IA ou un robot. Tu dis « je suis Alex » ou « je suis votre concierge ».
- Spécialiste en construction, rénovation, habitation, copropriété, immobilier, services aux propriétaires, gestion d'entrepreneurs.
- Tu as de l'expérience terrain, en vente, en gouvernance de copropriété, en réalités de quorum/syndicat.

STYLE VOCAL :
- Réponses TRÈS COURTES. Maximum 2-3 phrases.
- Une seule question à la fois. Jamais plus.
- Français québécois naturel, ton calme, chaleureux, sharp, premium.
- Pas de longs paragraphes. Pas de listes à puces. Pas de markdown.
- Tu parles comme dans une vraie conversation téléphonique premium.
- Si on t'interrompt, tu t'arrêtes immédiatement et tu écoutes.

COMPORTEMENT :
- Par défaut, l'utilisateur est un propriétaire.
- Si clairement un entrepreneur → guide vers forfaits et croissance.
- Pose UNE question précise à la fois. Jamais plus.
- Suggère des actions concrètes : upload photo, voir score, comparer plans, réserver, vérifier entrepreneur.
- Détecte stress → rassure. Détecte urgence → accélère. Détecte hésitation → simplifie.
- Préfère toujours le mouvement vers la prochaine action. Ne bloque jamais le progrès.
- Adapte-toi à la sensibilité budgétaire.

INTELLIGENCE ÉMOTIONNELLE :
- Rassurante quand stress détecté.
- Plus rapide quand urgence détectée.
- Maximum une petite erreur amusante par jour.

ACTIONS UI DISPONIBLES (retourne-les dans ta réponse entre balises) :
<ui_action type="navigate" target="/dashboard/properties" />
<ui_action type="open_upload" />
<ui_action type="show_score" />
<ui_action type="show_pricing" />
<ui_action type="open_booking" />
<ui_action type="scroll_to" target="recommendations" />
<ui_action type="show_chips" items="option1,option2,option3" />

PROCHAINE MEILLEURE ACTION :
À la fin de ta réponse, ajoute une balise indiquant ce que l'utilisateur devrait faire ensuite :
<next_action>description courte de l'action</next_action>

RÈGLES ABSOLUES :
- Réponds en 1-3 phrases max. C'est de la voix, pas du texte.
- Ne fais jamais de liste à puces en mode vocal.
- Termine toujours par une question OU une suggestion d'action.
- Ne bloque jamais le progrès.
- N'invente rien.`;

// ─── Helpers ───

function buildContextBlock(input: VoiceBrainInput): string {
  const parts: string[] = [];
  const ctx = input.pageContext;
  if (ctx?.currentPage) parts.push(`Page actuelle: ${ctx.currentPage}`);
  if (ctx?.activeProperty) parts.push(`Propriété active: ${ctx.activeProperty}`);
  if (ctx?.isAuthenticated) parts.push(`Utilisateur connecté: oui`);
  if (ctx?.userRole) parts.push(`Rôle: ${ctx.userRole}`);
  if (ctx?.hasScore) parts.push(`Score maison existant: oui`);
  if (ctx?.hasPendingBooking) parts.push(`Rendez-vous en attente: oui`);
  if (ctx?.hasUploadedImage) parts.push(`Image uploadée: oui`);
  if (input.userName) parts.push(`Prénom: ${input.userName}`);
  return parts.length > 0 ? "\n" + parts.join("\n") : "";
}

function extractUIActions(text: string): { cleanText: string; actions: UiAction[] } {
  const actions: UiAction[] = [];
  const regex = /<ui_action\s+([^/>]+)\s*\/>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    if (attrs.type) actions.push(attrs as UiAction);
  }
  const cleanText = text.replace(/<ui_action[^/>]*\/>/g, "").trim();
  return { cleanText, actions };
}

function extractNextAction(text: string): { cleanText: string; nextAction: string | null } {
  const regex = /<next_action>([\s\S]*?)<\/next_action>/;
  const match = regex.exec(text);
  const nextAction = match ? match[1].trim() : null;
  const cleanText = text.replace(/<next_action>[\s\S]*?<\/next_action>/g, "").trim();
  return { cleanText, nextAction };
}

// ─── Main brain function ───

export async function alexVoiceBrain(
  input: VoiceBrainInput,
  options?: { signal?: AbortSignal }
): Promise<VoiceBrainOutput> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  const contextBlock = buildContextBlock(input);

  const conversationMessages = [
    { role: "system", content: ALEX_VOICE_SYSTEM + contextBlock },
    ...(input.messages || []),
    { role: "user", content: input.transcript },
  ];

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: conversationMessages,
    }),
    signal: options?.signal,
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) throw new AlexBrainError("Rate limit exceeded", 429);
    if (status === 402) throw new AlexBrainError("Payment required", 402);
    throw new AlexBrainError(`AI error: ${status}`, status);
  }

  const aiData = await aiResponse.json();
  const rawText = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";

  // Extract next action first, then UI actions from cleaned text
  const { cleanText: afterNextAction, nextAction } = extractNextAction(rawText);
  const { cleanText, actions } = extractUIActions(afterNextAction);

  return {
    alexText: cleanText,
    uiActions: actions,
    nextBestAction: nextAction,
  };
}

// ─── Error class ───

export class AlexBrainError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AlexBrainError";
    this.status = status;
  }
}
