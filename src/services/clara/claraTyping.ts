/**
 * UNPRO — Rythme d'écriture de Clara (affichage seulement).
 *
 * Le texte final est TOUJOURS exactement le texte prévu : les rares
 * autocorrections sont une animation temporaire, jamais stockées.
 */

export type TypingFrame = { text: string; delay: number };

const NEARBY = "azertyuiopqsdfghjklmwxcvbn";
/** Aucune faute artificielle : la révélation est propre par défaut. */
export const CLARA_TYPO_CHANCE = 0;

function charDelay(char: string, rand: () => number): number {
  // Affichage seulement : environ 30 caractères/seconde, pauses de ponctuation.
  const base = 30 + Math.round(rand() * 6);
  if (/[.!?…]/.test(char)) return base + 420;
  if (/[,;:—]/.test(char)) return base + 170;
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
    return [{ text, delay: 0 }];
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
  const total = frames.reduce((sum, frame) => sum + frame.delay, 0);
  const factor = Math.min(1, 16000 / Math.max(total, 1));
  return frames.map((frame) => ({ ...frame, delay: frame.delay * factor }));
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
  if (!options.isAlive || options.isAlive()) onFrame(text);
}

/** Une seule révélation monotone, même si plusieurs jetons arrivent ensemble. */
export function createStreamingTyping(onFrame: (text: string) => void, options: {
  reducedMotion?: boolean; isAlive?: () => boolean;
} = {}) {
  let target = "";
  let shown = "";
  let timer = 0;
  let ended = false;
  let stopped = false;
  const started = performance.now();
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => { resolveDone = resolve; });
  const tick = () => {
    if (stopped || (options.isAlive && !options.isAlive())) { resolveDone(); return; }
    const remaining = target.length - shown.length;
    if (remaining > 0) {
      const step = options.reducedMotion || performance.now() - started >= 16000
        ? remaining : Math.max(1, Math.ceil(remaining / 240));
      shown = target.slice(0, shown.length + step);
      onFrame(shown);
    }
    if (ended && shown === target) { resolveDone(); return; }
    timer = window.setTimeout(tick, charDelay(shown.at(-1) ?? "", () => 0.5));
  };
  tick();
  return {
    update(text: string) { if (text.startsWith(target)) target = text; },
    finish() { ended = true; return done; },
    cancel() { stopped = true; window.clearTimeout(timer); resolveDone(); },
  };
}
