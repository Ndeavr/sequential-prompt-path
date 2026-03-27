/**
 * AlexVoiceAbstraction
 * Unified interface for all voice providers.
 * Each provider implements this interface.
 */

export type VoiceSessionState = 
  | 'idle' 
  | 'connecting' 
  | 'listening' 
  | 'speaking' 
  | 'interrupted' 
  | 'recovering' 
  | 'error' 
  | 'closed';

export interface VoiceSessionEvents {
  onStateChange: (state: VoiceSessionState) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onAlexResponse: (text: string, isFinal: boolean) => void;
  onAudioOutput: (audioData: ArrayBuffer) => void;
  onError: (error: VoiceError) => void;
  onBargeIn: () => void;
  onLatencyReport: (latencyMs: number) => void;
}

export interface VoiceError {
  code: string;
  message: string;
  provider: string;
  recoverable: boolean;
}

export interface VoiceSessionConfig {
  sessionId: string;
  language: string;
  localeCode: string;
  voiceName: string | null;
  speechRate: number;
  systemPrompt: string;
  tools?: VoiceTool[];
}

export interface VoiceTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Abstract voice provider interface.
 * All providers (OpenAI Realtime, Gemini Live, Hybrid) implement this.
 */
export interface IAlexVoiceProvider {
  readonly providerKey: string;
  readonly state: VoiceSessionState;

  startSession(config: VoiceSessionConfig, events: VoiceSessionEvents): Promise<void>;
  sendAudioChunk(chunk: ArrayBuffer): void;
  sendTextTurn(text: string): Promise<void>;
  interruptSpeech(): void;
  switchProvider(): void; // signal to orchestrator
  closeSession(): Promise<void>;
}

/**
 * Hybrid voice provider: STT → Alex Runtime → TTS
 * Fallback mode when realtime providers are unavailable.
 */
export class HybridVoiceProvider implements IAlexVoiceProvider {
  readonly providerKey = 'hybrid';
  private _state: VoiceSessionState = 'idle';
  private events: VoiceSessionEvents | null = null;
  private recognition: any = null;
  private synthesis: SpeechSynthesisUtterance | null = null;

  get state() { return this._state; }

  async startSession(config: VoiceSessionConfig, events: VoiceSessionEvents): Promise<void> {
    this.events = events;
    this.setState('connecting');

    // Setup Web Speech API STT
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = config.localeCode || 'fr-CA';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1];
        events.onTranscript(last[0].transcript, last.isFinal);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        events.onError({
          code: event.error,
          message: `STT error: ${event.error}`,
          provider: this.providerKey,
          recoverable: event.error !== 'not-allowed',
        });
      };
    }

    this.setState('listening');
  }

  sendAudioChunk(_chunk: ArrayBuffer): void {
    // Web Speech API handles audio internally via recognition
  }

  async sendTextTurn(text: string): Promise<void> {
    this.events?.onTranscript(text, true);
    // The orchestrator handles sending to Alex runtime
  }

  interruptSpeech(): void {
    window.speechSynthesis?.cancel();
    this.setState('interrupted');
    this.events?.onBargeIn();
    setTimeout(() => this.setState('listening'), 100);
  }

  switchProvider(): void {
    // Signal to orchestrator
  }

  async closeSession(): Promise<void> {
    this.recognition?.stop();
    window.speechSynthesis?.cancel();
    this.setState('closed');
  }

  // TTS output for hybrid mode
  speak(text: string, localeCode: string, rate: number): void {
    this.setState('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeCode;
    utterance.rate = rate;
    utterance.onend = () => this.setState('listening');
    utterance.onerror = () => this.setState('listening');
    this.synthesis = utterance;
    window.speechSynthesis?.speak(utterance);
  }

  startListening(): void {
    try {
      this.recognition?.start();
      this.setState('listening');
    } catch { /* already started */ }
  }

  stopListening(): void {
    this.recognition?.stop();
  }

  private setState(s: VoiceSessionState) {
    this._state = s;
    this.events?.onStateChange(s);
  }
}

/**
 * Text-only fallback provider
 * No audio, purely text-based interaction.
 */
export class TextOnlyVoiceProvider implements IAlexVoiceProvider {
  readonly providerKey = 'text_only';
  private _state: VoiceSessionState = 'idle';
  private events: VoiceSessionEvents | null = null;

  get state() { return this._state; }

  async startSession(_config: VoiceSessionConfig, events: VoiceSessionEvents): Promise<void> {
    this.events = events;
    this._state = 'listening';
    events.onStateChange('listening');
  }

  sendAudioChunk(): void { /* no-op */ }

  async sendTextTurn(text: string): Promise<void> {
    this.events?.onTranscript(text, true);
  }

  interruptSpeech(): void { /* no-op */ }
  switchProvider(): void { /* no-op */ }

  async closeSession(): Promise<void> {
    this._state = 'closed';
    this.events?.onStateChange('closed');
  }
}
