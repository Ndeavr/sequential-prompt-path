# Catégories, sous-catégories et plan personnalisé — réparation transversale

## Ce que l'inspection montre aujourd'hui

- Une taxonomie canonique existe déjà en base : `service_categories` (15 métiers principaux, 17 sous-services, libellés FR/EN, mots-clés de détection, ordre d'affichage, actif/inactif). Elle est sous-utilisée : l'isolation n'a que 3 sous-services, loin de la liste demandée.
- L'écran « Quelle est votre entreprise ? » (`/entrepreneur/devis-personnalise`) affiche un menu natif codé en dur de 8 métiers : Plomberie, Électricité, Toiture, Rénovation, Peinture, CVAC, Aménagement paysager, Autre. Aucun lien avec le métier détecté.
- L'étape « Vos services » du profil de compatibilité ne connaît que deux familles codées en dur (excavation et isolation). Une entreprise de peinture reçoit donc la liste excavation.
- Sur la page des plans propriétaires, la carte « Vous êtes entrepreneur ? » pointe vers une ancienne adresse de grille, sans objectif ni conservation du contexte d'attribution.
- Les préférences de services sont déjà stockées avec provenance, ordre et « en attente de révision », et le moteur de recommandations lit déjà des règles dérivées : cette plomberie reste inchangée.

Aucune nouvelle architecture : on étend `service_categories` et les flux existants.

## Phase 1 — Une seule taxonomie, vraiment complète

1. Compléter `service_categories` par migration idempotente : sous-services manquants pour chaque métier principal, en commençant par Isolation (entretoit/combles, murs, sous-sol/fondation, uréthane giclé, cellulose soufflée, laine soufflée, scellage d'air, pare-vapeur, ventilation d'entretoit, retrait d'isolant/vermiculite, décontamination moisissure, décontamination excréments), puis Peinture, Toiture, Plomberie, Électricité, Décontamination.
2. Ajouter à chaque entrée les synonymes de détection (nom d'entreprise, site Web, Google, RBQ) et l'ordre d'affichage. Rien n'est supprimé ni renommé : les anciens identifiants restent valides.
3. Mapper les services déjà enregistrés des entreprises vers les identifiants canoniques. Toute valeur non reconnue est conservée telle quelle, marquée « Déclaré / à revoir », et consignée pour revue admin — aucune perte.
4. Un seul module front lit cette taxonomie (métier principal → ses sous-services). Les listes codées en dur des écrans sont supprimées.

## Phase 2 — Écran « Quelle est votre entreprise ? »

- Le métier principal est détecté à partir de l'entreprise réelle et affiché avec son niveau de confiance : Vérifié, Déclaré, Inféré ou « détecté — à confirmer ». Exemple : « Isolation Demrik Inc. » → Isolation.
- Il reste modifiable par recherche : le menu natif blanc est remplacé par une feuille modale UNPRO avec champ de recherche, groupes et descriptions, lisible sur mobile.
- Les autres métiers principaux ne sont jamais présentés comme sous-catégories.
- Une entreprise généraliste peut retenir plusieurs métiers, mais un seul est marqué « activité prioritaire ».
- Préremplissage à partir des données réellement détectées : métier, services, villes desservies, licences, avec la source affichée sur chaque élément. Rien d'inventé.

## Phase 3 — Organisation des services

- Le tri à trois zones existant (Prioritaires, Acceptés, Non recherchés, plus la zone « À classer ») est alimenté par la taxonomie filtrée sur le métier principal retenu.
- Glisser-déposer souris et tactile, retrait, recherche, ajout personnalisé validé par Entrée (enregistré « Déclaré », en attente de révision).
- Les suggestions connexes sont limitées aux services compatibles avec le métier (isolation → ventilation, scellage d'air, pare-vapeur, retrait d'isolant). Jamais plomberie/électricité/toiture pour une entreprise d'isolation, sauf preuve au profil.
- Changement de métier principal : une confirmation explicite est demandée avant de déplacer ou retirer les services devenus incompatibles.
- État vide utile : « Aucun service détecté — ajoutez ceux que vous voulez recevoir. » États de chargement, d'erreur et reprise de session conservés.

## Phase 4 — Routage et CTA

- La carte « Vous êtes entrepreneur ? » de la page propriétaires mène au parcours entrepreneur (audit puis plan personnalisé), en conservant jeton de prospect, affiliation et retour au parcours en cours.
- Libellé principal normalisé partout : « Découvrez votre plan personnalisé », sous-texte « Selon votre métier, vos services, votre territoire et votre capacité. »
- Il poursuit la session existante au lieu d'en ouvrir une seconde : aucune donnée déjà saisie n'est perdue.
- Les CTA propriétaires restent dans le parcours propriétaire.

## Phase 5 — Surfaces consommatrices

Même source canonique pour : audit IA, onboarding entrepreneur, profil et édition de profil, plan personnalisé, recommandation de clients, filtres admin, cartes de conversion, pages d'activation issues d'un prospect ou d'un affilié.

## Sécurité et journalisation

Migration idempotente, aucune suppression de préférence. Règles d'accès inchangées : seul le propriétaire de l'entreprise et les rôles admin autorisés modifient les services. Chaque changement journalise ancienne valeur, nouvelle valeur, source, utilisateur ou session et date.

## Détails techniques

- Données : extension de `public.service_categories` (parent/enfant, `ai_keywords`, `sort_order`, `is_active`) — pas de nouvelles tables `trade_*`. Table de correspondance legacy → canonique et journal des valeurs non mappées.
- Front : nouveau hook `useTradeTaxonomy` (métiers racines + sous-services par parent, recherche accent-insensible) ; suppression de `TRADES` dans `PageContractorPricingIntake.tsx` ; `src/config/compatibilityPacks.ts` résout désormais le pack depuis la taxonomie, les fichiers excavation/isolation servant uniquement de questions conditionnelles.
- Composant partagé `TradePickerSheet` (feuille modale, recherche, groupes) réutilisé par l'intake, l'onboarding et l'édition de profil.
- `ServiceTriageBoard` reçoit ses suggestions du hook de taxonomie ; persistance inchangée dans `contractor_service_preferences` (slug, préférence, source, ordre, en attente de révision).
- Fonctions déployées : `matching-profile`, `contractor-compatibility-save`, `contractor-compatibility-finalize` uniquement.
- Tests : isolation sans catégorie étrangère, peinture limitée à la peinture, généraliste avec priorité obligatoire, confirmation au changement de métier, carte entrepreneur routée correctement, conservation du contexte au CTA plan personnalisé ; vérification mobile 390 px et bureau, plus types, lint et compilation.

## Hors périmètre

Moteur de recommandation, tarifs, paiements, envois SMS/courriel, nouvelles routes.
