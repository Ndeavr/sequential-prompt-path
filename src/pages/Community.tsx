import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight, MessageCircle, Users, Sparkles } from 'lucide-react';
import UnproLogo from '@/components/brand/UnproLogo';
import LanguageToggle, { useLanguage } from '@/components/ui/LanguageToggle';
import './community.css';

export const COMMUNITY_GROUP_URL = 'https://www.facebook.com/groups/1438169678285827';

export default function Community() {
  const { lang, setLang } = useLanguage();
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;
  const join = t('Rejoindre le groupe privé', 'Join the private group');
  const topics = [
    { icon: Users, title: t('Des pros qui parlent votre langue.', 'Pros who speak your language.'), text: t('Rénovation, construction, entretien, services : échangez avec des entrepreneurs qui comprennent votre réalité.', 'Renovation, construction, maintenance, services: connect with business owners who understand your day-to-day reality.') },
    { icon: MessageCircle, title: t('Ce qui fonctionne, sur le terrain.', 'What works in the field.'), text: t('Marketing, qualification des demandes, suivis de soumissions, collaborations : partagez vos méthodes et posez vos questions.', 'Marketing, qualifying inquiries, following up on quotes and collaborating: share your methods and ask your questions.') },
    { icon: Sparkles, title: t('Une voix dans l’avenir d’UNPRO.', 'A voice in UNPRO’s future.'), text: t('Une idée, une friction, un besoin mal compris? Vos commentaires nous aideront à améliorer UNPRO et les réponses de Clara.', 'An idea, a frustrating step or a misunderstood need? Your feedback will help us improve UNPRO and Clara’s responses.') },
  ];
  const faq = [
    [t('Faut-il être abonné à UNPRO?', 'Do I need a paid UNPRO subscription?'), t('Non. Le groupe est gratuit et ouvert aux entrepreneurs intéressés, sous réserve d’approbation par les administrateurs. Les services payants UNPRO sont distincts.', 'No. The group is free for interested contractors, subject to administrator approval. Paid UNPRO services are separate.')],
    [t('Qui peut voir mes publications?', 'Who can see my posts?'), t('Le groupe est privé : seuls ses membres peuvent voir les publications et les membres. Le groupe reste visible dans la recherche Facebook. Ne publiez pas de renseignements personnels sur vos clients.', 'The group is private: only members can see posts and other members. It remains discoverable in Facebook search. Do not post personal information about your customers.')],
    [t('Clara lit-elle automatiquement le groupe?', 'Does Clara automatically read the group?'), t('Non. Aucun accès automatique de Clara aux échanges Facebook n’est annoncé ici. L’équipe examinera les retours et pourra intégrer les enseignements retenus, sans renseignements personnels, aux améliorations de Clara et d’UNPRO.', 'No. We are not announcing automatic access to Facebook discussions for Clara. The team will review feedback and may incorporate selected learnings, without personal information, into improvements to Clara and UNPRO.')],
    [t('Le groupe donne-t-il accès à des rendez-vous?', 'Does joining give me appointments?'), t('L’adhésion au groupe ne garantit ni contrat ni rendez-vous et ne constitue pas une vérification professionnelle. Les conditions des services UNPRO sont présentées séparément avant tout engagement.', 'Group membership does not guarantee contracts or appointments and is not professional verification. UNPRO service terms are presented separately before any commitment.')],
  ];
  return <div className="community-page alex-immersive" lang={lang === 'fr' ? 'fr-CA' : 'en-CA'}>
    <Helmet>
      <title>{t('La communauté des entrepreneurs | UNPRO', 'The contractor community | UNPRO')}</title>
      <meta name="description" content={t('Rejoignez le groupe Facebook privé UNPRO : entraide, marketing, échanges entre entrepreneurs et suggestions pour améliorer Clara.', 'Join UNPRO’s private Facebook group: peer support, marketing, contractor discussions and feedback to improve Clara.')} />
      <link rel="canonical" href="https://unpro.ca/communaute" />
      <meta property="og:title" content={t('Le terrain a son mot à dire. | UNPRO', 'Your experience matters. | UNPRO')} />
      <meta property="og:image" content="https://unpro.ca/images/community/unpro-contractors.jpg" />
      <meta property="og:url" content="https://unpro.ca/communaute" />
      <meta property="og:type" content="website" />
    </Helmet>
    <header className="community-nav community-wrap">
      <Link to="/" aria-label={t('Accueil UNPRO', 'UNPRO home')}><UnproLogo size={132} tone="dark" /></Link>
      <div><a href="#clara">{t('Votre impact', 'Your impact')}</a><LanguageToggle lang={lang} onChange={setLang} /></div>
    </header>
    <main>
      <section className="community-hero community-wrap">
        <div className="community-eyebrow">{t('LA COMMUNAUTÉ UNPRO · QUÉBEC', 'THE UNPRO COMMUNITY · QUEBEC')}</div>
        <h1>{t('Le terrain a', 'Your experience')}<br /><span>{t('son mot à dire.', 'matters.')}</span></h1>
        <p className="community-intro">{t('Entre entrepreneurs, on se comprend. Retrouvez-nous dans le groupe privé pour échanger, partager ce qui fonctionne et bâtir la suite d’UNPRO ensemble.', 'Business owners understand each other. Join our private group to connect, share what works and build the next chapter of UNPRO together.')}</p>
        <a className="community-cta" href={COMMUNITY_GROUP_URL} target="_blank" rel="noopener noreferrer">{join}<ArrowUpRight aria-hidden="true" size={20} /></a>
        <p className="community-note">{t('Gratuit · Sur Facebook · Admission par les administrateurs', 'Free · On Facebook · Administrator approval')}</p>
        <figure className="community-scene"><img src="/images/community/unpro-contractors.jpg" width="1774" height="887" fetchPriority="high" alt={t('Illustration de marque UNPRO : entrepreneurs, véhicules et vêtements sur un chantier résidentiel.', 'UNPRO brand illustration: contractors, vehicles and workwear at a residential job site.')} /><figcaption>{t('Des métiers différents. Une même envie d’avancer.', 'Different trades. A shared drive to move forward.')}</figcaption></figure>
      </section>
      <section className="community-wrap community-topics" aria-label={t('Dans le groupe', 'Inside the group')}>
        {topics.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" size={27} /><h2>{title}</h2><p>{text}</p></article>)}
      </section>
      <section id="clara" className="community-impact community-wrap">
        <div><div className="community-eyebrow">{t('VOTRE EXPÉRIENCE → NOS AMÉLIORATIONS', 'YOUR EXPERIENCE → OUR IMPROVEMENTS')}</div><h2>{t('Vous nous dites.', 'You tell us.')}<br /><span>{t('Clara s’améliore.', 'Clara improves.')}</span></h2><p>{t('Vous connaissez les nuances de votre métier. Aidez-nous à mieux les comprendre : les travaux que vous acceptez, les questions importantes, les rendez-vous utiles et les étapes à simplifier.', 'You know the nuances of your trade. Help us understand them: the jobs you accept, the questions that matter, useful appointments and steps we can simplify.')}</p></div>
        <ol>{[
          [t('Vous partagez votre retour', 'You share your feedback'), t('Décrivez un besoin, une idée ou un problème, sans données de clients.', 'Describe a need, idea or problem without customer data.')],
          [t('L’équipe analyse et priorise', 'The team reviews and prioritizes'), t('Nous distinguons les suggestions, les faits à vérifier et les améliorations utiles.', 'We distinguish suggestions, facts to verify and useful improvements.')],
          [t('Les retours retenus guident Clara', 'Selected feedback guides Clara'), t('Ils serviront à améliorer ses réponses, ses questions et l’expérience UNPRO, après validation.', 'After validation, they will help improve her answers, questions and the UNPRO experience.')],
        ].map(([title, text], i) => <li key={title}><span className="community-number">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </section>
      <section className="community-prompt community-wrap"><div className="community-eyebrow">{t('POUR LANCER LA CONVERSATION', 'START THE CONVERSATION')}</div><h2>{t('Quel type de mandat aimeriez-vous recevoir plus souvent?', 'What kind of job would you like more often?')}</h2><p>{t('Présentez votre spécialité, votre territoire et ce qui fait un bon projet pour votre entreprise. C’est un excellent premier message.', 'Introduce your specialty, service area and what makes a project a good fit for your business. It’s a great first post.')}</p><a className="community-cta" href={COMMUNITY_GROUP_URL} target="_blank" rel="noopener noreferrer">{join}<ArrowUpRight aria-hidden="true" size={20} /></a></section>
      <section className="community-faq community-wrap"><h2>{t('Avant de nous rejoindre', 'Before you join')}</h2>{faq.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}<p className="community-note">{t('Respect, entraide et transparence. Pas de démarchage privé non sollicité ni de partage de données clients.', 'Respect, peer support and transparency. No unsolicited private sales messages or sharing of customer data.')}</p></section>
    </main>
    <footer className="community-bottom community-wrap"><Link to="/">UNPRO © {new Date().getFullYear()}</Link><span>{t('Fait au Québec, Canada.', 'Made in Quebec, Canada.')}</span><Link to="/entrepreneurs">{t('Découvrir UNPRO pour mon entreprise', 'Explore UNPRO for my business')} →</Link></footer>
  </div>;
}
