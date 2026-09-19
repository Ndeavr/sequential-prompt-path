/**
 * Phase 2 — file d'attente média de Clara.
 * Vérifie la validation réelle, l'idempotence, la progression et la reprise.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/clara/claraWorkflow", () => ({
  logClaraWorkflowEvent: vi.fn(),
}));

const uploadAlexFile = vi.fn();

vi.mock("@/services/alexUploadService", async () => {
  const actual = await vi.importActual<typeof import("@/services/alexUploadService")>(
    "@/services/alexUploadService",
  );
  return { ...actual, uploadAlexFile: (...args: unknown[]) => uploadAlexFile(...args) };
});

const analyzeImageVisually = vi.fn();
vi.mock("@/features/visualAI/visualAnalysisService", () => ({
  analyzeImageVisually: (...args: unknown[]) => analyzeImageVisually(...args),
}));

vi.mock("@/services/clara/claraMedia", () => ({
  VIDEO_ANALYSIS_DISCLOSURE: "Je n’analyse pas le son.",
  MAX_VIDEO_KEYFRAMES: 5,
  compressImageFile: async (file: File) => file,
  extractVideoKeyframes: async () => [new File(["x"], "image-1.jpg", { type: "image/jpeg" })],
}));

import { fingerprintFile, useClaraMediaQueue } from "@/services/clara/claraMediaQueue";
import { kindForMime, validateFile } from "@/services/alexUploadService";

function imageFile(name = "photo.jpg", size = 1024): File {
  const file = new File([new Uint8Array(size)], name, { type: "image/jpeg" });
  return file;
}

async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Clara media queue", () => {
  beforeEach(() => {
    useClaraMediaQueue.getState().clear();
    uploadAlexFile.mockReset();
    analyzeImageVisually.mockReset();
  });

  it("accepte photo, vidéo et document, refuse le reste", () => {
    expect(kindForMime("image/png")).toBe("photo");
    expect(kindForMime("video/mp4")).toBe("video");
    expect(kindForMime("application/pdf")).toBe("document");
    expect(kindForMime("application/zip")).toBeNull();
  });

  it("refuse une vidéo au-delà de la limite affichée", () => {
    const big = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 200 * 1024 * 1024 });
    const result = validateFile(big);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("trop volumineux");
  });

  it("ne met jamais deux fois le même fichier dans la file", () => {
    uploadAlexFile.mockResolvedValue({ ok: true, file: { id: "1" } });
    analyzeImageVisually.mockResolvedValue({ summary: "ok" });
    const file = imageFile();
    useClaraMediaQueue.getState().enqueue([file]);
    useClaraMediaQueue.getState().enqueue([file]);
    expect(useClaraMediaQueue.getState().items).toHaveLength(1);
    expect(fingerprintFile(file)).toContain("photo.jpg");
  });

  it("publie une progression réelle puis le résumé de l'analyse", async () => {
    uploadAlexFile.mockImplementation(async (_file: File, options: { onProgress?: (r: number) => void }) => {
      options?.onProgress?.(0.5);
      return { ok: true, file: { id: "u1", kind: "photo" } };
    });
    analyzeImageVisually.mockResolvedValue({ summary: "Traces compatibles avec de l’humidité." });

    useClaraMediaQueue.getState().enqueue([imageFile()]);
    await settle();

    const item = useClaraMediaQueue.getState().items[0];
    expect(item.status).toBe("done");
    expect(item.progress).toBe(1);
    expect(item.summary).toContain("humidité");
  });

  it("échoue proprement et permet de réessayer ce fichier seulement", async () => {
    uploadAlexFile.mockResolvedValueOnce({ ok: false, error: "réseau" });
    useClaraMediaQueue.getState().enqueue([imageFile("mur.jpg")]);
    await settle();

    let item = useClaraMediaQueue.getState().items[0];
    expect(item.status).toBe("failed");

    uploadAlexFile.mockResolvedValue({ ok: true, file: { id: "u2", kind: "photo" } });
    analyzeImageVisually.mockResolvedValue({ summary: "Fissure superficielle observée." });
    useClaraMediaQueue.getState().retry(item.id);
    await settle();

    item = useClaraMediaQueue.getState().items[0];
    expect(item.status).toBe("done");
    expect(useClaraMediaQueue.getState().items).toHaveLength(1);
  });

  it("annonce honnêtement que la vidéo est analysée par images", async () => {
    uploadAlexFile.mockResolvedValue({ ok: true, file: { id: "v1", kind: "video" } });
    analyzeImageVisually.mockResolvedValue({ summary: "Zone humide visible au plafond." });

    const video = new File([new Uint8Array(2048)], "degat.mp4", { type: "video/mp4" });
    useClaraMediaQueue.getState().enqueue([video]);
    await settle();

    const item = useClaraMediaQueue.getState().items[0];
    expect(item.status).toBe("done");
    expect(item.summary).toContain("image");
    expect(item.summary).toContain("Je n’analyse pas le son.");
  });
});
