/**
 * AlexVoiceRouterService
 * Selects the best voice provider based on context, device, network, role.
 * Manages fallback chain.
 */

import {
  type VoiceProviderKey,
  type ConnectionMode,
  type VoiceProfileKey,
  type VoiceProviderConfig,
  DEFAULT_PROVIDERS,
  DEFAULT_VOICE_PROFILES,
} from './alexVoiceProviderRegistry';

export interface DeviceCapabilities {
  hasMicrophone: boolean;
  hasSpeaker: boolean;
  webrtcSupported: boolean;
  preferredInputMode: 'voice' | 'text';
  preferredOutputMode: 'audio' | 'text';
  permissionMicrophone: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface NetworkInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlinkMbps: number;
  rtt: number;
}

export interface VoiceSelectionContext {
  role: VoiceProfileKey;
  language: string;
  device: DeviceCapabilities;
  network: NetworkInfo;
  browserName: string;
  flowType: 'conversation' | 'notification' | 'confirmation';
  previousFailedProviders: VoiceProviderKey[];
}

export interface VoiceSelectionResult {
  provider: VoiceProviderKey;
  fallback: VoiceProviderKey;
  connectionMode: ConnectionMode;
  voiceProfile: typeof DEFAULT_VOICE_PROFILES['homeowner'];
  reason: string;
}

export function selectVoiceProvider(ctx: VoiceSelectionContext): VoiceSelectionResult {
  const profile = DEFAULT_VOICE_PROFILES[ctx.role] ?? DEFAULT_VOICE_PROFILES.homeowner;
  const activeProviders = DEFAULT_PROVIDERS
    .filter(p => p.isActive && !ctx.previousFailedProviders.includes(p.providerKey))
    .sort((a, b) => a.priorityOrder - b.priorityOrder);

  // No mic → skip realtime providers
  const canDoRealtime = ctx.device.hasMicrophone &&
    ctx.device.permissionMicrophone !== 'denied' &&
    ctx.network.effectiveType !== 'slow-2g' &&
    ctx.network.effectiveType !== '2g';

  const canDoWebRTC = canDoRealtime && ctx.device.webrtcSupported;

  let selected: VoiceProviderConfig | undefined;
  let fallback: VoiceProviderConfig | undefined;

  for (const provider of activeProviders) {
    if (!selected) {
      if (provider.supportsRealtimeAudio && !canDoRealtime) continue;
      if (provider.transportMode === 'webrtc' && !canDoWebRTC) continue;
      selected = provider;
    } else if (!fallback && provider.providerKey !== selected.providerKey) {
      fallback = provider;
      break;
    }
  }

  // Ultimate fallback
  if (!selected) {
    selected = activeProviders.find(p => p.providerKey === 'text_only') ?? DEFAULT_PROVIDERS[4];
  }
  if (!fallback) {
    fallback = activeProviders.find(p => p.providerKey !== selected!.providerKey) ?? DEFAULT_PROVIDERS[4];
  }

  const connectionMode: ConnectionMode =
    selected.providerType === 'realtime' ? 'realtime_native' :
    selected.providerType === 'hybrid' ? 'hybrid' :
    selected.providerKey === 'tts_only' ? 'tts_only' : 'text_only';

  return {
    provider: selected.providerKey,
    fallback: fallback.providerKey,
    connectionMode,
    voiceProfile: profile,
    reason: buildReason(selected, ctx),
  };
}

function buildReason(provider: VoiceProviderConfig, ctx: VoiceSelectionContext): string {
  const parts: string[] = [`Provider: ${provider.providerKey}`];
  if (!ctx.device.hasMicrophone) parts.push('no mic');
  if (ctx.device.permissionMicrophone === 'denied') parts.push('mic denied');
  if (ctx.network.effectiveType === '2g' || ctx.network.effectiveType === 'slow-2g') parts.push('slow network');
  if (ctx.previousFailedProviders.length > 0) parts.push(`failed: ${ctx.previousFailedProviders.join(',')}`);
  return parts.join(' | ');
}

export function getNextFallback(
  currentProvider: VoiceProviderKey,
  failedProviders: VoiceProviderKey[]
): VoiceProviderKey {
  const allFailed = [...failedProviders, currentProvider];
  const chain: VoiceProviderKey[] = ['openai_realtime', 'gemini_live', 'hybrid', 'tts_only', 'text_only'];
  return chain.find(p => !allFailed.includes(p)) ?? 'text_only';
}

export function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  return new Promise(async (resolve) => {
    let hasMicrophone = false;
    let permissionMicrophone: DeviceCapabilities['permissionMicrophone'] = 'unknown';

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasMicrophone = devices.some(d => d.kind === 'audioinput');
    } catch { /* ignore */ }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissionMicrophone = result.state as DeviceCapabilities['permissionMicrophone'];
    } catch { /* ignore */ }

    const webrtcSupported = !!(window.RTCPeerConnection);

    resolve({
      hasMicrophone,
      hasSpeaker: true, // assume true
      webrtcSupported,
      preferredInputMode: hasMicrophone && permissionMicrophone !== 'denied' ? 'voice' : 'text',
      preferredOutputMode: 'audio',
      permissionMicrophone,
    });
  });
}

export function detectNetworkInfo(): NetworkInfo {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn) return { effectiveType: 'unknown', downlinkMbps: 10, rtt: 50 };
  return {
    effectiveType: conn.effectiveType || 'unknown',
    downlinkMbps: conn.downlink || 10,
    rtt: conn.rtt || 50,
  };
}
