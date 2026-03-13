import { useState, useCallback, useRef } from "react";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export const useAlexVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const onDoneRef = useRef<(() => void) | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  }, []);

  const finishIfIdle = useCallback(() => {
    if (!processingRef.current && queueRef.current.length === 0) {
      setIsSpeaking(false);
      const done = onDoneRef.current;
      onDoneRef.current = null;
      done?.();
    }
  }, []);

  const processQueue = useCallback(async () => {
    console.log(
      "[AlexVoice] processQueue called, processing:",
      processingRef.current,
      "queue:",
      queueRef.current.length
    );

    if (processingRef.current) return;

    if (queueRef.current.length === 0) {
      finishIfIdle();
      return;
    }

    processingRef.current = true;
    setIsSpeaking(true);

    const text = queueRef.current.shift()!;
    console.log("[AlexVoice] Fetching TTS for:", text.substring(0, 50));

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error("TTS fetch failed:", response.status);
        processingRef.current = false;
        queueMicrotask(() => processQueue());
        return;
      }

      const blob = await response.blob();
      cleanupObjectUrl();
      const url = URL.createObjectURL(blob);
      currentObjectUrlRef.current = url;

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.preload = "auto";

      audio.onended = () => {
        cleanupObjectUrl();
        processingRef.current = false;
        queueMicrotask(() => processQueue());
      };

      audio.onerror = () => {
        cleanupObjectUrl();
        processingRef.current = false;
        queueMicrotask(() => processQueue());
      };

      try {
        await audio.play();
      } catch (playErr: any) {
        console.error(
          "[AlexVoice] audio.play() rejected:",
          playErr?.name,
          playErr?.message
        );
        cleanupObjectUrl();
        processingRef.current = false;
        queueMicrotask(() => processQueue());
      }
    } catch (err) {
      console.error("[AlexVoice] TTS playback error:", err);
      cleanupObjectUrl();
      processingRef.current = false;
      queueMicrotask(() => processQueue());
    }
  }, [cleanupObjectUrl, finishIfIdle]);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      console.log("[AlexVoice] speak() called with:", text.substring(0, 80));
      if (onDone) onDoneRef.current = onDone;
      const chunks = splitIntoChunks(text, 250);
      queueRef.current.push(...chunks);
      queueMicrotask(() => processQueue());
    },
    [processQueue]
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    processingRef.current = false;
    onDoneRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    cleanupObjectUrl();
    setIsSpeaking(false);
  }, [cleanupObjectUrl]);

  return { isSpeaking, speak, stop };
};

/** Split text into sentence-boundary chunks for streaming TTS */
function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Find last sentence-end within maxLen
    let splitIdx = -1;
    for (const sep of [". ", "! ", "? ", ".\n", "!\n", "?\n"]) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > splitIdx) splitIdx = idx + sep.length;
    }

    if (splitIdx <= 0) {
      // Fallback: split at last space
      splitIdx = remaining.lastIndexOf(" ", maxLen);
      if (splitIdx <= 0) splitIdx = maxLen;
    }

    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  return chunks.filter(Boolean);
}
