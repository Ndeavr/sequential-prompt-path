import { supabase } from '@/integrations/supabase/client';
import type { PublishedSlot } from './bookingSuggestions';

// Cache only published availability, never homeowner addresses or preferences.
export function bookingAvailabilityQuery(contractorId: string) {
  return {
    queryKey: ['booking-availability', contractorId, 'next-10-days'] as const,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false as const,
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<PublishedSlot[]> => {
      const now = Date.now();
      const { data: connections, error: connectionError } = await supabase
        .from('contractor_calendar_connections').select('access_status,last_synced_at')
        .eq('contractor_id', contractorId).eq('provider', 'google').abortSignal(signal);
      if (connectionError) throw new Error('La vérification de l’agenda est momentanément indisponible.');
      if (!connections?.some(c => c.access_status === 'connected' && c.last_synced_at && now - Date.parse(c.last_synced_at) < 5 * 60_000)) {
        throw new Error('Les disponibilités de cet entrepreneur ne sont pas encore synchronisées. Vous pouvez lui transmettre votre adresse et vos préférences pour convenir d’une heure.');
      }
      const { data, error } = await supabase.from('appointment_slots').select('id,starts_at,ends_at')
        .eq('contractor_id', contractorId).eq('status', 'available')
        .gte('starts_at', new Date(now).toISOString())
        .lt('starts_at', new Date(now + 10 * 86400000).toISOString())
        .order('starts_at').abortSignal(signal);
      if (error) throw new Error('Impossible de consulter les plages horaires. Veuillez réessayer.');
      return data ?? [];
    },
  };
}
