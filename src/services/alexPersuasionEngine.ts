/**
 * AlexPersuasionEngine — Chooses the right soft conversion angle.
 * Never aggressive. Reduces friction, reassures, simplifies.
 */

export type PersuasionStyle = "reassuring" | "momentum" | "effort_reduction" | "light_scarcity";

export interface PersuasionContext {
  bookingReadiness: number;   // 0-1
  trustScore: number;         // 0-1
  frictionScore: number;      // 0-1
  hasObjection: boolean;
  isReturning: boolean;
  hasMatch: boolean;
}

export interface PersuasionPrompt {
  style: PersuasionStyle;
  text: string;
  triggerReason: string;
}

const PROMPTS: Record<PersuasionStyle, string[]> = {
  reassuring: [
    "Je peux déjà vous montrer quelqu'un de sérieux.",
    "Je vais vous simplifier ça.",
    "On peut juste regarder, sans rien confirmer.",
    "Le but, c'est de vous simplifier ça.",
  ],
  momentum: [
    "On est rendu là, je peux vous ouvrir les disponibilités.",
    "Je vous avance ça pendant qu'on y est.",
    "Parfait, je vous prépare ça.",
    "Je vous l'ouvre.",
  ],
  effort_reduction: [
    "Ça me prend juste vos infos et je vous prépare le tout.",
    "Je m'occupe du reste avec vous.",
    "Je peux vous préparer ça tout de suite.",
    "Je vous avance ça, ce sera plus simple.",
  ],
  light_scarcity: [
    "Je peux vérifier les disponibilités avant que les meilleurs créneaux partent.",
    "Je vous montre les options pendant qu'elles sont là.",
    "Il reste quelques disponibilités cette semaine.",
    "Je regarde ce qui est encore libre.",
  ],
};

export function choosePersuasionStyle(ctx: PersuasionContext): PersuasionStyle {
  if (ctx.hasObjection || ctx.trustScore < 0.4) return "reassuring";
  if (ctx.bookingReadiness > 0.7 && ctx.hasMatch) return "momentum";
  if (ctx.frictionScore > 0.5) return "effort_reduction";
  if (ctx.bookingReadiness > 0.5 && ctx.hasMatch) return "light_scarcity";
  return "reassuring";
}

export function getPersuasionPrompt(ctx: PersuasionContext): PersuasionPrompt {
  const style = choosePersuasionStyle(ctx);
  const pool = PROMPTS[style];
  const text = pool[Math.floor(Math.random() * pool.length)];
  return {
    style,
    text,
    triggerReason: `readiness=${ctx.bookingReadiness.toFixed(2)} trust=${ctx.trustScore.toFixed(2)} friction=${ctx.frictionScore.toFixed(2)}`,
  };
}
