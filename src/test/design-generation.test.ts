import { describe, expect, it, vi } from 'vitest';
import { generateDesignVariations, isDesignImage, readDesignBody, MAX_DESIGN_REQUEST_BYTES } from '../../supabase/functions/_shared/designGeneration';

describe('Design generation memory boundaries', () => {
  it('runs one provider request at a time and preserves successful variants', async () => {
    let active = 0; let max = 0;
    const call = vi.fn(async (variation: number) => {
      active++; max = Math.max(max, active);
      await Promise.resolve(); active--;
      if (variation === 2) throw new Error('provider unavailable');
      return { variation, imageUrl: 'data:image/png;base64,AAAA' };
    });
    expect((await generateDesignVariations(call)).map(x => x.variation)).toEqual([1, 3]);
    expect(max).toBe(1); expect(call).toHaveBeenCalledTimes(3);
  });
  it('rejects oversized and remote image inputs', () => {
    expect(isDesignImage('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isDesignImage('https://example.com/private.jpg')).toBe(false);
    expect(isDesignImage('data:image/jpeg;base64,' + 'A'.repeat(1_400_000))).toBe(false);
  });
  it('bounds the request stream before parsing JSON', async () => {
    const request = new Request('https://example.com', { method: 'POST', body: JSON.stringify({ action: 'generate' }) });
    expect(await readDesignBody(request)).toEqual({ action: 'generate' });
    const cancel = vi.fn();
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_DESIGN_REQUEST_BYTES + 1)); }, cancel });
    await expect(readDesignBody(new Request('https://example.com', { method: 'POST', body: stream, duplex: 'half' } as RequestInit))).rejects.toThrow('image_too_large');
    expect(cancel).toHaveBeenCalled();
  });
});
