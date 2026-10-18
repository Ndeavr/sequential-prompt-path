/** Bounded, audience-separated history shared by text and canonical session reads. */
export type ConversationAudience = "homeowner" | "contractor";
export interface ConversationTurn {
  id?: string;
  role: "user" | "assistant";
  text?: string;
  content?: string;
  audience?: ConversationAudience;
  type?: string;
}

export function buildClaraHistory(turns: readonly ConversationTurn[], audience: ConversationAudience) {
  let current: ConversationAudience = "homeowner";
  const scoped = turns.filter(turn => {
    if (turn.role !== "user" && turn.role !== "assistant") return false;
    if (typeof (turn.text ?? turn.content) !== "string") return false;
    const text = turn.text ?? turn.content ?? "";
    if (turn.audience) current = turn.audience;
    else if (turn.type === "homeowner" || turn.type === "contractor") current = turn.type;
    else if (/^je suis (?:un |une )?entrepreneur|^je vois, vous aimeriez obtenir plus de contrats|^pour votre entreprise/i.test(text)) current = "contractor";
    else if (/^bien sûr\. décrivez-moi votre projet pour votre propriété/i.test(text)) current = "homeowner";
    return current === audience && text.trim().length > 0;
  }).map(turn => ({ role: turn.role, content: (turn.text ?? turn.content ?? "").slice(0, 2000) }));
  const recent = scoped.slice(-20);
  // Extractive only: no fabricated diagnosis, personality, score or business facts.
  const summary = scoped.slice(0, -20).slice(0, 6)
    .map(turn => `${turn.role === "user" ? "Déclaré" : "Question/réponse Clara"} : ${turn.content.slice(0, 500)}`).join("\n");
  return { messages: recent, summary };
}