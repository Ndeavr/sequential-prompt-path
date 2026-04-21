/**
 * Alex 100M — Timer Constants
 * All delays in milliseconds. Deterministic, no magic numbers elsewhere.
 */

/** Delay before rendering the first greeting bubble */
export const BOOT_GREETING_RENDER_MS = 150;

/** Delay before attempting autoplay of greeting TTS */
export const AUTOPLAY_ATTEMPT_MS = 400;

/** Silence duration before showing a soft visual prompt (no audio) */
export const IDLE_SOFT_PROMPT_DELAY_MS = 12_000;

/** Silence duration before a single gentle re-prompt (max 1) */
export const IDLE_REPROMPT_DELAY_MS = 20_000;

/** Silence duration before auto-minimizing the assistant */
export const AUTO_MINIMIZE_DELAY_MS = 28_000;

/** Cooldown after showing a "low confidence" hint — don't repeat */
export const LOW_CONFIDENCE_HINT_COOLDOWN_MS = 15_000;

/** Max consecutive no-responses before allowing minimize */
export const MAX_NO_RESPONSE_BEFORE_MINIMIZE = 2;

/** Max auto re-prompts per session */
export const MAX_AUTO_REPROMPTS = 1;
