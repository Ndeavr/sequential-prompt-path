import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GoldMembership } from './model';
// New schema is staged: keep generated types unchanged and fail closed until installed.
export function useGold(id?: string) {
  return useQuery({ queryKey: ['contractor-gold', id], enabled: Boolean(id), retry: false,
    queryFn: async (): Promise<GoldMembership | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('contractor_gold_memberships' as never)
        .select('contractor_id,member_number,status,joined_at,pioneer_2026').eq('contractor_id', id).maybeSingle();
      if (error) throw error;
      return data as GoldMembership | null;
    }, staleTime: 0,
  });
}
export function useGoldAvailability() {
  return useQuery({ queryKey: ['gold-availability'], retry: false, queryFn: async () => {
    const { data, error } = await supabase.rpc('gold_availability' as never);
    if (error) throw error;
    return data as { status: string; available: number | null; pioneer_status?: string; checkout_supported?: boolean; first_reserved?: boolean; pioneer_available?: number | null; pioneer_next_number?: number | null; pioneer_sales?: number | null };
  }});
}
export function useGoldAudit(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['gold-audit', id], enabled: enabled && Boolean(id), retry: false, queryFn: async () => {
    if (!id) return [];
    const { data, error } = await supabase.from('contractor_gold_events' as never).select('status,created_at').eq('contractor_id', id).order('created_at');
    if (error) throw error;
    return data as Array<{ status: string; created_at: string }>;
  }});
}
