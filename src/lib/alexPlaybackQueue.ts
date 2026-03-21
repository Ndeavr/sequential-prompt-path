/**
 * AlexPlaybackQueue — Interrupt-safe audio playback queue for Alex Voice.
 *
 * Features:
 * - Sequential chunk playback (one at a time)
 * - Session token protection against stale chunks
 * - Instant interrupt: stop + clear + invalidate old session
 */

export type PlaybackState = "idle" | "playing" | "interrupted";

export type PlaybackStateChangeHandler = (state: PlaybackState) => void;

export class AlexPlaybackQueue {
  private queue: string[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private state: PlaybackState = "idle";
  private sessionToken = 0;
  private onStateChange?: PlaybackStateChangeHandler;

  constructor(onStateChange?: PlaybackStateChangeHandler) {
    this.onStateChange = onStateChange;
  }

  private setState(s: PlaybackState) {
    if (this.state === s) return;
    this.state = s;
    this.onStateChange?.(s);
  }

  /** Add a base64 MP3 chunk. Stale-session chunks are silently dropped. */
  enqueueAudioChunk(base64: string, token?: number) {
    if (token !== undefined && token !== this.sessionToken) return;
    this.queue.push(base64);
    if (this.state === "idle") this.playNext();
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.setState("idle");
      return;
    }

    const capturedToken = this.sessionToken;
    const chunk = this.queue.shift()!;
    const audio = new Audio(`data:audio/mpeg;base64,${chunk}`);
    this.currentAudio = audio;
    this.setState("playing");

    audio.onended = () => {
      if (this.sessionToken !== capturedToken) return;
      this.currentAudio = null;
      this.playNext();
    };

    audio.onerror = () => {
      if (this.sessionToken !== capturedToken) return;
      this.currentAudio = null;
      this.playNext();
    };

    audio.play().catch(() => {
      if (this.sessionToken !== capturedToken) return;
      this.currentAudio = null;
      this.playNext();
    });
  }

  /** Stop current playback, clear queue, and invalidate session token. */
  stopPlaybackNow() {
    this.sessionToken++;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    this.queue = [];
    this.setState("interrupted");
  }

  /** Clear queued chunks without stopping current playback. */
  clearPlaybackQueue() {
    this.queue = [];
  }

  getPlaybackState(): PlaybackState {
    return this.state;
  }

  /** Current session token — pass to enqueue to protect against stale chunks. */
  getSessionToken(): number {
    return this.sessionToken;
  }

  /** Reset state to idle (e.g. after interrupt is handled). */
  resetToIdle() {
    if (this.state === "interrupted") this.setState("idle");
  }

  destroy() {
    this.stopPlaybackNow();
    this.onStateChange = undefined;
  }
}
