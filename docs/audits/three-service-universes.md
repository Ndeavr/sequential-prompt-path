# Trois univers de services — correctif local

## Parcours vérifiés

- `/` sert `PageHomeLight`; `/entrepreneurs` affiche bien la présentation `PageEntrepreneursLanding` dans le navigateur, malgré une déclaration de route historique en double laissée intacte.
- `/entrepreneurs/audit-ia` reste le parcours d’audit existant. Le bouton de présentation y conduit en conservant `ref=synthetic`.
- Trois portes pointent vers `/owner-universe?universe=professional|maintenance|renovation`, sans nouvelle route ni moteur. Les choix du menu existant ouvrent une demande dans Clara via `/alex?q=...`.
- Immobilier/services professionnels, entretien/services, rénovation/réparations sont visibles. « La fin des 3 soumissions » reste un angle spécifique de rénovation.
- Les suggestions Clara restent compactes : courtier, conduits, rénovation. La peinture est sélectionnable dans les services plutôt que d’ajouter une quatrième suggestion au premier écran.

## Fichiers concernés

- Accueil : `src/pages/PageHomeLight.tsx`, `src/components/home-light/{HeroHomeownerLight,ClaraConversationBox,HomeLightSections}.tsx`.
- Menus/services : `src/components/menu/ServiceUniverseLinks.tsx`, `src/components/navigation/{DrawerNavigationMobileIntent,MegaMenu}.tsx`, `src/data/menuTaxonomy.ts`, `src/pages/OwnerMenuPreviewPage.tsx`, `src/components/contractor/ServiceSelector.tsx`.
- Entreprises/audit : `src/pages/entrepreneur/{PageEntrepreneursLanding,PageAiRecommendationAudit}.tsx`, `src/components/entrepreneur-landing/v2/{HeroV2,StickyMobileCTAV2,SectionPainV2,SectionSolutionV2,SectionHowItWorksV2}.tsx`.
- Référencement : `index.html` et les métadonnées des pages ci-dessus.
- Vérifications : `src/test/{service-universes,home-matching-paths,home-glossy-contract}.test.tsx` (le contrat glossy conserve son extension `.test.ts`), `AGENTS.md`, `roadmap.md`.

## Résultats

- Vitest : **32 réussites, 0 échec**, cinq suites ciblées, incluant la conformité existante.
- Compilation automatique : dernier signal `build OK`; pas de compilation ni typecheck manuels relancés. Le contrôle TypeScript indépendant n’est pas attesté.
- Navigateur local 390 × 844, français : accueil, menu, présentation entreprises, audit et univers affichés; aucun débordement horizontal ni erreur JavaScript. Bouton audit cliqué : destination correcte, attribution conservée.
- L’accueil et la présentation entreprises affichent aussi leur nouveau titre en anglais. Le parcours d’audit et les sections secondaires existantes ne sont pas intégralement bilingues; aucune traduction générale n’est revendiquée.
- Les appels au backend ont été interceptés dans ces vérifications : pas de création de dossier client, activation ou paiement réel.

## Limites et protections

- Les catégories d’entretien reprennent les slugs de `LOCAL_SERVICE_CATEGORIES`; la sélection déclare un service, elle n’établit ni licence ni admissibilité.
- Lecture des catégories serveur existantes : professions et entretien déjà présents. Le gestionnaire immobilier n’a pas été confirmé dans les catégories serveur examinées : demande d’information seulement, aucune catégorie ni migration ajoutée.
- Peinture : service déclarable dans le sélecteur et demande Clara; aucun nouvel identifiant serveur créé.
- Le module réglementaire, les décisions serveur, paiements, droits, acquisition, automatisations, SMS, RLS et données clients sont inchangés.
- La présentation réutilise les textes canoniques de l’activation : 350 $ plus taxes applicables, profil et douze mois de Présence IA UNPRO; aucun rendez-vous promis par défaut.
- Aucun envoi, déploiement ou publication. Les nouveaux titres et descriptions ne seront visibles sur le site publié qu’après une publication séparément autorisée.

Skill ayant orienté les protections : **UNPRO Operating System**. Le travail reste limité aux surfaces publiques existantes; aucune infrastructure parallèle n’est créée.