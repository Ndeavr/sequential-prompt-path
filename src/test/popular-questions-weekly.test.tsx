import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePopularQuestions } from '@/hooks/usePopularQuestions';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
afterEach(() => vi.clearAllMocks());
describe('weekly Clara suggestions', () => {
  it('takes the first three ranked questions from the weekly endpoint', async () => {
    const items = Array.from({ length: 4 }, (_, i) => ({ label: `Question ${i}`, intent: 'repair', topic: 'toiture' }));
    invoke.mockResolvedValue({ data: { source: 'trending', items }, error: null });
    const { result } = renderHook(() => usePopularQuestions(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(invoke).toHaveBeenCalledWith('popular-questions', { body: { limit: 3 } });
    expect(result.current.source).toBe('trending');
    expect(result.current.items).toEqual(items.slice(0, 3));
  });
  it('does not claim weekly popularity on missing data or endpoint failure', async () => {
    invoke.mockResolvedValue({ data: { source: 'trending', items: [] }, error: null });
    const { result } = renderHook(() => usePopularQuestions(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.source).toBe('seasonal');
    invoke.mockResolvedValue({ error: new Error('offline') });
    await act(() => result.current.refresh());
    expect(result.current.source).toBe('seasonal');
  });
});
