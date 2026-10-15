import { supabase } from "@/integrations/supabase/client";

/** Keep MP3 bytes intact: functions.invoke treats audio/mpeg as response.text(). */
export async function requestVoiceTestAudio(voiceId: string, text: string): Promise<ArrayBuffer> {
  const { data: { session } } = await supabase.auth.getSession();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-test`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${session?.access_token ?? key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ voice_id: voiceId, test_text: text, language: "fr" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Voice test HTTP ${response.status}`);
    const type = response.headers.get("content-type")?.split(";")[0].trim();
    if (!type?.startsWith("audio/") && type !== "application/octet-stream") throw new Error("Voice test did not return audio");
    return await response.arrayBuffer();
  } finally {
    clearTimeout(timeout);
  }
}
