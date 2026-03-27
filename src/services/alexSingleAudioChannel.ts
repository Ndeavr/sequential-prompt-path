/**
 * AlexSingleAudioChannel — THE single source of truth for Alex voice output.
 * 
 * RULE: Only ONE audio can ever play at a time. Period.
 * Starting new audio instantly kills previous audio.
 * No overlap, no double playback, no stale chunks.
 */

type AudioState = 'idle' | 'loading' | 'playing' | 'interrupted' | 'error';
type StateListener = (state: AudioState) => void;

class AlexSingleAudioChannel {
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private queue: string[] = [];
  private state: AudioState = 'idle';
  private listeners: Set<StateListener> = new Set();
  private destroyed = false;

  /** Subscribe to state changes */
  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): AudioState {
    return this.state;
  }

  isPlaying(): boolean {
    return this.state === 'playing' || this.state === 'loading';
  }

  /** 
   * HARD STOP — Kill everything immediately.
   * Called before any new audio, on interruption, or on cleanup.
   */
  hardStop(): void {
    // Kill current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio.load(); // Force release
      this.currentAudio = null;
    }

    // Revoke object URL
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    // Flush queue
    this.queue = [];

    this.setState('idle');
  }

  /**
   * Play audio from a blob. Kills any existing playback first.
   */
  async playBlob(blob: Blob): Promise<void> {
    if (this.destroyed) return;
    
    // ALWAYS stop previous before starting new
    this.hardStop();
    
    this.setState('loading');

    const url = URL.createObjectURL(blob);
    this.currentObjectUrl = url;

    const audio = new Audio(url);
    this.currentAudio = audio;

    return new Promise<void>((resolve) => {
      audio.onended = () => {
        this.cleanup();
        this.setState('idle');
        resolve();
        // Play next in queue if any
        this.playNextInQueue();
      };

      audio.onerror = () => {
        this.cleanup();
        this.setState('error');
        resolve();
      };

      audio.play().then(() => {
        if (this.currentAudio === audio) {
          this.setState('playing');
        }
      }).catch(() => {
        this.cleanup();
        this.setState('error');
        resolve();
      });
    });
  }

  /**
   * Play audio from base64 string. Kills any existing playback first.
   */
  async playBase64(base64: string, mimeType = 'audio/mpeg'): Promise<void> {
    if (this.destroyed) return;

    // ALWAYS stop previous before starting new
    this.hardStop();

    this.setState('loading');

    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    this.currentAudio = audio;

    return new Promise<void>((resolve) => {
      audio.onended = () => {
        this.currentAudio = null;
        this.setState('idle');
        resolve();
        this.playNextInQueue();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        this.setState('error');
        resolve();
      };

      audio.play().then(() => {
        if (this.currentAudio === audio) {
          this.setState('playing');
        }
      }).catch(() => {
        this.currentAudio = null;
        this.setState('error');
        resolve();
      });
    });
  }

  /**
   * Queue base64 audio chunks for sequential playback.
   * Clears any existing queue first (new context = old queue invalid).
   */
  async playChunksSequential(chunks: string[], mimeType = 'audio/mpeg'): Promise<void> {
    if (this.destroyed || chunks.length === 0) return;

    // Kill everything first
    this.hardStop();

    // Play first chunk immediately, queue the rest
    this.queue = chunks.slice(1);
    await this.playBase64(chunks[0], mimeType);
  }

  /** Interrupt — user started talking */
  interrupt(): void {
    this.hardStop();
    this.setState('interrupted');
    // After a brief moment, go to idle
    setTimeout(() => {
      if (this.state === 'interrupted') {
        this.setState('idle');
      }
    }, 100);
  }

  /** Full destroy — call on unmount */
  destroy(): void {
    this.destroyed = true;
    this.hardStop();
    this.listeners.clear();
  }

  private async playNextInQueue(): Promise<void> {
    if (this.queue.length === 0 || this.destroyed) return;
    const next = this.queue.shift()!;
    await this.playBase64(next);
  }

  private cleanup(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.currentAudio = null;
  }

  private setState(s: AudioState): void {
    this.state = s;
    this.listeners.forEach(l => l(s));
  }
}

// SINGLETON — one instance for the entire app
export const alexAudioChannel = new AlexSingleAudioChannel();

export type { AudioState };
export default AlexSingleAudioChannel;
