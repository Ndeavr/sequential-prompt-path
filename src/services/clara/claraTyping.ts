/**
 * UNPRO — Rythme d'écriture de Clara (affichage seulement).
 *
 * Le texte final est TOUJOURS exactement le texte prévu : les rares
 * autocorrections sont une animation temporaire, jamais stockées.
 */

export type TypingFrame = { text: string; delay: number };

const NEARBY = "azertyuiopqsdfghjklmwxcvbn";
/** Probabilité qu'un message contienne une autocorrection visible. */
export const CLARA_TYPO_CHANCE = 0.35;

function charDelay(char: string, rand: () => number): number {
  const base = 25 + Math.round(rand() * 40); // 25–65 ms
  if (/[.!?…]/.test(char)) return base + 260 + Math.round(rand() * 160);
  if (/[,;:—]/.test(char)) return base + 120 + Math.round(rand() * 80);
  return base;
}

/**
 * Construit la séquence d'images d'écriture. Au plus une autocorrection
 * (1 à 3 caractères erronés, pause, effacement) par message.
 */
export function buildTypingFrames(
  text: string,
  options: { reducedMotion?: boolean; rand?: () => number; typoChance?: number } = {},
): TypingFrame[] {
  const rand = options.rand ?? Math.random;
  if (options.reducedMotion) {
    // Révélation simple et rapide, par mots, sans fausse correction.
    const words = text.split(/(\s+)/);
    const frames: TypingFrame[] = [];
    let acc = "";
    for (const word of words) {
      acc += word;
      if (word.trim()) frames.push({ text: acc, delay: 18 });
    }
    return frames.length ? frames : [{ text, delay: 0 }];
  }

  const chance = options.typoChance ?? CLARA_TYPO_CHANCE;
  let typoAt = -1;
  if (text.length > 24 && rand() < chance) {
    // Jamais au tout début ni à la fin, seulement avant une lettre.
    for (let tries = 0; tries < 6; tries += 1) {
      const idx = 8 + Math.floor(rand() * (text.length - 16));
      if (/[a-zà-ÿ]/i.test(text[idx] ?? "")) {
        typoAt = idx;
        break;
      }
    }
  }

  const frames: TypingFrame[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (i === typoAt) {
      const count = 1 + Math.floor(rand() * 3);
      let wrong = "";
      for (let k = 0; k < count; k += 1) {
        wrong += NEARBY[Math.floor(rand() * NEARBY.length)];
        frames.push({ text: text.slice(0, i) + wrong, delay: 40 + Math.round(rand() * 30) });
      }
      frames.push({ text: text.slice(0, i) + wrong, delay: 220 + Math.round(rand() * 180) });
      for (let k = count - 1; k >= 0; k -= 1) {
        frames.push({ text: text.slice(0, i) + wrong.slice(0, k), delay: 55 + Math.round(rand() * 25) });
      }
    }
    frames.push({ text: text.slice(0, i + 1), delay: charDelay(text[i], rand) });
  }
  return frames;
}

/** Joue les images ; s'arrête proprement si le composant disparaît. */
export async function playTyping(
  text: string,
  onFrame: (value: string) => void,
  options: { reducedMotion?: boolean; isAlive?: () => boolean } = {},
): Promise<void> {
  const frames = buildTypingFrames(text, { reducedMotion: options.reducedMotion });
  for (const frame of frames) {
    if (options.isAlive && !options.isAlive()) return;
    onFrame(frame.text);
    await new Promise<void>((resolve) => window.setTimeout(resolve, frame.delay));
  }
  onFrame(text);
}
