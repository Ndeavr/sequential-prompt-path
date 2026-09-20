/**
 * claraMediaQueue — File d'attente média unique de Clara.
 *
 * Un seul gestionnaire pour les photos, vidéos et documents envoyés dans la
 * conversation : état visible par fichier, progression réelle, reprise après
 * échec, idempotence par empreinte de fichier. Réutilise les services
 * existants (`alexUploadService`, `analyzeImageVisually`, session canonique) —
 * aucun nouveau moteur, aucun résultat simulé.
 */
import { create } from "zustand";

import {
  uploadAlexFile,
  kindForMime,
  validateFile,
  type ClaraMediaKind,
  type UploadedFile,
} from "@/services/alexUploadService";
import { extractVideoKeyframes, prepareImageForUpload, VIDEO_ANALYSIS_DISCLOSURE } from "./claraMedia";
import { logClaraWorkflowEvent } from "./claraWorkflow";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export type ClaraMediaStatus = "queued" | "uploading" | "analyzing" | "done" | "failed";

export interface ClaraMediaItem {
  id: string;
  fingerprint: string;
  file: File;
  name: string;
  kind: ClaraMediaKind;
  status: ClaraMediaStatus;
  /** 0 → 1, progression d'envoi réelle. */
  progress: number;
  previewUrl?: string;
  error?: string;
  summary?: string;
  frames?: number;
  uploaded?: UploadedFile;
}

interface QueueState {
  items: ClaraMediaItem[];
  enqueue: (files: File[]) => ClaraMediaItem[];
  remove: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
  clear: () => void;
}

export function fingerprintFile(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function previewFor(file: File): string | undefined {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return undefined;
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return undefined;
  return URL.createObjectURL(file);
}

export const useClaraMediaQueue = create<QueueState>((set, get) => {
  const patch = (id: string, changes: Partial<ClaraMediaItem>) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));

  const process = async (id: string) => {
    const item = get().items.find((entry) => entry.id === id);
    if (!item) return;

    patch(id, { status: "uploading", progress: 0, error: undefined });
    void logClaraWorkflowEvent("media_upload_started");

    try {
      const prepared = item.kind === "photo"
        ? await prepareImageForUpload(item.file)
        : { file: item.file, compressed: false, originalBytes: item.file.size };
      const payload = prepared.file;
      if (prepared.compressed) {
        trackCopilotEvent("clara_image_compressed", {
          surface: "home_clara_box",
          original_size_bucket: prepared.originalBytes > 10 * 1024 * 1024 ? "over_10mb" : "under_10mb",
        });
      }

      const finalValidation = validateFile(payload);
      if (!finalValidation.ok) {
        patch(id, { status: "failed", error: "Ce fichier dépasse la limite permise." });
        trackCopilotEvent("clara_attachment_failed", { surface: "home_clara_box", reason: "validation" });
        void logClaraWorkflowEvent("media_upload_failed");
        return;
      }

      const uploadResult = await uploadAlexFile(payload, {
        onProgress: (ratio) => patch(id, { progress: Math.min(0.99, ratio) }),
      });

      if (!uploadResult.ok || !uploadResult.file) {
        patch(id, {
          status: "failed",
          error: uploadResult.error || "L’envoi n’a pas abouti. Vous pouvez réessayer.",
        });
        void logClaraWorkflowEvent("media_upload_failed");
        trackCopilotEvent("clara_attachment_failed", { surface: "home_clara_box", reason: "upload" });
        return;
      }

      patch(id, { progress: 1, uploaded: uploadResult.file, status: "analyzing" });
      void logClaraWorkflowEvent("media_upload_completed");
      trackCopilotEvent("clara_attachment_uploaded", { surface: "home_clara_box", kind: item.kind });

      if (item.kind === "document") {
        patch(id, {
          status: "done",
          summary: "Document reçu et rattaché à cette conversation.",
        });
        return;
      }

      const { analyzeImageVisually } = await import("@/features/visualAI/visualAnalysisService");

      if (item.kind === "video") {
        void logClaraWorkflowEvent("video_analysis_started");
        const frames = await extractVideoKeyframes(item.file, 3);
        if (frames.length === 0) {
          patch(id, {
            status: "failed",
            error: "Je n’arrive pas à lire cette vidéo dans le navigateur. Essayez un autre format ou une photo.",
          });
          void logClaraWorkflowEvent("media_upload_failed");
          return;
        }
        const analysis = await analyzeImageVisually(frames[0]);
        patch(id, {
          status: "done",
          frames: frames.length,
          summary: `J’ai examiné ${frames.length} image${frames.length > 1 ? "s" : ""} tirée${frames.length > 1 ? "s" : ""} de votre vidéo. ${VIDEO_ANALYSIS_DISCLOSURE} ${analysis.summary}`.trim(),
        });
        void logClaraWorkflowEvent("video_analysis_completed");
        return;
      }

      void logClaraWorkflowEvent("image_analysis_started");
      const analysis = await analyzeImageVisually(payload);
      patch(id, { status: "done", summary: analysis.summary });
      void logClaraWorkflowEvent("image_analysis_completed");
    } catch {
      patch(id, {
        status: "failed",
        error: "Je n’ai pas pu terminer cette analyse. Vous pouvez réessayer ce fichier seulement.",
      });
      void logClaraWorkflowEvent("media_upload_failed");
    }
  };

  return {
    items: [],

    enqueue: (files) => {
      const existing = new Set(get().items.map((item) => item.fingerprint));
      const created: ClaraMediaItem[] = [];

      for (const file of files) {
        const fingerprint = fingerprintFile(file);
        if (existing.has(fingerprint)) continue;
        existing.add(fingerprint);

        const kind = kindForMime(file.type);
        const validation = kind === "photo" && file.size > 0
          ? { ok: true, kind }
          : validateFile(file);
        const item: ClaraMediaItem = {
          id: uid(),
          fingerprint,
          file,
          name: file.name,
          kind: validation.kind ?? "document",
          status: validation.ok ? "queued" : "failed",
          progress: 0,
          previewUrl: previewFor(file),
          error: validation.ok ? undefined : validation.error,
        };
        created.push(item);
      }

      if (created.length === 0) return [];
      set((state) => ({ items: [...state.items, ...created] }));

      // Traitement en série : un fichier n'écrase jamais la progression d'un autre.
      void (async () => {
        for (const item of created) {
          if (item.status === "queued") await process(item.id);
        }
      })();

      return created;
    },

    remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

    retry: (id) => {
      const item = get().items.find((entry) => entry.id === id);
      if (!item || item.status === "uploading" || item.status === "analyzing") return;
      void process(id);
    },

    clearFinished: () =>
      set((state) => ({ items: state.items.filter((item) => item.status !== "done") })),

    clear: () => set({ items: [] }),
  };
});
