# Étape « Vos services » — tri par glisser-déposer

Refonte de la première étape du profil de compatibilité entrepreneur (page existante, aucune nouvelle route). Les trois boutons répétés sur chaque carte disparaissent au profit de trois colonnes réordonnables.

## Problème constaté

La page affiche aujourd'hui, pour toute entreprise, la liste Excavation / Fondations / Réparation de fissures : l'écran est codé en dur sur le pack excavation et n'utilise ni le métier réel de l'entreprise ni ses services détectés. Une entreprise d'isolation voit donc des services hors contexte.

Par ailleurs, les services réellement détectés sont rares en base aujourd'hui (4 entreprises avec services, 1 avec capacités). L'écran doit donc être honnête quand il n'y a rien à proposer.

## Ce qui sera construit

**1. Bon métier, bons services**

L'écran résout le pack de services à partir du profil de compatibilité existant et du métier de l'entreprise (isolation, excavation, etc.). Aucune liste générique hors contexte.

**2. Préremplissage à partir de données réelles uniquement**

À l'ouverture, les services déjà connus de l'entreprise sont chargés depuis ses propres données : services de la fiche UNPRO, capacités confirmées, services du profil d'analyse (site Web / Google) et préférences déjà déclarées. Chaque puce porte un badge discret de provenance : Site Web, Google, Déclaré, Vérifié.

Placement initial :
- service principal et ses sous-services cohérents → Prioritaire;
- services connexes prouvés → Accepté;
- Non recherché reste vide tant que l'entrepreneur n'y glisse rien.

Si rien n'est détecté : colonnes vides, message explicite « Aucun service détecté pour votre entreprise », et ajout manuel immédiat. Aucun service inventé.

**3. Trois colonnes, glisser-déposer**

- Prioritaire — « Les travaux que vous voulez recevoir en premier »
- Accepté — « Les travaux que vous faites, sans être votre priorité »
- Non recherché — « Les travaux que vous ne voulez pas recevoir »

Puces compactes déplaçables à la souris et au doigt : appui long court, déplacement fluide, puce soulevée avec ombre, emplacement d'accueil visible, légère vibration si l'appareil la supporte. Réordonnancement à l'intérieur d'une colonne également. Alternative clavier pour l'accessibilité.

**4. Ajout rapide**

Sous chaque colonne, un champ « Ajouter un service… » : autocomplétion limitée aux services liés au métier détecté, valeur personnalisée acceptée, Entrée ajoute et garde le focus, doublons ignorés (accents et casse neutralisés). Une valeur personnalisée est enregistrée comme déclarée et marquée en attente de révision.

**5. Sauvegarde et matching**

Chaque déplacement et chaque ajout est sauvegardé immédiatement (affichage optimiste, retour en arrière et message clair en cas d'échec) avec entreprise, service, préférence, provenance, ordre dans la colonne, horodatage et journal d'audit.

Côté recommandations : Prioritaire donne un bonus, Accepté reste admissible sans bonus, Non recherché exclut strictement. Ce comportement sera vérifié dans le moteur existant et corrigé seulement s'il ne respecte pas déjà la règle.

## Détails techniques

- Front : `src/pages/pro/PageContractorCompatibility.tsx` (étape 1 uniquement) + nouveau composant `src/components/contractor-compatibility/ServiceTriageBoard.tsx`; pack résolu par `getCompatPack` (`src/config/compatibilityPacks.ts`) au lieu de `COMPAT_SERVICES` codé en dur.
- Glisser-déposer : ajout de `@dnd-kit/core` + `@dnd-kit/sortable` (capteurs pointer + touch avec délai d'activation, annonces ARIA, `prefers-reduced-motion`).
- Détection : nouveau hook lecture seule `useDetectedContractorServices` lisant `contractor_services`, `contractor_capabilities`, `aipp_profile_services`, `ai_entity_services` et `contractor_service_preferences` pour l'entreprise de l'utilisateur, avec normalisation en slug et dédoublonnage par provenance prioritaire (verified > google > website > declared).
- État : extension de `CompatibilityAnswers.services` avec `order`, `source`, `label`, `pending_review` dans `useContractorCompatibility` + `supabase/functions/_shared/contractorCompatibility.ts` (sanitisation et `materialize`).
- Migration : ajout de `sort_order int not null default 0`, `pending_review boolean not null default false` et conservation de `source` sur `contractor_service_preferences`; aucune table nouvelle.
- Fonction déployée : `contractor-compatibility-save` uniquement (le diff d'audit existant couvre déjà le journal).
- Tests : tests unitaires sur la normalisation/dédoublonnage et le placement initial, test de non-régression « pack isolation n'affiche jamais Excavation », vérification Playwright 390 px et 1280 px (déplacement souris + tactile), puis typecheck, lint critique et build.

## Hors périmètre

Aucun changement aux autres étapes du questionnaire, à l'authentification, aux paiements, aux envois SMS/courriel, ni aux données existantes des entreprises.
