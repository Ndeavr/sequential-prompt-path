import { describe, it, expect, vi, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
import { bookingAvailabilityQuery } from './bookingAvailability';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('availability preload', () => {
  it('shares the pending request and caches exactly ten days per contractor', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-11-08T12:00:00Z');
    vi.setSystemTime(now);
    let resolveSlots!: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveSlots = resolve; });
    const bounds: Record<string, string> = {};
    mocks.from.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain,
        gte: (_: string, v: string) => { bounds.start = v; return chain; },
        lt: (_: string, v: string) => { bounds.end = v; return chain; },
        abortSignal: () => table === 'contractor_calendar_connections' ? Promise.resolve({data:[{access_status:'connected',last_synced_at:now.toISOString()}]}) : pending,
      };
      return chain;
    });
    const client = new QueryClient();
    const options = bookingAvailabilityQuery('synthetic-contractor');
    const preload = client.fetchQuery(options);
    const check = client.fetchQuery(options);
    await Promise.resolve();
    resolveSlots({data:[],error:null});
    await Promise.all([preload,check]);
    await client.fetchQuery(options);
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(bounds).toEqual({start:now.toISOString(),end:'2026-11-18T12:00:00.000Z'});
    expect(bookingAvailabilityQuery('other').queryKey).not.toEqual(options.queryKey);
    client.clear();
  });
});
