import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock, uploadMock, signedMock, storageFromMock } = vi.hoisted(() => {
  const invokeMock = vi.fn();
  const uploadMock = vi.fn();
  const signedMock = vi.fn();
  const storageFromMock = vi.fn(() => ({
    upload: uploadMock,
    createSignedUrl: signedMock,
  }));
  return { invokeMock, uploadMock, signedMock, storageFromMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: invokeMock },
    storage: { from: storageFromMock },
  },
}));

import { uploadPaintingPhoto } from "@/features/paintingCalculator/services";

describe("painting guest upload authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads guest photos via the server rather than direct guest Storage access", async () => {
    const file = new File(["sample-image-bytes"], "test.png", { type: "image/png" });
    invokeMock.mockResolvedValue({
      data: { publicUrl: "https://example.test/signed", storagePath: "guest/opaque.png" },
      error: null,
    });
    await expect(uploadPaintingPhoto(file, "guest")).resolves.toEqual({
      publicUrl: "https://example.test/signed",
      storagePath: "guest/opaque.png",
    });
    expect(invokeMock).toHaveBeenCalledWith(
      "painting-guest-upload",
      expect.objectContaining({ body: expect.any(FormData) }),
    );
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("does not present success when the server rejects a guest upload", async () => {
    const file = new File(["sample-image-bytes"], "test.jpg", { type: "image/jpeg" });
    invokeMock.mockResolvedValue({ data: null, error: new Error("429") });
    await expect(uploadPaintingPhoto(file, "guest")).resolves.toBeNull();
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported formats and files over 5 MiB before any upload", async () => {
    const invalid = new File(["text"], "bad.svg", { type: "image/svg+xml" });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    await expect(uploadPaintingPhoto(invalid, "guest")).resolves.toBeNull();
    await expect(uploadPaintingPhoto(oversized, "guest")).resolves.toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("continues to use the existing owner-scoped Storage path for signed-in users", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "photo-uuid" });
    try {
      uploadMock.mockResolvedValue({ error: null });
      signedMock.mockResolvedValue({ data: { signedUrl: "https://example.test/owner" } });
      const file = new File(["sample-image-bytes"], "test.png", { type: "image/png" });
      await expect(uploadPaintingPhoto(file, "owner-uuid")).resolves.toEqual({
        publicUrl: "https://example.test/owner",
        storagePath: "owner-uuid/photo-uuid.png",
      });
      expect(storageFromMock).toHaveBeenCalledWith("painting-photos");
      expect(uploadMock).toHaveBeenCalledWith(
        "owner-uuid/photo-uuid.png",
        file,
        expect.objectContaining({ upsert: false, contentType: "image/png" }),
      );
      expect(invokeMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
