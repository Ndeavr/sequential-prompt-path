/**
 * STT Provider abstraction for Alex Voice.
 *
 * Defines a pluggable interface so the transcription engine can be swapped
 * (Web Speech API → ElevenLabs Scribe → Deepgram → etc.) without touching
 * the session or gateway layer.
 */

// ─── Event types emitted by any STT provider ───
export interface SttPartialEvent {
  type: "transcript.partial";
  text: string;
  confidence?: number;
}

export interface SttFinalEvent {
  type: "transcript.final";
  text: string;
  confidence?: number;
  durationMs?: number;
}

export interface SttErrorEvent {
  type: "transcript.error";
  message: string;
}

export type SttEvent = SttPartialEvent | SttFinalEvent | SttErrorEvent;

export type SttEventHandler = (event: SttEvent) => void;

// ─── Provider interface ───
export interface SttProvider {
  /** Push a base64-encoded audio chunk into the transcription pipeline. */
  pushAudioChunk(audioBase64: string): void;

  /** Signal that no more audio will arrive; finalize and emit transcript.final. */
  finalize(): Promise<void>;

  /** Tear down resources (sockets, buffers, etc.). */
  close(): void;
}

// ─── Factory ───
export type SttProviderFactory = (onEvent: SttEventHandler) => SttProvider;

// ─── Placeholder implementation (accumulates chunks, returns transcript on finalize) ───
/**
 * PassthroughSttProvider — Placeholder that accepts audio chunks but does NOT
 * transcribe. The actual transcript is supplied externally (e.g. from the
 * client's Web Speech API). This keeps the gateway architecture clean while
 * we integrate a real server-side STT engine.
 *
 * Usage: call `setExternalTranscript()` with the text from the client,
 * then `finalize()` to emit the transcript.final event.
 */
export class PassthroughSttProvider implements SttProvider {
  private onEvent: SttEventHandler;
  private chunks: string[] = [];
  private externalTranscript: string | null = null;
  private closed = false;

  constructor(onEvent: SttEventHandler) {
    this.onEvent = onEvent;
  }

  /** Store external transcript (e.g. from client Web Speech API). */
  setExternalTranscript(text: string) {
    this.externalTranscript = text;
  }

  pushAudioChunk(audioBase64: string): void {
    if (this.closed) return;
    this.chunks.push(audioBase64);
    // In a real provider, partial transcripts would be emitted here.
  }

  async finalize(): Promise<void> {
    if (this.closed) return;
    const text = this.externalTranscript ?? "";
    if (text) {
      this.onEvent({
        type: "transcript.final",
        text,
        confidence: this.externalTranscript ? 0.95 : 0,
      });
    }
    this.chunks = [];
    this.externalTranscript = null;
  }

  close(): void {
    this.closed = true;
    this.chunks = [];
  }
}

// ─── Future real provider skeleton ───
/**
 * ElevenLabsSttProvider — will use ElevenLabs Scribe v2 Realtime WebSocket.
 * Uncomment and implement when integrating server-side STT.
 *
 * export class ElevenLabsSttProvider implements SttProvider {
 *   private ws: WebSocket | null = null;
 *   private onEvent: SttEventHandler;
 *
 *   constructor(onEvent: SttEventHandler, options?: { apiKey?: string; language?: string }) {
 *     this.onEvent = onEvent;
 *     // Open wss://api.elevenlabs.io/v1/speech-to-text/scribe_v2_realtime
 *   }
 *
 *   pushAudioChunk(audioBase64: string): void {
 *     // Send audio chunk over WebSocket
 *     // On partial results → this.onEvent({ type: "transcript.partial", text })
 *   }
 *
 *   async finalize(): Promise<void> {
 *     // Send commit, wait for final transcript
 *     // this.onEvent({ type: "transcript.final", text, confidence })
 *   }
 *
 *   close(): void {
 *     this.ws?.close();
 *     this.ws = null;
 *   }
 * }
 */
