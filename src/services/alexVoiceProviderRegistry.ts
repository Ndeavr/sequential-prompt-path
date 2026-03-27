/**
 * AlexVoiceProviderRegistry
 * Central registry for voice providers with abstraction layer.
 * Never code Alex directly against a single vendor.
 */

export type VoiceProviderKey = 'openai_realtime' | 'gemini_live' | 'hybrid' | 'tts_only' | 'text_only';
export type ConnectionMode = 'realtime_native' | 'hybrid' | 'tts_only' | 'text_only';
export type VoiceProfileKey = 'homeowner' | 'entrepreneur' | 'condo_manager';

export interface VoiceProviderConfig {
  providerKey: VoiceProviderKey;
  providerType: 'realtime' | 'hybrid' | 'tts';
  modelName: string;
  transportMode: 'websocket' | 'webrtc' | 'http';
  supportsRealtimeAudio: boolean;
  supportsBargeIn: boolean;
  supportsToolCalling: boolean;
  supportsTextFallback: boolean;
  priorityOrder: number;
  isActive: boolean;
  deprecationRisk: 'low' | 'medium' | 'high';
  rolloutPercentage: number;
}

export interface VoiceProfile {
  profileKey: VoiceProfileKey;
  language: string;
  localeCode: string;
  providerPreferenceOrder: VoiceProviderKey[];
  voiceNamePrimary: string | null;
  voiceNameSecondary: string | null;
  speechRate: number;
  speechStyle: string;
  interruptibilityMode: 'immediate' | 'sentence_end' | 'disabled';
  prosodyProfile: Record<string, unknown>;
}

// Default provider configurations (fallback if DB unavailable)
export const DEFAULT_PROVIDERS: VoiceProviderConfig[] = [
  {
    providerKey: 'openai_realtime',
    providerType: 'realtime',
    modelName: 'gpt-4o-realtime-preview',
    transportMode: 'webrtc',
    supportsRealtimeAudio: true,
    supportsBargeIn: true,
    supportsToolCalling: true,
    supportsTextFallback: true,
    priorityOrder: 1,
    isActive: true,
    deprecationRisk: 'low',
    rolloutPercentage: 100,
  },
  {
    providerKey: 'gemini_live',
    providerType: 'realtime',
    modelName: 'gemini-3.1-flash-live-preview',
    transportMode: 'websocket',
    supportsRealtimeAudio: true,
    supportsBargeIn: true,
    supportsToolCalling: true,
    supportsTextFallback: true,
    priorityOrder: 2,
    isActive: true,
    deprecationRisk: 'medium',
    rolloutPercentage: 100,
  },
  {
    providerKey: 'hybrid',
    providerType: 'hybrid',
    modelName: 'google/gemini-3-flash-preview',
    transportMode: 'http',
    supportsRealtimeAudio: false,
    supportsBargeIn: false,
    supportsToolCalling: true,
    supportsTextFallback: true,
    priorityOrder: 3,
    isActive: true,
    deprecationRisk: 'low',
    rolloutPercentage: 100,
  },
  {
    providerKey: 'tts_only',
    providerType: 'tts',
    modelName: 'tts-fallback',
    transportMode: 'http',
    supportsRealtimeAudio: false,
    supportsBargeIn: false,
    supportsToolCalling: false,
    supportsTextFallback: true,
    priorityOrder: 4,
    isActive: true,
    deprecationRisk: 'low',
    rolloutPercentage: 100,
  },
  {
    providerKey: 'text_only',
    providerType: 'tts',
    modelName: 'text-fallback',
    transportMode: 'http',
    supportsRealtimeAudio: false,
    supportsBargeIn: false,
    supportsToolCalling: false,
    supportsTextFallback: true,
    priorityOrder: 5,
    isActive: true,
    deprecationRisk: 'low',
    rolloutPercentage: 100,
  },
];

export const DEFAULT_VOICE_PROFILES: Record<VoiceProfileKey, VoiceProfile> = {
  homeowner: {
    profileKey: 'homeowner',
    language: 'fr',
    localeCode: 'fr-QC',
    providerPreferenceOrder: ['openai_realtime', 'gemini_live', 'hybrid', 'tts_only', 'text_only'],
    voiceNamePrimary: 'alloy',
    voiceNameSecondary: null,
    speechRate: 1.0,
    speechStyle: 'natural_quebec_concierge',
    interruptibilityMode: 'immediate',
    prosodyProfile: { warmth: 0.8, energy: 0.5, formality: 0.3 },
  },
  entrepreneur: {
    profileKey: 'entrepreneur',
    language: 'fr',
    localeCode: 'fr-QC',
    providerPreferenceOrder: ['openai_realtime', 'gemini_live', 'hybrid', 'tts_only', 'text_only'],
    voiceNamePrimary: 'echo',
    voiceNameSecondary: null,
    speechRate: 1.05,
    speechStyle: 'direct_energetic',
    interruptibilityMode: 'immediate',
    prosodyProfile: { warmth: 0.5, energy: 0.8, formality: 0.4 },
  },
  condo_manager: {
    profileKey: 'condo_manager',
    language: 'fr',
    localeCode: 'fr-QC',
    providerPreferenceOrder: ['openai_realtime', 'gemini_live', 'hybrid', 'tts_only', 'text_only'],
    voiceNamePrimary: 'onyx',
    voiceNameSecondary: null,
    speechRate: 0.95,
    speechStyle: 'structured_professional',
    interruptibilityMode: 'sentence_end',
    prosodyProfile: { warmth: 0.4, energy: 0.4, formality: 0.8 },
  },
};
