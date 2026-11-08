// @vitest-environment jsdom
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 'synthetic-owner' } }) }));
import { useCreateAppointment } from './useAppointments';
describe('appointment acknowledgement', () => {
  it('returns the saved request without waiting for a stalled notification', async () => {
    mocks.invoke.mockReturnValue(new Promise(() => {}));
    const invoke = mocks.invoke;
    Object.assign(mocks, { functions: { invoke } });
    mocks.from.mockImplementation((table: string) => {
      const response = table === 'appointments' ? { data: { id: 'synthetic-request' }, error: null } : { data: table === 'contractors' ? { city: 'Example' } : { id: 'synthetic-lead' }, error: null };
      const chain: any = { select: () => chain, eq: () => chain, insert: () => chain, maybeSingle: () => Promise.resolve(response), single: () => Promise.resolve(response) };
      return chain;
    });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useCreateAppointment(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    let saved: any;
    await act(async () => { saved = await result.current.mutateAsync({ contractor_id: 'synthetic-contractor' }); });
    expect(saved.id).toBe('synthetic-request');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
  });
});
