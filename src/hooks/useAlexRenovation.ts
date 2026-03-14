/**
 * useAlexRenovation — Hook for the renovation visualizer conversation flow.
 * Handles photo upload, room identification, guided chat, and transformation generation.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string; images?: string[] };

type RenovationStep = "upload" | "identify" | "questions" | "generating" | "results";

interface GenerationParams {
  category: string;
  goal?: string;
  budget?: string;
  style?: string;
  timeline?: string;
  details?: string;
}

const RENO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-renovation`;

export const useAlexRenovation = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [step, setStep] = useState<RenovationStep>("upload");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [roomCategory, setRoomCategory] = useState<string | null>(null);
  const [transformations, setTransformations] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  }), [session]);

  // Upload and identify room
  const uploadPhoto = useCallback(async (file: File) => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const base64 = await base64Promise;
    setPhotoBase64(base64);
    setStep("identify");

    // Add user message with photo
    const userMsg: Msg = { role: "user", content: "Voici ma photo.", images: [base64] };
    setMessages([userMsg]);

    // Identify the room
    try {
      const resp = await fetch(RENO_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "identify_room", imageBase64: base64 }),
      });

      if (!resp.ok) throw new Error("Identification failed");
      const data = await resp.json();
      const category = data.category || "living room";
      const descFr = data.description_fr || "";

      setRoomCategory(category);
      setStep("questions");

      const CATEGORY_FR: Record<string, string> = {
        kitchen: "cuisine", bathroom: "salle de bain", basement: "sous-sol",
        "living room": "salon", bedroom: "chambre", facade: "façade",
        roof: "toiture", "paint colors": "peinture", backyard: "cour arrière",
        pool: "piscine", deck: "terrasse", landscaping: "aménagement paysager",
      };

      const catFr = CATEGORY_FR[category] || category;
      const assistantMsg: Msg = {
        role: "assistant",
        content: `Je vois ${descFr ? descFr.toLowerCase() : `une ${catFr}`}. C'est un beau point de départ !\n\nQu'est-ce que vous aimeriez améliorer le plus ?\n\n• **Style** — Moderniser l'apparence\n• **Valeur** — Augmenter la valeur de revente\n• **Fonction** — Améliorer l'utilité\n• **Luminosité** — Plus de lumière naturelle\n• **Efficacité énergétique** — Réduire les coûts\n• **Attrait extérieur** — Première impression`,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Room identification error:", err);
      setRoomCategory("living room");
      setStep("questions");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Belle photo ! Qu'est-ce que vous aimeriez améliorer le plus dans cet espace ?\n\n• **Style** — Moderniser l'apparence\n• **Valeur** — Augmenter la valeur de revente\n• **Fonction** — Améliorer l'utilité\n• **Luminosité** — Plus de lumière naturelle",
      }]);
    }
  }, [authHeaders]);

  // Send a chat message in the guided flow
  const sendMessage = useCallback(async (input: string) => {
    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const allMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      allMessages.push({ role: "user", content: input });

      const resp = await fetch(RENO_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ messages: allMessages }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur" }));
        upsertAssistant(err.error || "Désolé, une erreur est survenue.");
        setIsStreaming(false);
        return;
      }

      if (!resp.body) {
        upsertAssistant("Désolé, je ne peux pas répondre pour le moment.");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check if Alex is ready to generate
      if (assistantSoFar.includes("[READY_TO_GENERATE]")) {
        const jsonMatch = assistantSoFar.match(/\[READY_TO_GENERATE\](.*)/s);
        if (jsonMatch) {
          try {
            const params = JSON.parse(jsonMatch[1].trim());
            // Remove the marker from displayed text
            const cleanText = assistantSoFar.replace(/\[READY_TO_GENERATE\].*$/s, "").trim();
            setMessages(prev =>
              prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanText } : m)
            );
            // Trigger generation
            await generateTransformation(params);
          } catch {
            // If JSON parse fails, just continue the conversation
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        upsertAssistant("Désolé, une erreur est survenue. Réessayez.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, authHeaders]);

  // Generate transformation images
  const generateTransformation = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);
    setStep("generating");

    setMessages(prev => [...prev, {
      role: "assistant",
      content: "✨ Je prépare vos concepts de transformation… Cela peut prendre quelques secondes.",
    }]);

    try {
      const resp = await fetch(RENO_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          action: "generate_transformation",
          imageBase64: photoBase64,
          generationParams: params,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur" }));
        setMessages(prev => [...prev, {
          role: "assistant",
          content: err.error || "Désolé, la génération a échoué. Réessayez.",
        }]);
        setStep("questions");
        setIsGenerating(false);
        return;
      }

      const data = await resp.json();
      const images = (data.images || []).filter((img: string) => img);
      const text = data.text || "";

      setTransformations(images);
      setStep("results");

      const CATEGORY_FR: Record<string, string> = {
        kitchen: "cuisine", bathroom: "salle de bain", basement: "sous-sol",
        "living room": "salon", bedroom: "chambre", facade: "façade",
        roof: "toiture", "paint colors": "peinture", backyard: "cour arrière",
        pool: "piscine", deck: "terrasse", landscaping: "aménagement paysager",
      };
      const catFr = CATEGORY_FR[params.category] || params.category;

      let resultMessage = `Voici votre concept de transformation pour votre ${catFr} !\n\n`;
      if (text) resultMessage += `${text}\n\n`;
      resultMessage += `**Budget estimé** : ${params.budget || "à évaluer"}\n`;
      resultMessage += `**Style** : ${params.style || "personnalisé"}\n\n`;
      resultMessage += `Si vous décidez d'aller de l'avant, je peux vous montrer des professionnels qui réalisent régulièrement ce type de projet dans votre secteur. Souhaitez-vous voir des entrepreneurs ?`;

      setMessages(prev => {
        // Remove the "generating" message
        const filtered = prev.filter(m => !m.content.includes("Je prépare vos concepts"));
        return [...filtered, { role: "assistant", content: resultMessage, images }];
      });

      // Persist the project to DB
      try {
        await fetch(RENO_URL, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            action: "save_project",
            projectData: {
              user_id: session?.user?.id || null,
              category: params.category,
              style: params.style,
              budget: params.budget,
              goal: params.goal,
              original_image_url: photoBase64,
              project_summary: text || `Transformation ${catFr} — ${params.style || "personnalisé"}`,
              concepts: images.map((img: string, i: number) => ({
                type: ["safe", "balanced", "premium"][i] || "balanced",
                image_url: img,
                title: i === 0 ? "Sobre & Réaliste" : i === 1 ? "Équilibré" : "Premium",
              })),
            },
          }),
        });
      } catch (saveErr) {
        console.error("Project save error:", saveErr);
      }
    } catch (err) {
      console.error("Generation error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Désolé, la génération a rencontré un problème. Voulez-vous réessayer ?",
      }]);
      setStep("questions");
    } finally {
      setIsGenerating(false);
    }
  }, [photoBase64, authHeaders]);

  const reset = useCallback(() => {
    setMessages([]);
    setStep("upload");
    setPhotoBase64(null);
    setRoomCategory(null);
    setTransformations([]);
    setIsGenerating(false);
  }, []);

  return {
    messages,
    isStreaming,
    step,
    photoBase64,
    roomCategory,
    transformations,
    isGenerating,
    uploadPhoto,
    sendMessage,
    generateTransformation,
    reset,
  };
};
