
## Objectif

Sur `/` et `/index` (PageHomeUnicorn), remplacer **uniquement** la section explicative statique "Comment fonctionne UNPRO" (`HowItWorksCards`, lignes 495–547) par une animation interactive `ContractorBookingDemo` qui montre concrètement : Alex analyse → recommande Isolation Solution Royal → l'utilisateur choisit un créneau → rendez‑vous confirmé.

Aucune autre section n'est modifiée (hero, Alex orb, capabilities strip, AiInputCard, `SectionAIHomeIntelligence`, quick actions, social proof, live stats, Passeport intro, Contractor split, EntityDefinition, footer restent intacts). Header flottant, bottom dock et `SmartHeader` non touchés.

## Section remplacée

Dans `src/pages/PageHomeUnicorn.tsx` :

```text
<HowItWorksCards />        ← retirée (la fonction locale est supprimée)
<ContractorBookingDemo />  ← insérée exactement au même emplacement (ligne 755)
```

Le lien "Voir en détail" vers `/comment-ca-marche` disparaît avec la section (jamais visité depuis l'accueil selon l'usage constaté).

## Nouveau composant

Fichier : `src/components/home-unicorn/ContractorBookingDemo.tsx`
Exporté via un default export, importé dans `PageHomeUnicorn.tsx`.

### Structure

- **En‑tête de section** (aligné sur le style `unicorn-theme`, cartes `uc-glass-strong`, accent `#2563FF`) :
  - Eyebrow : `UNE RECOMMANDATION. UN RENDEZ‑VOUS.`
  - Titre h2 : `Trouvez le bon professionnel et réservez directement.`
  - Sous‑titre : `Alex analyse votre besoin, vous recommande un entrepreneur compatible et vous présente ses disponibilités réelles.`
- **Mise en page** :
  - Mobile (par défaut, viewport cible 384 px) : ordre titre → animation → CTA → 3 bénéfices.
  - Desktop (`md:` breakpoint) : grille 2 colonnes — gauche titre + 3 bénéfices + CTA, droite animation dans un cadre vertical premium `uc-glass-strong` arrondi 28 px.
- **3 bénéfices** (icônes `lucide-react` : `Sparkles`, `CalendarClock`, `CheckCircle2`) :
  - Une recommandation compatible
  - Des disponibilités visibles
  - Un rendez‑vous confirmé
- **CTA principal** : `Trouver mon professionnel` → appelle `useAlexVoice().openAlex("home_intent", "booking_demo_cta")`. Aucune navigation dure, aucune redirection.
- **CTA secondaire** : `Revoir la démonstration` → réinitialise la machine d'état.

### Machine d'état

```ts
type DemoStep = "analyzing" | "recommendation" | "availability" | "booking" | "confirmed";

const DEMO_TIMINGS: Record<DemoStep, number> = {
  analyzing: 1500,
  recommendation: 2500,
  availability: 2200,
  booking: 900,
  confirmed: 2500,
};

const RESTART_PAUSE_MS = 2000;
```

Transitions séquentielles gérées par `setTimeout` chaînés dans un `useEffect`. Après `confirmed`, pause 2 s puis retour à `analyzing`. Tous les timers sont nettoyés au démontage et à l'arrêt.

### Contrôle et performance

- `IntersectionObserver` sur le conteneur racine : lorsque `isIntersecting === false`, on `clearTimeout` et on met en pause ; à la revenue on relance sur l'étape courante.
- `useReducedMotion()` de framer‑motion (déjà présent) : si l'utilisateur préfère `reduce`, on affiche directement l'état `confirmed` (résultat final visible) sans boucle ni transitions.
- Sélection manuelle : dans l'étape `availability`, l'utilisateur peut cliquer sur n'importe quel créneau ; cela court‑circuite le timer et déclenche `booking → confirmed`.
- Aucune vidéo, aucune image lourde, aucune dépendance ajoutée (framer‑motion et lucide‑react sont déjà installés).

### Étape 1 — `analyzing` (1,5 s)

Bulle Alex glassmorphism : `Vous souhaitez améliorer l'isolation de votre entretoit à Terrebonne.`
Liste animée de 4 checks (apparition en cascade 250 ms) :
- Analyse du projet
- Vérification de la région
- Compatibilité du service
- Disponibilités

Aucun pourcentage. Petits points animés `motion.span` pour l'attente.

### Étape 2 — `recommendation` (2,5 s)

Message Alex : `Pour l'isolation de votre entretoit, je vous propose Isolation Solution Royal.`

Fiche entrepreneur (composant local `ContractorBookingCard`) :
- Logo : rendu via `MonogramBadge` (`src/features/contractorProfile/logo/MonogramBadge.tsx`, déjà présent) initiales **ISR** sur dégradé bleu — aucun fichier logo dédié n'existe dans `src/assets/`, donc on utilise le monogramme premium plutôt qu'un placeholder ; libellé "Isolation Solution Royal" sous le monogramme.
- Nom : `Isolation Solution Royal` (source : `ISR_BRAND.company` depuis `src/config/isrDemoConfig.ts`).
- Catégorie : `Isolation d'entretoit`.
- Territoire : `Terrebonne et Rive-Nord`.
- Statut : badge `Entreprise vérifiée` (icône `ShieldCheck`).
- Badge compatibilité : `Compatible avec votre projet` (accent vert).
- Aucune note Google et aucun nombre d'avis affichés (règle "no fake data" — respecte `contractor-identity-resolution`).
- Question sous la fiche : `Voulez-vous planifier un rendez-vous maintenant?`
- Bouton primaire (démo, ne quitte pas l'animation) : `Voir les disponibilités`.

### Étape 3 — `availability` (2,2 s)

La fiche `translate-y` légèrement, puis un mini‑calendrier apparaît (variants framer‑motion).

- Titre : `Choisissez votre plage horaire`
- 3 chips date (données démo statiques) : `Mardi 14`, `Mercredi 15`, `Jeudi 16` (mois neutre affiché "juillet" pour cohérence avec l'étape 4).
- 4 créneaux : `9 h`, `10 h`, `13 h`, `15 h`.
- À ~1,4 s la sélection auto‑simulée : `Mercredi 15 — 10 h` devient active (bg bleu solide).
- Ensuite passage à `booking`.
- L'utilisateur peut cliquer manuellement sur n'importe quel créneau → force `booking` immédiatement avec le créneau choisi.

### Étape 4 — `booking` (0,9 s)

- Message : `Réservation en cours…`
- Barre de progression animée (largeur 0 → 100 % en 0,9 s), pas de spinner externe.

### Étape 5 — `confirmed` (2,5 s)

Carte de confirmation glass, crochet vert animé (SVG `CheckCircle2` de lucide + `motion.svg` scale/rotate) :

- Titre : `C'est fait!`
- Message : `Votre rendez-vous avec Isolation Solution Royal est confirmé.`
- Détails :
  - `Mercredi 15 juillet`
  - `10 h`
  - `Terrebonne`
  - `Confirmation envoyée par SMS.`
- Message d'Alex : `Vous n'avez pas eu à comparer trois entrepreneurs. Alex a trouvé un professionnel compatible et réservé votre rendez-vous.`

Après `RESTART_PAUSE_MS`, retour à `analyzing` (sauf si `prefers-reduced-motion`, où l'on reste sur `confirmed`).

## Données & sécurité

- Toutes les données (créneaux, entrepreneur, ville, date) sont des constantes locales dans `ContractorBookingDemo.tsx`, marquées `const DEMO_*` avec commentaire `// Demo-only: never persisted, never triggers real booking or SMS.`.
- **Aucun** appel Supabase, **aucune** insertion dans `appointments`, `availability_slots` ou toute table liée à ISR.
- **Aucun** appel edge function, aucune analytics de conversion ne se déclenche automatiquement (seulement un `trackCopilotEvent("booking_demo_cta_click")` sur le CTA principal si utile, sinon rien).
- Le CTA principal ouvre l'assistant Alex existant via `useAlexVoice().openAlex`, en préservant la route courante (comportement natif du hook, aucun `navigate` ajouté).

## Localisation

Toute la copie est en français (fr‑CA) et vit directement dans le composant, conformément au style des sections voisines de PageHomeUnicorn (qui ne consomment pas i18n). Une TODO de traduction EN est ajoutée en tête de fichier pour être prise en charge lorsque le reste de la page Unicorn passera à i18n — pas de string EN inventée dans ce PR pour éviter le drift.

## Fichiers touchés

1. **Nouveau** — `src/components/home-unicorn/ContractorBookingDemo.tsx` (~ 350 lignes, composant + sous‑composants locaux `AlexBubble`, `ContractorBookingCard`, `SlotPicker`, `ConfirmationCard`).
2. **Modifié** — `src/pages/PageHomeUnicorn.tsx` :
   - Import : `import ContractorBookingDemo from "@/components/home-unicorn/ContractorBookingDemo";`
   - Ligne 755 : remplacer `<HowItWorksCards />` par `<ContractorBookingDemo />`.
   - Supprimer la fonction `HowItWorksCards` (lignes 495–547) et l'import inutilisé `ArrowRight` s'il ne sert plus ailleurs dans le fichier (vérification `rg` après édition).

Aucun autre fichier n'est modifié.

## Critères de vérification

- `rg -n "HowItWorksCards" src/` → aucun résultat.
- Chargement de `/` sur viewport 384×706 : hero et Passeport Maison intacts, la section anciennement statique est remplacée par l'animation ; ordre visuel titre → animation → CTA → bénéfices.
- Sur desktop (≥ 768 px) : layout 2 colonnes, animation à droite dans un cadre premium.
- L'animation cycle une fois, se met en pause quand on scrolle hors écran, se relance au retour.
- Clic manuel sur un créneau → l'animation saute à `booking` puis `confirmed` avec le créneau choisi.
- CTA `Trouver mon professionnel` ouvre le shell Alex (aucune nouvelle route).
- CTA `Revoir la démonstration` réinitialise l'état à `analyzing` sans reload.
- Avec `prefers-reduced-motion: reduce` : état `confirmed` affiché sans boucle.
- Aucun enregistrement en base, aucun SMS, aucun rendez‑vous créé (revue manuelle : le composant ne référence pas `supabase`).
