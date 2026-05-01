/**
 * AudioEngineUNPRO — Singleton sonic identity engine for UNPRO.
 *
 * Rules:
 * - Only ONE sound plays at a time (except voice — voice always wins).
 * - Priority system: urgent > error > success > notification > ambient.
 * - Preloads all assets on first user interaction.
 * - Respects user preferences (mute, volume, focus mode).
 * - Mobile autoplay compliant (unlocks on first gesture).
 */

export type SoundEvent =
  | "intro"
  | "outro"
  | "listening"
  | "thinking"
  | "success"
  | "error"
  | "notification"
  | "urgent"
  // ── UNPRO Vault sound system ──
  | "soft-click"
  | "criteria-click"
  | "vault-clack"
  | "match-success"
  | "scan-start"
  | "alex-listening"
  | "alex-thinking"
  | "payment-success"
  | "error-soft";

type EngineState = "idle" | "playing" | "muted";

interface UserAudioPrefs {
  enabled: boolean;
  volume: number;       // 0–1
  focusMode: boolean;   // suppress non-urgent
}

const PRIORITY: Record<SoundEvent, number> = {
  urgent: 100,
  error: 80,
  "error-soft": 75,
  "payment-success": 70,
  "match-success": 65,
  success: 60,
  "vault-clack": 55,
  notification: 40,
  "scan-start": 35,
  outro: 30,
  "criteria-click": 25,
  "soft-click": 22,
  intro: 20,
  thinking: 10,
  "alex-thinking": 10,
  listening: 5,
  "alex-listening": 5,
};

// Web Audio API synthesised sounds — no external files needed.
// Each function returns a short AudioBuffer or plays directly via oscillators.

class AudioEngineUNPRO {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | OscillatorNode | null = null;
  private currentEvent: SoundEvent | null = null;
  private state: EngineState = "idle";
  private prefs: UserAudioPrefs = { enabled: true, volume: 0.35, focusMode: false };
  private unlocked = false;
  private listeners = new Set<(state: EngineState) => void>();

  // ── Public API ──────────────────────────────────────────

  /** Must call on first user gesture to unlock AudioContext on mobile */
  unlock(): void {
    if (this.unlocked) return;
    this.ensureContext();
    this.unlocked = true;
  }

  async play(event: SoundEvent): Promise<void> {
    if (!this.prefs.enabled) return;
    if (this.prefs.focusMode && PRIORITY[event] < PRIORITY.error) return;

    // Priority check — don't interrupt higher priority
    if (this.currentEvent && PRIORITY[this.currentEvent] > PRIORITY[event]) return;

    this.stopCurrent();
    this.ensureContext();
    if (!this.ctx || !this.gainNode) return;

    this.currentEvent = event;
    this.setState("playing");

    try {
      switch (event) {
        case "intro":       await this.playIntro(); break;
        case "outro":       await this.playOutro(); break;
        case "listening":   await this.playListening(); break;
        case "thinking":    await this.playThinking(); break;
        case "success":     await this.playSuccess(); break;
        case "error":       await this.playError(); break;
        case "notification": await this.playNotification(); break;
        case "urgent":      await this.playUrgent(); break;
      }
    } catch {
      // Silently fail — audio is never blocking
    }

    this.currentEvent = null;
    this.setState("idle");
  }

  stopAll(): void {
    this.stopCurrent();
    this.currentEvent = null;
    this.setState("idle");
  }

  mute(): void {
    this.prefs.enabled = false;
    this.stopAll();
    this.setState("muted");
  }

  unmute(): void {
    this.prefs.enabled = true;
    this.setState("idle");
  }

  setVolume(v: number): void {
    this.prefs.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.value = this.prefs.volume;
  }

  getVolume(): number { return this.prefs.volume; }
  isEnabled(): boolean { return this.prefs.enabled; }
  isFocusMode(): boolean { return this.prefs.focusMode; }

  setFocusMode(on: boolean): void {
    this.prefs.focusMode = on;
    if (on) this.stopAll();
  }

  getState(): EngineState { return this.state; }

  onStateChange(fn: (s: EngineState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Load prefs from localStorage */
  loadPrefs(): void {
    try {
      const raw = localStorage.getItem("unpro_audio_prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.enabled === "boolean") this.prefs.enabled = p.enabled;
        if (typeof p.volume === "number") this.prefs.volume = p.volume;
        if (typeof p.focusMode === "boolean") this.prefs.focusMode = p.focusMode;
      }
    } catch { /* ignore */ }
  }

  savePrefs(): void {
    try {
      localStorage.setItem("unpro_audio_prefs", JSON.stringify(this.prefs));
    } catch { /* ignore */ }
  }

  // ── Internal ────────────────────────────────────────────

  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.prefs.volume;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private stopCurrent(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* ignore */ }
      this.currentSource = null;
    }
  }

  private setState(s: EngineState): void {
    if (this.state === s) return;
    this.state = s;
    this.listeners.forEach(fn => { try { fn(s); } catch {} });
  }

  // ── Sound Synthesis ─────────────────────────────────────
  // All sounds are synthesised with Web Audio API oscillators.
  // Clean, premium, no external files required.

  /** Intro: ascending two-tone chime (C5 → E5) */
  private playIntro(): Promise<void> {
    return this.playToneSequence([
      { freq: 523.25, duration: 0.12, type: "sine" },
      { freq: 659.25, duration: 0.18, type: "sine" },
    ], 0.06);
  }

  /** Outro: descending soft chime (E5 → C5) with fade */
  private playOutro(): Promise<void> {
    return this.playToneSequence([
      { freq: 659.25, duration: 0.12, type: "sine" },
      { freq: 523.25, duration: 0.22, type: "sine" },
    ], 0.06);
  }

  /** Listening: very subtle single soft tone */
  private playListening(): Promise<void> {
    return this.playToneSequence([
      { freq: 440, duration: 0.08, type: "sine" },
    ], 0);
  }

  /** Thinking: two quiet pulses */
  private playThinking(): Promise<void> {
    return this.playToneSequence([
      { freq: 392, duration: 0.06, type: "sine" },
      { freq: 392, duration: 0.06, type: "sine" },
    ], 0.2);
  }

  /** Success: bright ascending triad (C5 → E5 → G5) */
  private playSuccess(): Promise<void> {
    return this.playToneSequence([
      { freq: 523.25, duration: 0.1, type: "sine" },
      { freq: 659.25, duration: 0.1, type: "sine" },
      { freq: 783.99, duration: 0.16, type: "sine" },
    ], 0.04);
  }

  /** Error: soft low double tone */
  private playError(): Promise<void> {
    return this.playToneSequence([
      { freq: 330, duration: 0.12, type: "triangle" },
      { freq: 294, duration: 0.16, type: "triangle" },
    ], 0.06);
  }

  /** Notification: single bright ping */
  private playNotification(): Promise<void> {
    return this.playToneSequence([
      { freq: 880, duration: 0.08, type: "sine" },
    ], 0);
  }

  /** Urgent: attention-getting three-pulse */
  private playUrgent(): Promise<void> {
    return this.playToneSequence([
      { freq: 880, duration: 0.08, type: "square" },
      { freq: 880, duration: 0.08, type: "square" },
      { freq: 1046.5, duration: 0.12, type: "square" },
    ], 0.08);
  }

  /** Generic tone sequence player with envelope */
  private playToneSequence(
    tones: { freq: number; duration: number; type: OscillatorType }[],
    gap: number,
  ): Promise<void> {
    if (!this.ctx || !this.gainNode) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const ctx = this.ctx!;
      let offset = ctx.currentTime;
      let lastOsc: OscillatorNode | null = null;

      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = tone.type;
        osc.frequency.value = tone.freq;

        // Smooth envelope: attack 10ms, hold, release 30ms
        env.gain.setValueAtTime(0, offset);
        env.gain.linearRampToValueAtTime(1, offset + 0.01);
        env.gain.setValueAtTime(1, offset + tone.duration - 0.03);
        env.gain.linearRampToValueAtTime(0, offset + tone.duration);

        osc.connect(env);
        env.connect(this.gainNode!);

        osc.start(offset);
        osc.stop(offset + tone.duration);

        offset += tone.duration + gap;
        lastOsc = osc;
      }

      if (lastOsc) {
        lastOsc.onended = () => resolve();
        this.currentSource = lastOsc;
      } else {
        resolve();
      }
    });
  }
}

// Singleton
export const audioEngine = new AudioEngineUNPRO();

// Auto-load prefs
audioEngine.loadPrefs();
