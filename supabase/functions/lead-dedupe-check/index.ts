// UNPRO — RETIRÉ. L'ancien contrôle (clé de service, sans session) divulguait les dossiers d'autres affiliés.
// Le dédoublonnage passe désormais par la fonction de base affiliate_stage_import (session + réponse générique).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({ error: 'retired', match: null }), {
    status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
