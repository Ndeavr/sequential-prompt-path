/**
 * useDesignProject — Hook managing the UNPRO Design workspace state.
 * Handles project creation, AI generation, version management, and persistence.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DesignVersion } from "@/components/design/data";
import { parseDailyLimit, type DailyLimitPayload } from "@/lib/copy/usagePolicy";
import { prepareDesignPhoto } from "@/lib/design/photo";

const DESIGN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-generate`;

export function useDesignProject() {
  const { session } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string | null>(null);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageLimitHit, setUsageLimitHit] = useState<{ current: number; limit: number } | null>(null);
  const [dailyLimitHit, setDailyLimitHit] = useState<DailyLimitPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    }),
    [session]
  );

  const activeVersion = versions.find((v) => v.id === activeVersionId) || null;

  // ─── Upload + identify room ───
  const uploadPhoto = useCallback(
    async (file: File, selectedRoom?: string) => {
      const prepared = await prepareDesignPhoto(file);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Impossible de lire la photo."));
        reader.readAsDataURL(prepared);
      });

      setOriginalImage(base64);
      setError(null);

      // Identify room type
      if (!selectedRoom) {
        setIsIdentifying(true);
        try {
          const resp = await fetch(DESIGN_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action: "identify_room", imageBase64: base64 }),
          });
          if (resp.ok) {
            const data = await resp.json();
            setRoomType(data.room_type || "living_room");
          } else {
            setRoomType("living_room");
          }
        } catch {
          setRoomType("living_room");
        } finally {
          setIsIdentifying(false);
        }
      } else {
        setRoomType(selectedRoom);
      }

      // Create project in DB if authenticated
      if (session?.user?.id) {
        try {
          const resp = await fetch(DESIGN_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              action: "create_project",
              title: "Mon projet Design",
              roomType: selectedRoom || "living_room",
              originalImageBase64: base64,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            setProjectId(data.project?.id || null);
          }
        } catch (err) {
          console.error("Project creation failed:", err);
        }
      }
    },
    [session, authHeaders]
  );

  // ─── Generate 3 versions ───
  const generate = useCallback(
    async (
      prompt: string,
      options?: {
        style?: string;
        budget?: string;
        zones?: string[];
        sliders?: Record<string, number>;
        inspirationImages?: string[];
        materials?: string[];
        colorPalette?: string;
      }
    ) => {
      if (!originalImage || abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 135_000);
      setIsGenerating(true);
      setError(null);
      setDailyLimitHit(null);

      try {
        const resp = await fetch(DESIGN_URL, {
          method: "POST",
          headers: authHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            action: "generate",
            imageBase64: originalImage,
            prompt,
            style: options?.style,
            budget: options?.budget,
            zones: options?.zones,
            roomType,
            projectId,
            inspirationImages: options?.inspirationImages,
            materials: options?.materials,
            colorPalette: options?.colorPalette,
          }),
        });

        if (abortRef.current !== controller) return;
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Erreur" }));
          const daily = parseDailyLimit(err);
          if (daily) {
            // Politique d'utilisation raisonnable : rien n'est perdu, on revient demain.
            setDailyLimitHit(daily);
            return;
          }
          if (err.usage_limit) {
            setUsageLimitHit({ current: err.current_count, limit: err.limit });
            return;
          }
          setError(err.error || (resp.status === 429 ? "Le service est occupé. Réessayez dans un moment." : "La génération est momentanément indisponible. Réessayez."));
          return;
        }

        const data = await resp.json();
        if (abortRef.current !== controller) return;
        const newVersions: DesignVersion[] = (data.versions || []).map(
          (v: { id?: string; version_number?: string; imageUrl?: string; image_url?: string; style_label?: string; budget_mode?: string; created_at?: string }, i: number) => ({
            id: v.id || `gen-${Date.now()}-${i}`,
            versionNumber: v.version_number || `${versions.length + i + 1}`,
            imageUrl: v.imageUrl || v.image_url || null,
            promptUsed: prompt,
            frozen: false,
            styleLabel: options?.style || v.style_label || null,
            budgetMode: options?.budget || v.budget_mode || null,
            parentVersionId: activeVersionId,
            createdAt: v.created_at || new Date().toISOString(),
          })
        );

        if (newVersions.length > 0) {
          setVersions((prev) => [...prev, ...newVersions]);
          setActiveVersionId(newVersions[0].id);
        } else {
          setError("Aucune image générée. Réessayez.");
        }
      } catch (err) {
        if (abortRef.current === controller) {
          setError(controller.signal.aborted ? "La génération a pris trop de temps. Réessayez." : "Erreur de connexion. Réessayez.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsGenerating(false);
        }
      }
    },
    [originalImage, roomType, projectId, versions, activeVersionId, authHeaders]
  );

  // ─── Version management ───
  const freezeVersion = useCallback(
    (id: string) => {
      setVersions((prev) =>
        prev.map((v) => (v.id === id ? { ...v, frozen: true } : v))
      );
      // Persist to DB
      if (projectId) {
        supabase
          .from("design_versions")
          .update({ frozen: true })
          .eq("id", id)
          .then(() => {});
      }
    },
    [projectId]
  );

  const duplicateVersion = useCallback(
    (id: string) => {
      const source = versions.find((v) => v.id === id);
      if (!source) return;
      const subCount = versions.filter((v) => v.parentVersionId === id).length;
      const newVersion: DesignVersion = {
        id: `${id}-dup-${Date.now()}`,
        versionNumber: `${source.versionNumber}.${subCount + 1}`,
        imageUrl: source.imageUrl,
        promptUsed: source.promptUsed,
        frozen: false,
        styleLabel: source.styleLabel,
        budgetMode: source.budgetMode,
        parentVersionId: id,
        createdAt: new Date().toISOString(),
      };
      setVersions((prev) => [...prev, newVersion]);
      setActiveVersionId(newVersion.id);
    },
    [versions]
  );

  const selectVersion = useCallback((id: string) => {
    setActiveVersionId(id);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProjectId(null);
    setOriginalImage(null);
    setRoomType(null);
    setVersions([]);
    setActiveVersionId(null);
    setIsGenerating(false);
    setError(null);
  }, []);

  // ─── Share management ───
  const [shareToken, setShareToken] = useState<string | null>(null);

  const createShare = useCallback(
    async (privacyType: string): Promise<string | null> => {
      if (!projectId || !session?.access_token) return null;
      try {
        const resp = await fetch(DESIGN_URL, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ action: "create_share", projectId, privacyType }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const token = data.share?.share_token || null;
          setShareToken(token);
          return token;
        }
      } catch (err) {
        console.error("Share creation failed:", err);
      }
      return null;
    },
    [projectId, session, authHeaders]
  );

  const clearUsageLimit = useCallback(() => {
    setUsageLimitHit(null);
    setDailyLimitHit(null);
  }, []);

  return {
    // State
    projectId,
    originalImage,
    roomType,
    versions,
    activeVersion,
    activeVersionId,
    isGenerating,
    isIdentifying,
    error,
    shareToken,
    usageLimitHit,
    dailyLimitHit,
    // Actions
    uploadPhoto,
    generate,
    freezeVersion,
    duplicateVersion,
    selectVersion,
    setActiveVersionId,
    reset,
    createShare,
    clearUsageLimit,
  };
}
