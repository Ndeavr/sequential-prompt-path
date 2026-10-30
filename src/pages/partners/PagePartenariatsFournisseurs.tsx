import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowDown, Users, MessageCircle, CalendarCheck, PackageCheck, Loader2, CheckCircle2 } from 'lucide-react';
import UnproLogo from '@/components/brand/UnproLogo';
import LanguageToggle, { useLanguage } from '@/components/ui/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { validateSupplierForm, type SupplierForm } from '@/lib/supplierPartnershipForm';
import '../entrepreneur/thermopompes.css';

const EMPTY: SupplierForm = { company: '', first_name: '', last_name: '', email: '', org_type: '', network_size: '', message: '', privacy_consent: false };

export default function PagePartenariatsFournisseurs() {
  const { lang, setLang } = useLanguage();
  const fr = lang === 'fr';
  const t = (a: string, b: string) => (fr ? a : b);
  const reduce = useReducedMotion();
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [serverMsg, setServerMsg] = useState('');
  const [requestId, setRequestId] = useState('');
  const honey = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const consentText = t('J’accepte qu’UNPRO conserve ces informations pour répondre à ma demande de partenariat, conformément à la politique de confidentialité.', 'I agree that UNPRO may keep this information to respond to my partnership request, in accordance with the privacy policy.');

  const steps = [
    { icon: Users, title: t('Votre réseau d’entrepreneurs', 'Your contractor network') },
    { icon: MessageCircle, title: t('Chaque pro définit ses projets idéaux avec Clara', 'Each pro defines their ideal projects with Clara') },
    { icon: CalendarCheck, title: t('Projets et rendez-vous compatibles', 'Compatible projects and appointments'), note: t('selon disponibilité, qualifications et capacité', 'based on availability, qualifications and capacity') },
    { icon: PackageCheck, title: t('Plus de commandes potentielles chez vous', 'More potential orders with you') },
  ];
  const trades = fr ? ['Thermopompes', 'Toiture', 'Plomberie', 'Pavés', 'Fenêtres', 'Cuisines et salles de bain'] : ['Heat pumps', 'Roofing', 'Plumbing', 'Pavers', 'Windows', 'Kitchens and bathrooms'];
  const set = (k: keyof SupplierForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSupplierForm(form, lang);
    setErrors(errs);
    if (Object.keys(errs).length) { document.getElementById(`spf-${Object.keys(errs)[0]}`)?.focus(); return; }
    setState('loading'); setServerMsg('');
    const { data, error } = await supabase.functions.invoke('submit-supplier-partnership', {
      body: { ...form, network_size: form.network_size || null, message: form.message || null, consent_text: consentText, locale: lang, website: honey.current?.value ?? '', started_at: startedAt.current },
    });
    const id = (data as { ok?: boolean; id?: string } | null)?.id;
    if (error || !(data as { ok?: boolean })?.ok || !id) {
      setState('error');
      setServerMsg(t('La demande n’a pas pu être enregistrée. Rien n’a été envoyé. Réessayez dans un instant.', 'Your request could not be saved. Nothing was sent. Please try again shortly.'));
      return;
    }
    setRequestId(id); setState('done');
  };

  const field = (k: keyof SupplierForm, label: string, type = 'text', opt = false) => (
    <label htmlFor={`spf-${k}`} className="utp-sim-field">
      <strong>{label}{opt && <small> · {t('facultatif', 'optional')}</small>}</strong>
      <input id={`spf-${k}`} type={type} value={form[k] as string} onChange={e => set(k, e.target.value)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `spf-${k}-err` : undefined} autoComplete={type === 'email' ? 'email' : 'off'} />
      {errors[k] && <small id={`spf-${k}-err`} role="alert" className="spf-err">{errors[k]}</small>}
    </label>
  );

  return (
    <div className="utp">
      <Helmet>
        <html lang={fr ? 'fr-CA' : 'en-CA'} />
        <title>{t('Partenariats fournisseurs et manufacturiers | UNPRO', 'Supplier and manufacturer partnerships | UNPRO')}</title>
        <meta name="description" content={t('Manufacturiers, distributeurs et fournisseurs au Québec : aidez vos entrepreneurs à trouver les bons projets avec UNPRO. Plus de chantiers peuvent devenir plus de commandes.', 'Manufacturers, distributors and suppliers in Quebec: help your contractors find the right projects with UNPRO. More jobs can become more orders.')} />
        <link rel="canonical" href="https://unpro.ca/partenariats-fournisseurs" />
        <meta property="og:title" content={t('Vos entrepreneurs décrochent plus de contrats. Vous vendez plus de produits.', 'Your contractors win more jobs. You sell more products.')} />
        <meta property="og:url" content="https://unpro.ca/partenariats-fournisseurs" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'UNPRO', url: 'https://unpro.ca', areaServed: 'Québec' })}</script>
      </Helmet>
      <header className="utp-header"><Link to="/" aria-label="UNPRO"><UnproLogo size={120} tone="dark" /></Link><LanguageToggle lang={lang} onChange={setLang} /></header>
      <main>
        <section className="utp-wrap utp-section spf-hero">
          <div className="spf-badges"><span>{t('Manufacturiers • Distributeurs • Fournisseurs', 'Manufacturers • Distributors • Suppliers')}</span><span>Québec</span></div>
          <h1>{t('Vos entrepreneurs décrochent plus de contrats.', 'Your contractors win more jobs.')}<br /><span>{t('Vous vendez plus de produits.', 'You sell more products.')}</span></h1>
          <p className="utp-lead">{t('Vous fournissez les matériaux. UNPRO aide vos entrepreneurs à trouver les bons projets. Plus de chantiers peuvent devenir plus de commandes chez vous.', 'You supply the materials. UNPRO helps your contractors find the right projects. More jobs can become more orders with you.')}</p>
          <p className="utp-intro"><strong>{t('Ils vendent plus. Ils achètent plus chez vous. Vous encaissez.', 'They sell more. They buy more from you. You grow.')}</strong></p>
          <div className="utp-actions"><a className="utp-button" href="#partenariat">{t('Devenir partenaire de croissance', 'Become a growth partner')} <ArrowRight size={18} /></a><a className="utp-link" href="#fonctionnement">{t('Voir comment ça fonctionne', 'See how it works')} →</a></div>
        </section>

        <section id="fonctionnement" className="utp-wrap utp-section" aria-labelledby="spf-flow">
          <div className="utp-eyebrow">01 / {t('LE MÉCANISME', 'HOW IT WORKS')}</div>
          <h2 id="spf-flow">{t('Du réseau', 'From your network')}<br /><span>{t('à la commande.', 'to the order.')}</span></h2>
          <ol className="spf-flow">
            {steps.map((s, i) => (
              <motion.li key={i} initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : i * 0.18, ease: [0.22, 1, 0.36, 1] }}>
                <div className="spf-step"><s.icon size={26} aria-hidden="true" /><small>0{i + 1}</small><h3>{s.title}</h3>{s.note && <p>({s.note})</p>}</div>
                {i < steps.length - 1 && <span className={`spf-arrow${reduce ? '' : ' is-animated'}`} aria-hidden="true"><ArrowRight className="spf-arrow-h" size={22} /><ArrowDown className="spf-arrow-v" size={22} /></span>}
              </motion.li>
            ))}
          </ol>
          <p className="utp-fine">{t('Aucun rendez-vous garanti. Les projets dépendent de la demande réelle, des qualifications vérifiées et de la capacité de chaque entrepreneur.', 'No guaranteed appointments. Projects depend on real demand, verified qualifications and each contractor’s capacity.')}</p>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="spf-ex">
          <div className="utp-eyebrow">02 / {t('EXEMPLE PÉDAGOGIQUE', 'ILLUSTRATIVE EXAMPLE')}</div>
          <h2 id="spf-ex">{t('Un fournisseur de peinture', 'A paint supplier')}</h2>
          <p className="utp-intro">{t('Si 20 peintres de votre réseau décrochent plus de contrats, plus de peinture peut être achetée chez vous. Le même principe s’applique à :', 'If 20 painters in your network win more jobs, more paint may be bought from you. The same principle applies to:')}</p>
          <ul className="spf-chips">{trades.map(x => <li key={x}>{x}</li>)}</ul>
          <p className="utp-fine">{t('Exemple illustratif, pas un résultat réel ni une projection.', 'Illustrative example, not an actual result or projection.')}</p>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="spf-val">
          <div className="utp-eyebrow">03 / {t('PLUS INTELLIGENT QU’UNE RISTOURNE', 'SMARTER THAN A REBATE')}</div>
          <h2 id="spf-val">{t('Stimulez la demande', 'Drive demand')}<br /><span>{t('en aval.', 'downstream.')}</span></h2>
          <div className="utp-steps">
            {[[t('Fidéliser', 'Build loyalty'), t('Vos entrepreneurs associent leur croissance à votre marque.', 'Your contractors associate their growth with your brand.')],
              [t('Avantages pour votre réseau', 'Benefits for your network'), t('Un outil concret pour aider vos clients pros à trouver les bons projets.', 'A concrete tool to help your pro customers find the right projects.')],
              [t('Fournisseur partenaire de croissance', 'Growth-partner supplier'), t('Une image de partenaire qui fait avancer les entreprises, pas seulement un vendeur.', 'An image as a partner that moves businesses forward, not just a vendor.')]].map(([h, p], i) => <article key={i}><small>0{i + 1}</small><h3>{h}</h3><p>{p}</p></article>)}
          </div>
          <div className="spf-goal"><span className="utp-eyebrow">{t('EXEMPLE DE CHOIX D’OBJECTIF', 'EXAMPLE GOAL CHOICE')}</span><strong>{t('Objectif de croissance', 'Growth goal')} <span className="utp-amount">+30 %</span> ?</strong><p>{t('Un objectif à définir ensemble, pas un résultat garanti.', 'A goal to define together, not a guaranteed result.')}</p></div>
          <p className="utp-intro">{t('Une commission d’affiliation facultative peut s’appliquer aux paiements admissibles, selon le contrat et la configuration réelle de votre compte.', 'An optional affiliate commission may apply to eligible payments, according to the contract and your account’s actual configuration.')} <Link className="utp-link" to="/affilies">{t('Découvrir le programme affilié', 'Explore the affiliate program')} →</Link></p>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="spf-mod">
          <div className="utp-eyebrow">04 / {t('MODALITÉS', 'TERMS')}</div>
          <h2 id="spf-mod">{t('Simple, consentant,', 'Simple, consent-based,')}<br /><span>{t('vérifié.', 'verified.')}</span></h2>
          <ul className="spf-list">
            <li>{t('Vous invitez votre réseau d’entrepreneurs.', 'You invite your contractor network.')}</li>
            <li>{t('Chaque entrepreneur choisit individuellement de s’inscrire chez UNPRO.', 'Each contractor individually chooses to join UNPRO.')}</li>
            <li>{t('Clara guide chaque pro pour définir ses projets idéaux, son territoire et sa capacité.', 'Clara guides each pro to define ideal projects, service area and capacity.')}</li>
            <li>{t('Activation optionnelle par entrepreneur selon l’offre en vigueur : ', 'Optional activation per contractor under the current offer: ')}<span className="utp-amount">{t('350 $ + taxes', '$350 + tax')}</span>{t(', profil et 12 mois de présence IA sur UNPRO. Aucun volume de rendez-vous inclus sauf confirmation contractuelle.', ', profile and 12 months of AI presence on UNPRO. No appointment volume included unless contractually confirmed.')}</li>
            <li>{t('Les licences et qualifications requises sont vérifiées avant toute recommandation.', 'Required licences and qualifications are verified before any recommendation.')}</li>
            <li>{t('Un partenariat ne vaut pas une recommandation automatique des entrepreneurs ou des produits.', 'A partnership does not mean automatic endorsement of contractors or products.')}</li>
          </ul>
        </section>

        <section id="partenariat" className="utp-wrap utp-section" aria-labelledby="spf-form-title">
          <div className="utp-offer spf-form-wrap">
            <div><div className="utp-eyebrow">{t('PARTENARIAT B2B', 'B2B PARTNERSHIP')}</div><h2 id="spf-form-title">{t('Discutons d’un partenariat', 'Let’s discuss a partnership')}</h2><p>{t('Une personne de l’équipe UNPRO examine chaque demande. Aucun envoi automatique.', 'A member of the UNPRO team reviews every request. No automated messages.')}</p></div>
            {state === 'done' ? (
              <div role="status" className="spf-success" data-testid="spf-success"><CheckCircle2 size={28} aria-hidden="true" /><h3>{t('Demande enregistrée', 'Request saved')}</h3><p>{t('Référence', 'Reference')} : <code>{requestId.slice(0, 8).toUpperCase()}</code></p><p>{t('Nous vous répondrons par courriel.', 'We will reply by email.')}</p></div>
            ) : (
              <form onSubmit={submit} noValidate className="spf-form" aria-busy={state === 'loading'}>
                {field('company', t('Entreprise', 'Company'))}
                <div className="spf-row">{field('first_name', t('Prénom', 'First name'))}{field('last_name', t('Nom', 'Last name'))}</div>
                {field('email', t('Courriel professionnel', 'Work email'), 'email')}
                <label htmlFor="spf-org_type" className="utp-sim-field"><strong>{t('Type d’organisation', 'Organization type')}</strong>
                  <select id="spf-org_type" value={form.org_type} onChange={e => set('org_type', e.target.value)} aria-invalid={!!errors.org_type}>
                    <option value="">{t('Choisir…', 'Choose…')}</option>
                    <option value="manufacturer">{t('Manufacturier', 'Manufacturer')}</option><option value="distributor">{t('Distributeur', 'Distributor')}</option>
                    <option value="supplier">{t('Fournisseur', 'Supplier')}</option><option value="association">Association</option><option value="other">{t('Autre', 'Other')}</option>
                  </select>{errors.org_type && <small role="alert" className="spf-err">{errors.org_type}</small>}</label>
                <label htmlFor="spf-network_size" className="utp-sim-field"><strong>{t('Taille approximative du réseau', 'Approximate network size')} <small>· {t('facultatif', 'optional')}</small></strong>
                  <select id="spf-network_size" value={form.network_size} onChange={e => set('network_size', e.target.value)}><option value="">—</option><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="200+">200+</option></select></label>
                <label htmlFor="spf-message" className="utp-sim-field"><strong>Message <small>· {t('facultatif', 'optional')}</small></strong><textarea id="spf-message" rows={4} maxLength={2000} value={form.message} onChange={e => set('message', e.target.value)} /></label>
                <input ref={honey} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="spf-hp" />
                <label className="utp-sim-check"><input id="spf-privacy_consent" type="checkbox" checked={form.privacy_consent} onChange={e => set('privacy_consent', e.target.checked)} aria-invalid={!!errors.privacy_consent} /><span>{consentText} <Link className="underline" to="/confidentialite">{t('Politique de confidentialité', 'Privacy policy')}</Link></span></label>
                {errors.privacy_consent && <small role="alert" className="spf-err">{errors.privacy_consent}</small>}
                {state === 'error' && <p role="alert" className="spf-err" data-testid="spf-error">{serverMsg}</p>}
                <button type="submit" className="utp-button" disabled={state === 'loading'}>{state === 'loading' ? <><Loader2 className="animate-spin" size={18} /> {t('Envoi en cours…', 'Sending…')}</> : <>{t('Devenir partenaire de croissance', 'Become a growth partner')} <ArrowRight size={18} /></>}</button>
              </form>
            )}
          </div>
        </section>
      </main>
      <footer className="utp-wrap utp-footer"><span>UNPRO · Québec</span><Link to="/partenaires">{t('Partenaires certifiés', 'Certified partners')} ↗</Link></footer>
    </div>
  );
}
