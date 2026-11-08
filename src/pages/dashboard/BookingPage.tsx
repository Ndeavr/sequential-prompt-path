import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProperties } from '@/hooks/useProperties';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { usePublicContractorProfile } from '@/hooks/usePublicContractors';
import { ISR_DRAFT_KEY, parseIsrDraft } from '@/lib/isrCampaign';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchAppointmentTypes, type AppointmentType } from '@/services/bookingSlotEngine';
import { localDate, selectSuggestions, type BookingPeriod, type DayPreference, type PublishedSlot } from '@/lib/bookingSuggestions';

const inputClass = 'w-full min-h-12 rounded-xl border border-input bg-background px-3 py-2';
const periods: [BookingPeriod,string][] = [['this_week','Cette semaine'],['next_week','La semaine prochaine'],['flexible','Dès que possible']];
const formatSlot = (iso:string) => new Date(iso).toLocaleString('fr-CA',{timeZone:'America/Toronto',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});

export default function BookingPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: contractor, isLoading } = usePublicContractorProfile(id);
  const { data: properties = [] } = useProperties();
  const create = useCreateAppointment();
  const isISR = contractor?.slug === 'isolation-solution-royal';
  const [types,setTypes] = useState<AppointmentType[]>([]);
  const [typeId,setTypeId] = useState('');
  const [typesLoading,setTypesLoading] = useState(true);
  const [savedAddresses,setSavedAddresses] = useState<{id:string;full_address:string;city:string}[]>([]);
  const [addressKey,setAddressKey] = useState('');
  const [address,setAddress] = useState('');
  const [city,setCity] = useState('');
  const [period,setPeriod] = useState<BookingPeriod>('flexible');
  const [time,setTime] = useState<DayPreference>('flexible');
  const [notes,setNotes] = useState('');
  const [checked,setChecked] = useState(false);
  const [checking,setChecking] = useState(false);
  const [message,setMessage] = useState('');
  const [slots,setSlots] = useState<PublishedSlot[]>([]);
  const [selected,setSelected] = useState<PublishedSlot|null>(null);
  const [sent,setSent] = useState(false);
  const generation = useRef(0);
  const type = types.find(t=>t.id===typeId);
  const duration = type?.duration_minutes ?? (isISR ? 60 : 0);
  const title = type?.title ?? (isISR ? 'Inspection gratuite' : 'Rendez-vous');
  const addressOptions = [
    ...properties.map(p=>({key:`property:${p.id}`,address:p.address,city:p.city||''})),
    ...savedAddresses.filter(a=>!properties.some(p=>p.address===a.full_address)).map(a=>({key:`address:${a.id}`,address:a.full_address,city:a.city})),
  ];
  useEffect(()=>{
    let live=true;
    setTypesLoading(true);
    fetchAppointmentTypes(id).then(rows=>{ if(live){setTypes(rows);setTypeId(rows.length===1?rows[0].id:'');} }).catch(()=>{if(live)setMessage('Les types de rendez-vous ne peuvent pas être chargés. Réessayez.');}).finally(()=>{if(live)setTypesLoading(false);});
    return ()=>{live=false;};
  },[id]);
  useEffect(()=>{
    if(!isISR)return;
    try {
      const draft=parseIsrDraft(sessionStorage.getItem(ISR_DRAFT_KEY));
      if(!draft)return;
      if(draft.answers.address && draft.answers.city){setAddressKey('manual');setAddress(draft.answers.address);setCity(draft.answers.city);}
      if(['morning','afternoon','evening','flexible'].includes(draft.answers.availability??''))setTime(draft.answers.availability as DayPreference);
    }catch{/* Storage may be disabled. */}
  },[isISR]);
  useEffect(()=>{
    if(!user)return;
    let live=true;
    supabase.from('homeowner_addresses').select('id, full_address, city').eq('homeowner_id',user.id).then(({data})=>{if(live)setSavedAddresses(data??[]);});
    return ()=>{live=false;};
  },[user?.id]);
  useEffect(()=>{generation.current++;setChecked(false);setChecking(false);setSlots([]);setSelected(null);setMessage('');},[address,city,typeId,period,time]);
  useEffect(()=>()=>{generation.current++;},[]);
  async function check() {
    if(!address.trim()||!city.trim())return;
    const request=++generation.current;
    setChecking(true);setChecked(false);setMessage('');setSlots([]);setSelected(null);
    try {
      if(!duration)throw new Error('Les types et durées de rendez-vous doivent être renseignés par cet entrepreneur.');
      const {data:connections,error:connectionError}=await supabase.from('contractor_calendar_connections').select('access_status,last_synced_at').eq('contractor_id',id).eq('provider','google');
      if(connectionError)throw new Error('La vérification de l’agenda est momentanément indisponible.');
      if(!connections?.some(c=>c.access_status==='connected' && c.last_synced_at && Date.now()-Date.parse(c.last_synced_at)<5*60_000))throw new Error('Les disponibilités de cet entrepreneur ne sont pas encore synchronisées. Vous pouvez lui transmettre votre adresse et vos préférences pour convenir d’une heure.');
      const {data,error}=await supabase.from('appointment_slots').select('id,starts_at,ends_at').eq('contractor_id',id).eq('status','available').gte('starts_at',new Date().toISOString()).lt('starts_at',new Date(Date.now()+21*86400000).toISOString()).order('starts_at');
      if(error)throw new Error('Impossible de consulter les plages horaires. Veuillez réessayer.');
      if(request!==generation.current)return;
      const proposals=selectSuggestions(data??[],period,time,duration);
      setSlots(proposals);
      setMessage(proposals.length ? 'Plages publiées par l’entrepreneur. L’heure et le déplacement à votre adresse restent à confirmer.' : 'Aucune plage publiée ne correspond à cette période. Essayez la semaine prochaine ou une autre plage horaire.');
    }catch(e){if(request===generation.current)setMessage(e instanceof Error?e.message:'Impossible de vérifier les disponibilités.');}
    finally{if(request===generation.current){setChecking(false);setChecked(true);}}
  }
  async function submit() {
    if(!checked||!address.trim()||!city.trim()||create.isPending)return;
    setMessage('');
    try {
      if(selected){
        const {data,error}=await supabase.from('appointment_slots').select('id').eq('id',selected.id).eq('contractor_id',id).eq('status','available').maybeSingle();
        if(error||!data){setSelected(null);setChecked(false);throw new Error('Cette plage doit être revérifiée. Cliquez sur Vérifier les disponibilités.');}
      }
      await create.mutateAsync({contractor_id:id,property_id:addressKey.startsWith('property:')?addressKey.slice(9):undefined,preferred_date:selected?localDate(selected.starts_at):undefined,preferred_time_window:time,project_category:type?.category||(isISR?'isolation':'inspection'),timeline:period,contact_preference:'email',notes:[`Type de rendez-vous : ${title}`,`Adresse de l’intervention : ${address.trim()}, ${city.trim()}`,`Période : ${periods.find(p=>p[0]===period)?.[1]}`,selected?`Plage demandée (à confirmer) : ${formatSlot(selected.starts_at)}`:'Heure à convenir',notes].filter(Boolean).join('\n')});
      setSent(true);
    }catch(e){setMessage(e instanceof Error?e.message:'La demande n’a pas été enregistrée. Réessayez.');}
  }
  if(sent)return <DashboardLayout><div className="mx-auto max-w-xl space-y-4 p-4"><h1 className="text-2xl font-bold">Votre demande est enregistrée</h1><p>{title} — {address}, {city}.</p><p>L’heure du rendez-vous reste à confirmer par l’entrepreneur.</p><Button asChild><Link to="/dashboard/appointments">Voir mes demandes</Link></Button></div></DashboardLayout>;
  return <DashboardLayout><div className="mx-auto w-full max-w-2xl space-y-6 pb-28">
    <header><Link to={`/contractors/${id}`} className="text-sm underline">← Retour</Link><h1 className="mt-4 text-2xl font-bold">Planifier un rendez-vous</h1><p className="text-muted-foreground">{isLoading?'Chargement…':contractor?.business_name}</p></header>
    <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
      <div className="space-y-2"><Label htmlFor="appointment-type">Type de rendez-vous</Label>{types.length ? <select id="appointment-type" className={inputClass} value={typeId} onChange={e=>setTypeId(e.target.value)}><option value="" disabled>Choisir un rendez-vous</option>{types.map(t=><option key={t.id} value={t.id}>{t.title} · {t.duration_minutes} min{t.is_free?' · Gratuit':''}</option>)}</select> : <p id="appointment-type" className="font-semibold">{typesLoading?'Chargement…':isISR?'Inspection gratuite · 60 minutes':'Types de rendez-vous non renseignés'}</p>}{type&&!type.is_free&&<p className="text-sm">Tarif et modalités à confirmer avec l’entrepreneur.</p>}</div>
      <div className="space-y-2"><Label htmlFor="visit-address">À quelle adresse?</Label><select id="visit-address" className={inputClass} value={addressKey} onChange={e=>{const value=e.target.value;setAddressKey(value);const a=addressOptions.find(a=>a.key===value);setAddress(a?.address??'');setCity(a?.city??'');}}><option value="" disabled>Choisir l’adresse de l’intervention</option>{addressOptions.map(a=><option key={a.key} value={a.key}>{a.address}{a.city?`, ${a.city}`:''}</option>)}<option value="manual">Une autre adresse</option></select></div>
      {addressKey&&<div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="street">Adresse complète</Label><Input id="street" autoComplete="street-address" value={address} onChange={e=>{setAddressKey('manual');setAddress(e.target.value);}} placeholder="Numéro et rue"/></div><div><Label htmlFor="city">Ville</Label><Input id="city" autoComplete="address-level2" value={city} onChange={e=>{setAddressKey('manual');setCity(e.target.value);}}/></div></div>}
      <fieldset disabled={!address.trim()||!city.trim()} className="space-y-3 disabled:opacity-50"><legend className="mb-3 font-medium">Quand êtes-vous disponible?</legend><div className="flex flex-wrap gap-2">{periods.map(([value,label])=><Button key={value} type="button" variant={period===value?'default':'outline'} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{label}</Button>)}</div><Label htmlFor="day-time">Moment de la journée</Label><select id="day-time" className={inputClass} value={time} onChange={e=>setTime(e.target.value as DayPreference)}><option value="flexible">Flexible</option><option value="morning">Matin</option><option value="afternoon">Après-midi</option><option value="evening">Soirée</option></select></fieldset>
      <Button className="w-full" disabled={checking||typesLoading||!contractor||!address.trim()||!city.trim()||(!type&&types.length>0)} onClick={check}>{checking?'Vérification des disponibilités…':'Vérifier les disponibilités'}</Button>
      <div aria-live="polite">{message&&<p className="text-sm">{message}</p>}</div>
      {!!slots.length&&<div className="grid gap-3">{slots.map(s=><button type="button" key={s.id} aria-pressed={selected?.id===s.id} onClick={()=>setSelected(s)} className={`min-h-16 rounded-xl border p-4 text-left ${selected?.id===s.id?'border-primary bg-primary/10 ring-2 ring-primary':'border-border'}`}><span className="block font-semibold capitalize">{formatSlot(s.starts_at)}</span><span className="text-sm">{duration} minutes · Heure du Québec</span></button>)}</div>}
      {checked&&<div className="space-y-4"><Label htmlFor="booking-notes">Un détail à ajouter? (facultatif)</Label><Textarea id="booking-notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Accès à l’entretoit, problème observé…"/><Button className="w-full" disabled={create.isPending||(slots.length>0&&!selected)} onClick={submit}>{create.isPending?'Enregistrement…':selected?'Demander ce créneau':'Transmettre mes disponibilités'}</Button></div>}
    </section>
  </div></DashboardLayout>;
}
