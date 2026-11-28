import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/stores/authSessionStore';
import { supabase } from '@/integrations/supabase/client';
import { saveReturnPath } from '@/lib/authReturn';

const RENO_ORIGIN = 'https://unpro-bubbles-lancement.roundlark4.chatgpt.site';
const RENO_URL = RENO_ORIGIN + '/reno-bulles.html';
export default function RenoBullesProfile() {
 const { session, loading } = useAuthSession();
 const navigate = useNavigate();
 const location = useLocation();
 const nonce = new URLSearchParams(location.search).get('request') ?? '';
 const valid = /^[a-f0-9-]{36}$/i.test(nonce);
 const [status,setStatus] = useState('');
 const [busy,setBusy] = useState(false);
 useEffect(() => {
  if (!valid || loading || session) return;
  const path=location.pathname+location.search;
  saveReturnPath(path,'manual');
  navigate('/login?returnTo='+encodeURIComponent(path),{replace:true});
 },[valid,loading,session,navigate,location.pathname,location.search]);
 async function shareProfile() {
  if(!session?.user || !valid || busy)return;
  if(!window.opener){setStatus('Retournez dans Réno-Bulles, puis touchez à nouveau « Connecter mon compte UNPRO ». Votre connexion UNPRO est prête.');return;}
  setBusy(true);setStatus('Chargement de votre profil…');
  try {
   const uid=session.user.id;
   const [profile,properties]=await Promise.all([
    supabase.from('profiles').select('full_name').eq('user_id',uid).maybeSingle(),
    supabase.from('properties').select('id,address,city,property_type').eq('user_id',uid).order('created_at',{ascending:false})
   ]);
   if(profile.error || properties.error)throw Error('load');
   // Minimal display snapshot only: no session, bearer, email, documents or roles.
   window.opener.postMessage({type:'unpro:profile',request:nonce,profile:{name:profile.data?.full_name || '',properties:properties.data || []}},RENO_ORIGIN);
   setStatus('Profil envoyé à Réno-Bulles. Vous pouvez fermer cette fenêtre.');
  }catch{setStatus('Votre profil est momentanément indisponible. Réessayez.');}
  finally{setBusy(false);}
 }
 return <main className="min-h-screen flex items-center justify-center p-6" style={{background:'#10171e',color:'#f7efe5'}}>
  <section className="w-full max-w-md rounded-3xl border p-7 space-y-5" style={{borderColor:'#aa7955',background:'#1e252c'}}>
   <p style={{color:'#e9b37d'}}>Réno-Bulles par UNPRO</p>
   <h1 className="text-3xl font-semibold">Un compte, vos propriétés.</h1>
   <p>Retrouvez votre profil UNPRO dans Réno-Bulles pour choisir la propriété où vous cherchez un entrepreneur.</p>
   {!valid ? <p role="alert">Ouvrez votre profil depuis Réno-Bulles pour continuer.</p> : loading || !session ? <p role="status">Connexion à votre compte UNPRO…</p> : <button type="button" onClick={shareProfile} disabled={busy} className="w-full rounded-xl p-4 font-semibold" style={{background:'#efb781',color:'#17191b'}}>{busy?'Chargement…':'Afficher mon profil dans Réno-Bulles'}</button>}
   <p role="status">{status}</p>
   <a className="block underline" href={RENO_URL}>Retour à Réno-Bulles</a>
   <a className="block underline" href="/dashboard/properties">Gérer mes propriétés dans UNPRO</a>
  </section>
 </main>;
}
