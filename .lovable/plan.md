## Problème

Sur `/` (et plusieurs autres pages), Alex peut être déclenché de **4+ façons différentes** en même temps. Cela crée du bruit, casse la promesse "l'orb EST le CTA" et brise la mémoire `UX copy` (jamais d'instructions, l'orb se suffit).

### Ce qu'on a sur la home (`/index`)

Selon la version actuellement servie via `HomeWithFeatureFlag` → `PageHomeSimple` → `HeroOrbMockup` :

1. **Orb morphing principal** (top) — déclenche `convoRef.start()`
2. **Bouton micro** dans le composer inline (`AlexHomepageConversation` ligne 215)
3. **Bouton "Parler à Alex" / "Voir mon potentiel"** plein écran (CTA primaire)
4. **Bouton "Je suis entrepreneur"** secondaire (route, pas Alex, mais ajoute du bruit)
5. **Centre du `MobileBottomNav`** — `AlexBottomSheetLauncherUNPRO`
6. Sur les autres pages : `AlexCompanionOrb` flottant en bas-droite (déjà caché sur `/`)

Si la variante `HeroAlexCentered` est servie : orb centré + bouton "Cliquez pour parler à Alex" sous le badge → encore double entrée + texte d'instruction interdit par la mémoire.

## Règle cible

**Un seul point d'entrée Alex visible par surface.**

| Surface | Entrée Alex unique |
|---|---|
| Home (`/`, `/index`) | L'orb hero (gros, morphing) — c'est tout |
| Toute autre page | L'orb du `MobileBottomNav` (centre) sur mobile, `AlexCompanionOrb` bottom-right sur desktop — **un seul des deux à la fois** |
| `/alex` | Surface plein écran — pas d'orb flottant (déjà OK) |

L'orb est le CTA. Pas de bouton "Parler à Alex". Pas de "Cliquez pour parler". Pas de mic dupliqué. Le composer texte reste (saisie clavier ≠ start Alex).

## Changements

### 1. `src/components/home-orb/HeroOrbMockup.tsx`
- **Supprimer** le bloc CTAs (lignes 179-202) : "Parler à Alex" / "Voir mon potentiel" / "Je suis entrepreneur" / tagline.
- Conserver l'orb (entrée Alex), la conversation inline, les quick actions (ce sont des routes, pas des entrées Alex), et la feature strip.
- Pour le mode contractor, transformer la quick action existante "Activer mon profil" / "Voir mon AIPP" en CTA visuellement légèrement plus marqué (sans dupliquer Alex).

### 2. `src/components/home-orb/AlexHomepageConversation.tsx`
- **Retirer le bouton mic** dans le composer (lignes 215-226). L'utilisateur tape OU touche l'orb. Pas trois moyens.
- `onFocus` de l'input continue de déclencher `greet()` silencieusement (pas un bouton, donc pas une "entrée" visible).

### 3. `src/components/home-simple/HeroAlexCentered.tsx` (variante alternative)
- **Retirer** le bouton "Cliquez pour parler à Alex" (lignes 87-93). Texte d'instruction interdit par la mémoire UX copy.
- Garder le badge "Alex · Votre expert IA" comme indicateur de présence, pas comme CTA.

### 4. `src/layouts/MainLayout.tsx`
- Règle actuelle : `showAlex = !["/alex", "/", "/index"].includes(pathname)` — déjà bonne pour la home.
- **Ajouter** : sur mobile (`md:` breakpoint), si le `MobileBottomNav` (qui contient déjà `AlexBottomSheetLauncherUNPRO` au centre) est visible, **masquer** `AlexCompanionOrb`. Garder `AlexCompanionOrb` uniquement en desktop. Cela élimine la double-orb mobile (centre nav + bottom-right).
- Implémentation : ajouter `className="hidden md:block"` sur le wrapper de `AlexCompanionOrb` ou ajouter une condition dans le composant lui-même.

### 5. `src/components/home/FloatingAlexRobot.tsx`
- Audit : ce composant est rendu où ? S'il apparaît sur la home alternative, il devient une 3ᵉ entrée. Vérifier ses usages et le retirer s'il fait doublon avec `AlexCompanionOrb` ou l'orb hero.

### 6. Audit balayage rapide des autres pages
Pour chaque page listant `openAlex` ou un orb : vérifier qu'il n'y a qu'**une seule** entrée visible. Liste prioritaire à vérifier :
- `ParlerAAlexPage.tsx` (toute la page = entrée Alex, OK)
- `HeroSectionAlexFirst.tsx`, `SectionAlexActivation.tsx`, `SectionInstantMatch.tsx`, `SectionBookingCTA.tsx` (multiples CTAs "Parler à Alex" — consolider)
- `HeroCopilotMobile.tsx`, `HeroSectionEntrepreneurs.tsx` (vérifier doublon orb + bouton)
- `OrbAlexPrimaryEntry.tsx`, `HeroSectionIntentTrigger.tsx` (déjà conçus comme entrée unique, vérifier)

Pour ces pages : si un orb est présent, supprimer les boutons textuels "Parler à Alex" qui pointent vers `openAlex()`. Garder les liens contextuels qui routent ailleurs (ex: `/quote-analyzer`).

## Détails techniques

- `HeroOrbMockup.tsx` : suppression du JSX lignes 179-202 + nettoyage des variables `primaryCtaLabel`, `primaryCtaHref`, `secondaryHref`, `secondaryLabel`, `tagline` devenues inutiles.
- `AlexHomepageConversation.tsx` : suppression du `<button>` mic + ajustement du flex pour que l'input prenne toute la largeur.
- `HeroAlexCentered.tsx` : suppression du `<button>` "Cliquez pour parler" + import `Mic` devenu inutile.
- `MainLayout.tsx` : wrapper `<AlexCompanionOrb />` dans un `<div className="hidden md:block">` ou ajouter prop `desktopOnly`.

## Hors scope

- Logique vocale, ElevenLabs, prompts Alex.
- Nouvelle route ou redesign de l'orb lui-même (déjà fait dans le tour précédent).
- Refactor de `MobileBottomNav` interne.

## Tâches

1. Nettoyer les CTAs dupliqués dans `HeroOrbMockup.tsx`
2. Retirer le bouton mic dans `AlexHomepageConversation.tsx`
3. Retirer le bouton "Cliquez pour parler" dans `HeroAlexCentered.tsx`
4. Cacher `AlexCompanionOrb` sur mobile dans `MainLayout.tsx`
5. Auditer + dédupliquer les CTAs Alex dans les pages prioritaires listées ci-dessus
6. Vérifier visuellement sur mobile 384px que chaque page n'a qu'une entrée Alex visible
