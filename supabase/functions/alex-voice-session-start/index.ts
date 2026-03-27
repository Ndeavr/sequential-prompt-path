import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, preferred_mode, role, device_info, network_info } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active providers from registry
    const { data: providers } = await supabase
      .from("alex_voice_provider_registry")
      .select("*")
      .eq("is_active", true)
      .order("priority_order", { ascending: true });

    // Get voice profile for role
    const { data: profileData } = await supabase
      .from("alex_voice_profile_configs")
      .select("*")
      .eq("profile_key", role || "homeowner")
      .eq("is_active", true)
      .single();

    const profile = profileData || {
      profile_key: "homeowner",
      language: "fr",
      locale_code: "fr-QC",
      provider_preference_order: ["openai_realtime", "gemini_live", "hybrid", "text_only"],
      voice_name_primary: null,
      speech_rate: 1.0,
      speech_style: "natural_quebec_concierge",
      interruptibility_mode: "immediate",
    };

    // Select provider based on context
    const hasMic = device_info?.has_microphone !== false;
    const goodNetwork = !["2g", "slow-2g"].includes(network_info?.effective_type || "4g");
    const webrtcOk = device_info?.webrtc_supported !== false;

    let selectedProvider = "text_only";
    let fallbackProvider = "text_only";
    let connectionMode = "text_only";

    const preferenceOrder: string[] = (profile as any).provider_preference_order || 
      ["openai_realtime", "gemini_live", "hybrid", "text_only"];

    for (const pref of preferenceOrder) {
      const providerConfig = (providers || []).find((p: any) => p.provider_key === pref);
      if (!providerConfig) continue;

      if (providerConfig.supports_realtime_audio && (!hasMic || !goodNetwork)) continue;
      if (providerConfig.transport_mode === "webrtc" && !webrtcOk) continue;

      if (selectedProvider === "text_only") {
        selectedProvider = pref;
        connectionMode = providerConfig.provider_type === "realtime" ? "realtime_native" :
                         providerConfig.provider_type === "hybrid" ? "hybrid" : "tts_only";
      } else if (fallbackProvider === "text_only" && pref !== selectedProvider) {
        fallbackProvider = pref;
        break;
      }
    }

    // Override with preferred mode if valid
    if (preferred_mode && preferenceOrder.includes(preferred_mode)) {
      selectedProvider = preferred_mode;
    }

    // Create voice session
    const { data: voiceSession, error: insertError } = await supabase
      .from("alex_voice_sessions")
      .insert({
        session_id,
        provider_primary: selectedProvider,
        provider_current: selectedProvider,
        provider_fallback: fallbackProvider,
        connection_mode: connectionMode,
        voice_profile_key: (profile as any).profile_key,
        voice_name: (profile as any).voice_name_primary,
        language: (profile as any).language,
        locale_code: (profile as any).locale_code,
        network_quality: network_info?.effective_type || "unknown",
        device_type: device_info?.device_type || "unknown",
        browser_name: device_info?.browser_name || "unknown",
        session_status: "active",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Log device capabilities
    await supabase.from("alex_device_audio_capabilities").insert({
      session_id,
      has_microphone: hasMic,
      has_speaker: device_info?.has_speaker ?? true,
      webrtc_supported: webrtcOk,
      preferred_input_mode: hasMic ? "voice" : "text",
      preferred_output_mode: "audio",
      permission_microphone: device_info?.permission_microphone || "unknown",
    });

    return new Response(JSON.stringify({
      voice_session_id: (voiceSession as any)?.id,
      provider_selected: selectedProvider,
      provider_fallback: fallbackProvider,
      connection_mode: connectionMode,
      voice_profile: {
        key: (profile as any).profile_key,
        voice_name: (profile as any).voice_name_primary,
        speech_rate: (profile as any).speech_rate,
        speech_style: (profile as any).speech_style,
        locale_code: (profile as any).locale_code,
        interruptibility_mode: (profile as any).interruptibility_mode,
      },
      client_config: {
        language: (profile as any).language,
        locale_code: (profile as any).locale_code,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("alex-voice-session-start error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
