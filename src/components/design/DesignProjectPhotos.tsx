import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Photo { role: 'before' | 'after'; label: string; url: string }
interface DesignPhotosResponse { ok: boolean; images?: Photo[]; shared?: boolean }

/** The server authorizes each signed photo; only the owner can select a recipient. */
export default function DesignProjectPhotos({ matchId, allowSelection = false, contractorName }: { matchId: string; allowSelection?: boolean; contractorName?: string }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const { data, refetch, isError } = useQuery({
    queryKey: ['design-project-photos', matchId, allowSelection],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<DesignPhotosResponse>('create-project-unified', { body: { action: 'get_design_photos', match_id: matchId } });
      if (error || !data?.ok) throw new Error('photos_unavailable');
      return data;
    },
    retry: false,
    staleTime: 120000,
    refetchInterval: 240000,
  });
  async function share() {
    setSharing(true); setError('');
    try {
      const { data, error } = await supabase.functions.invoke<DesignPhotosResponse>('create-project-unified', { body: { action: 'share_design', match_id: matchId } });
      if (error || !data?.ok || !data.shared) throw new Error('share_failed');
      await refetch();
    } catch { setError('Les photos n’ont pas pu être transmises. Réessayez.'); }
    finally { setSharing(false); }
  }
  if (!data?.images?.length) return allowSelection && isError ? <p role="alert" className="text-sm">Impossible de charger les photos. <button onClick={() => void refetch()} className="underline">Réessayer</button></p> : null;
  return <section aria-label="Photos avant et après" className="space-y-3">
    <div className="grid grid-cols-2 gap-3">{data.images.map(photo => <figure key={photo.role}><img src={photo.url} alt={photo.label} className="w-full rounded-xl object-contain max-h-64" /><figcaption className="mt-1 text-sm">{photo.label}</figcaption></figure>)}</div>
    {allowSelection && (data.shared ? <p role="status" className="text-sm text-emerald-400">Vos photos avant/après sont transmises à {contractorName ?? 'cet entrepreneur'}.</p> : <div className="space-y-2"><p className="text-sm">Partagez votre espace actuel et le concept souhaité uniquement avec {contractorName ?? 'cet entrepreneur'}.</p><Button onClick={() => void share()} disabled={sharing}>{sharing ? 'Transmission…' : 'Choisir cet entrepreneur et transmettre mon avant/après'}</Button></div>)}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
}
