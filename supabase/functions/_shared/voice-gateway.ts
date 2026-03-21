/**
 * VoiceGateway — WebSocket message router for Alex Voice.
 *
 * Handles:
 * - session.start  → initialize session, return session.ready
 * - audio.chunk    → forward to STT provider
 * - audio.stop     → finalize transcript, get AI response, stream TTS
 * - interrupt      → cancel generation, return to listening
 *
 * Uses pluggable SttProvider abstraction so the transcription engine can be
 * swapped without rewriting session logic.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { alexVoiceBrain, AlexBrainError } from "./alex-voice-brain.ts";
import {
  buildAlexGreeting,
  processAlexResponse,
  normalizeTextForFrenchTts,
  ALEX_VOICE_CONFIG,
} from "./alex-french-voice.ts";
import {
  prepareAlexSpeechStyle,
  shapeTextForHumanSpeech,
} from "./alex-human-voice.ts";
import {
  createSession,
  transitionState,
  addUserMessage,
  addAssistantMessage,
  recordInterrupt,
  type VoiceSessionContext,
} from "./voice-session.ts";
import {
  PassthroughSttProvider,
  type SttProvider,
  type SttEvent,
  type SttProviderFactory,
} from "./stt-provider.ts";

// ─── Config ───
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Types ───
export type WsIncoming =
  | { type: "session.start"; userId?: string; userName?: string; context?: Record<string, unknown> }
  | { type: "audio.chunk"; data?: string }
  | { type: "audio.stop"; transcript?: string }
  | { type: "interrupt" };

export type WsOutgoing =
  | { type: "session.ready"; sessionId: string; greeting: string; greetingAudio: string | null }
  | { type: "state.change"; state: string }
  | { type: "audio.chunk.ack" }
  | { type: "transcript.partial"; text: string }
  | { type: "transcript.final"; text: string }
  | { type: "response.text"; text: string; uiActions: Array<Record<string, string>> }
  | { type: "response.audio"; chunk: string; index: number; total: number }
  | { type: "response.done" }
  | { type: "interrupt.ack" }
  | { type: "error"; message: string };

// ─── Gateway class ───
export class VoiceGateway {
  private ws: WebSocket;
  private session: VoiceSessionContext | null = null;
  private abortController: AbortController | null = null;
  private supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  private sttProvider: SttProvider | null = null;
  private sttFactory: SttProviderFactory;

  constructor(ws: WebSocket, sttFactory?: SttProviderFactory) {
    this.ws = ws;
    // Default to PassthroughSttProvider; override with real provider via factory
    this.sttFactory = sttFactory ?? ((onEvent) => new PassthroughSttProvider(onEvent));
  }

  send(msg: WsOutgoing) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  async handleMessage(raw: string) {
    let msg: WsIncoming;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.send({ type: "error", message: "Invalid JSON" });
      return;
    }

    switch (msg.type) {
      case "session.start":
        await this.handleSessionStart(msg);
        break;
      case "audio.chunk":
        this.handleAudioChunk(msg);
        break;
      case "audio.stop":
        await this.handleAudioStop(msg);
        break;
      case "interrupt":
        this.handleInterrupt();
        break;
      default:
        this.send({ type: "error", message: "Unknown message type" });
    }
  }

  // ─── STT event handler ───
  private handleSttEvent(event: SttEvent) {
    switch (event.type) {
      case "transcript.partial":
        this.send({ type: "transcript.partial", text: event.text });
        break;
      case "transcript.final":
        this.send({ type: "transcript.final", text: event.text });
        break;
      case "transcript.error":
        this.send({ type: "error", message: event.message });
        break;
    }
  }

  // ─── session.start ───
  private async handleSessionStart(msg: Extract<WsIncoming, { type: "session.start" }>) {
    const sessionId = crypto.randomUUID();
    this.session = createSession({
      sessionId,
      userId: msg.userId,
      userName: msg.userName,
      context: msg.context,
    });
    transitionState(this.session, "listening");

    // Initialize STT provider for this session
    this.sttProvider?.close();
    this.sttProvider = this.sttFactory((event) => this.handleSttEvent(event));

    // Persist session
    await this.supabase.from("voice_sessions").insert({
      id: sessionId,
      user_id: msg.userId || null,
      feature: "realtime",
      transcript: "",
      context_json: {
        userName: msg.userName,
        ...msg.context,
        created_at: this.session.createdAt,
      },
    }).catch(() => {});

    // Deterministic greeting via builder
    const greetingResult = buildAlexGreeting({
      firstName: msg.userName,
      localHour: null, // will use UTC offset
      utcOffset: -5,
    });
    const greeting = greetingResult.spokenGreeting;

    // TTS normalize for pronunciation, then generate
    const greetingForTTS = normalizeTextForFrenchTts(greeting);
    const greetingAudio = await this.generateTTS(greetingForTTS);

    this.send({
      type: "session.ready",
      sessionId,
      greeting,
      greetingAudio,
    });
    this.send({ type: "state.change", state: "listening" });
  }

  // ─── audio.chunk ───
  private handleAudioChunk(msg: Extract<WsIncoming, { type: "audio.chunk" }>) {
    if (msg.data && this.sttProvider) {
      this.sttProvider.pushAudioChunk(msg.data);
    }
    this.send({ type: "audio.chunk.ack" });
  }

  // ─── audio.stop ───
  private async handleAudioStop(msg: Extract<WsIncoming, { type: "audio.stop" }>) {
    if (!this.session) {
      this.send({ type: "error", message: "No active session" });
      return;
    }

    // If client sent transcript directly (Web Speech API), feed it to the provider
    if (msg.transcript && this.sttProvider instanceof PassthroughSttProvider) {
      (this.sttProvider as PassthroughSttProvider).setExternalTranscript(msg.transcript);
    }

    // Finalize STT
    if (this.sttProvider) {
      await this.sttProvider.finalize();
    }

    // Use transcript from message or wait for STT (passthrough uses external)
    const userText = msg.transcript?.trim() || "";
    if (!userText) {
      this.send({ type: "state.change", state: "listening" });
      return;
    }

    // Transition to thinking
    transitionState(this.session, "thinking");
    addUserMessage(this.session, userText);
    this.send({ type: "state.change", state: "thinking" });

    // Set up abort for interruption
    this.abortController = new AbortController();

    try {
      // Call Alex brain
      const brainResult = await alexVoiceBrain(
        {
          transcript: userText,
          messages: this.session.messages.slice(0, -1), // exclude the just-added user msg
          userId: this.session.userId,
          sessionId: this.session.sessionId,
          userName: this.session.userName,
          pageContext: {
            currentPage: this.session.currentPage,
            activeProperty: this.session.activeProperty,
            isAuthenticated: this.session.isAuthenticated,
            userRole: this.session.userRole,
            hasScore: this.session.hasScore,
          },
        },
        { signal: this.abortController.signal }
      );

      const { alexText, uiActions, nextBestAction } = brainResult;

      // ── Full French Voice Pipeline ──
      const { displayText, ttsSentences } = processAlexResponse(alexText);
      addAssistantMessage(this.session, displayText);

      // Send display text immediately (transcript parity)
      this.send({ type: "response.text", text: displayText, uiActions: uiActions as Array<Record<string, string>> });

      // Check if interrupted before TTS
      if (this.abortController.signal.aborted) return;

      // Transition to speaking
      transitionState(this.session, "speaking");
      this.send({ type: "state.change", state: "speaking" });

      // Human voice shaping per sentence
      const speechStyle = prepareAlexSpeechStyle({ mode: "neutral" });
      const shapedSentences = ttsSentences.map(s => shapeTextForHumanSpeech(s, speechStyle));

      for (let i = 0; i < shapedSentences.length; i++) {
        if (this.abortController.signal.aborted) break;

        const audioBase64 = await this.generateTTS(shapedSentences[i]);
        if (audioBase64 && !this.abortController.signal.aborted) {
          this.send({
            type: "response.audio",
            chunk: audioBase64,
            index: i,
            total: shapedSentences.length,
          });
        }
      }

      if (!this.abortController.signal.aborted) {
        this.send({ type: "response.done" });
        transitionState(this.session, "listening");
        this.send({ type: "state.change", state: "listening" });
      }

      // Log event
      await this.supabase.from("voice_events").insert({
        session_id: this.session.sessionId,
        event_type: "ws_response",
        metadata: {
          user_message: userText,
          alex_text: displayText,
          ui_actions: uiActions,
          next_best_action: nextBestAction,
          turn: this.session.turnCount,
        },
      }).catch(() => {});

    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof AlexBrainError) {
        this.send({ type: "error", message: err.message });
      } else {
        console.error("voice-gateway error:", err);
        this.send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      }
      if (this.session) {
        transitionState(this.session, "listening");
        this.send({ type: "state.change", state: "listening" });
      }
    } finally {
      this.abortController = null;
    }
  }

  // ─── interrupt ───
  private handleInterrupt() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.session) {
      recordInterrupt(this.session);
      transitionState(this.session, "listening");
    }
    this.send({ type: "interrupt.ack" });
    this.send({ type: "state.change", state: "listening" });
  }

  // ─── TTS helper ───
  private async generateTTS(text: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_22050_32`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.78,
              style: 0.15,
              use_speaker_boost: true,
              speed: 1.05,
            },
          }),
        }
      );
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return base64Encode(buffer);
    } catch {
      return null;
    }
  }


  cleanup() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.sttProvider?.close();
    this.sttProvider = null;
  }
}
