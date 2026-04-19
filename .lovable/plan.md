
## Mission
Réduire UNPRO à un produit ultra-simple, conversion-first, façon Stripe+Uber+ChatGPT. Tout le reste reste en backburner (admin-only, non supprimé).

## Principe directeur
**Cacher, pas casser.** Toutes les routes existantes restent fonctionnelles. On enlève juste les liens publics + on ajoute une "navigation publique simplifiée" qui devient la seule porte d'entrée pour les visiteurs non-loggés.

## Audit rapide à confirmer
- `SmartHeader` / `SmartFooter` / `MobileBottomNav` → contiennent les ~30+ liens à élaguer
- `Home.tsx` → à remplacer par `PageHomeRevenueFocused` (10 sections actuelles → 1 hero + 1 trust strip)
- Routes existantes proches : `/alex` (existe) → on crée alias `/alex-match` qui pointe sur expérience match dédiée
- `/join`, `/import-business`, `/plans`, `/checkout`, `/coverage` → à mapper sur l'existant ou créer

## Plan de livraison (6 lots, ce soir)

### Lot 1 — Navigation publique simplifiée
**Nouveau composant : `PublicHeaderMinimal`**
- Logo UNPRO à gauche
- 3 liens : "Trouver un entrepreneur" (`/alex-match`), "Entrepreneurs" (`/join`), "Connexion" (`/login`)
- 1 CTA primaire : "Commencer" → `/alex-match`
- Mobile : burger avec les 3 mêmes liens + CTA pleine largeur

**Nouveau composant : `PublicFooterMinimal`**
- 1 ligne : logo + © + lien Confidentialité + lien CGU + "Made in Québec ⚜️"

**Nouveau layout : `PublicLayout`**
- Utilise `PublicHeaderMinimal` + `PublicFooterMinimal`
- Pas de `MobileBottomNav`, pas de `FooterSEOGrid`
- Garde le fond cinématique dark + Alex orb (sauf sur `/alex-match` où il prend tout l'écran)

`MainLayout` reste pour les sections privées (dashboard, pro, admin). `SmartHeader` complet n'apparaît qu'aux utilisateurs loggés.

### Lot 2 — Routes : whitelist publique + redirections
Liste blanche publique (10 écrans) :
```
/  /alex-match  /results  /upload-photo  /join
/import-business  /plans  /checkout  /admin  /coverage
```

Tout le reste reste accessible par URL directe (pour ne rien casser) mais **n'apparaît plus jamais dans la nav**. Pas de blocage côté router — juste retrait des liens.

Alias à créer :
- `/alex-match` → page conversation match (nouvelle, basée sur `/alex` existant)
- `/results` → page résultat match (nouvelle)
- `/upload-photo` → réutilise `/diagnostic-photo` existant via redirect
- `/join` → réutilise flow contractor onboarding existant via redirect ou wrapper
- `/import-business` → réutilise scanner carte d'affaires existant
- `/plans` → redirige vers `/pricing/entrepreneurs` (existe déjà)
- `/coverage` → nouvelle page admin

### Lot 3 — Homepage reset (`PageHomeRevenueFocused`)
Remplacer `src/pages/Home.tsx` par version épurée :

```text
┌────────────────────────────────────────┐
│         [PublicHeaderMinimal]          │
├────────────────────────────────────────┤
│                                        │
│           ◉ Alex orb (96px)            │
│                                        │
│   Le bon entrepreneur.                 │
│   Dès la première fois.                │
│                                        │
│   Décrivez votre besoin. Alex vous     │
│   guide et recommande les meilleurs    │
│   pros selon votre situation.          │
│                                        │
│   [ Trouver maintenant → ]             │
│   [ Je suis entrepreneur ]             │
│                                        │
├────────────────────────────────────────┤
│   ✓ Vérifiés  ✓ Disponibles  ✓ QC     │
└────────────────────────────────────────┘
```

Composants : `HeroSectionConversionCore` + `TrustStripMinimal`. Aucune autre section. Hauteur ≈ 1 viewport mobile.

### Lot 4 — `/alex-match` (style ChatGPT premium)
Nouvelle page `PageAlexMatch` plein écran :
- Header minimal sticky (logo + bouton X retour `/`)
- `PanelAlexConversation` au centre (chat dominant, voice-first, 5 questions max)
- `FormProjectIntentCapture` inline (problème, ville, urgence, budget, photo optionnelle)
- À la fin → redirige vers `/results`

`PageResults` : `PanelMatchResult` + 3 `CardRecommendedContractor` (1 reco principale + 2 alternatives) + CTA "Réserver maintenant".

Réutilise `AlexConcierge` existant + `AddressVerifiedInput` (vérifié au lot précédent).

### Lot 5 — `/join`, `/plans`, `/checkout`
- **`/join`** → nouveau wrapper `PageJoinEntrepreneur` avec `FormEntrepreneurQuickStart` (7 champs : entreprise, prénom, téléphone, email, site, ville, métier) + CTA "Importer mes données" qui chaîne vers AIPP scan existant
- **`/plans`** → redirect 301 vers `/pricing/entrepreneurs` (existe, déjà 4 plans : Pro/Premium/Elite/Signature)
- **`/checkout`** → garde l'existant (`/checkout/native/:planCode`), juste vérifier qu'il est propre. Un alias `/checkout?plan=xxx` redirige vers la bonne URL.

### Lot 6 — `/admin` + `/coverage`
- **`/admin`** existe déjà (gros dashboard). On crée une **vue par défaut épurée** `AdminCockpitMinimal` avec 6 KPI cards :
  - Entrepreneurs actifs
  - Nouveaux leads (24h)
  - Revenus MRR
  - Catégories faibles (top 3)
  - Villes faibles (top 3)
  - Blocages système (compteur)
- **`/coverage`** nouvelle page admin : sélecteur Ville × Métier → affiche `actifs / couverture% / qualité / GO|NO GO`. Réutilise les données de `city-activity-matrix` existantes.

## Ce qui n'est PAS touché
- Toutes les pages existantes restent en place (admin, pro, dashboard, SEO, condo, courtiers, etc.)
- Toutes les edge functions restent
- Toutes les routes restent déclarées
- Aucune migration DB

Seul le **vernis public** change : nav, homepage, layout des 10 écrans whitelistés.

## KPI tracking (lot 6 bis, rapide)
Ajouter `track()` events dans `usePostHog` ou `analyticsService` existant :
- `home_view`, `cta_find_pro_click`, `cta_join_click`, `match_started`, `match_completed`, `checkout_started`, `checkout_succeeded`

## Questions avant build

1. **`/alex-match` vs `/alex` existant** : on garde `/alex` (immersif full voice) en parallèle ET on crée `/alex-match` (chat texte + voix optionnelle, plus court, optimisé conversion) ? Ou on remplace `/alex` par la nouvelle expérience match ?
2. **Visibilité du switch** : on bascule la homepage tout de suite (les visiteurs verront le nouveau Home dès le déploiement) ou on garde un toggle/feature flag pour A/B tester ?
3. **Authentifiés** : un homeowner déjà loggé qui arrive sur `/` → on lui montre le nouveau Home minimal OU on le redirige direct vers `/dashboard` ?
