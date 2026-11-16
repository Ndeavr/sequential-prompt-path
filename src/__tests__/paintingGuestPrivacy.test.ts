// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage } }));
import { uploadPaintingPhoto } from '@/features/paintingCalculator/services';
import { saveSession, loadSession } from '@/features/paintingCalculator/session';
import type { CalculatorSessionData } from '@/features/paintingCalculator/types';
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
it('analyzes selected guest bytes without uploading or signing Storage objects', async () => {
  const result = await uploadPaintingPhoto(new File(['photo'], 'photo.png', { type: 'image/png' }), 'guest');
  expect(result?.publicUrl).toBe('data:image/png;base64,cGhvdG8=');
  expect(result?.storagePath).toBeUndefined();
  expect(storage.from).not.toHaveBeenCalled();
});
it('rejects unsupported or oversized input before touching Storage', async () => {
  expect(await uploadPaintingPhoto(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), 'guest')).toBeNull();
  expect(await uploadPaintingPhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' }), 'guest')).toBeNull();
  expect(storage.from).not.toHaveBeenCalled();
});
it('preserves authenticated upload and limits new signed URLs to one hour', async () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.test/signed' } });
  storage.from.mockReturnValue({ upload, createSignedUrl });
  const result = await uploadPaintingPhoto(new File(['photo'], 'photo.png', { type: 'image/png' }), 'owner-a');
  expect(result?.storagePath).toMatch(/^owner-a\//);
  expect(createSignedUrl).toHaveBeenCalledWith(result?.storagePath, 3600);
});
it('does not persist guest image bytes or temporary previews in session storage', () => {
  saveSession({ photos: [{ url: 'data:image/png;base64,cGhvdG8=' }, { url: 'blob:temporary' }], step: 2 } as CalculatorSessionData);
  expect(loadSession()?.photos).toEqual([]);
  expect(loadSession()?.step).toBe(2);
});
