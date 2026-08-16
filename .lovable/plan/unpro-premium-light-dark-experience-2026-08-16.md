# UNPRO — Premium Light + Dark Experience

Objectif : transformer l'interface existante en expérience AI-native premium avec un vrai système Light / Auto / Dark, sans casser un seul workflow.

## Constat d'audit (vérifié dans le code)

- `src/index.css` : le bloc clair existe bien dans `:root` (lignes ~31-118) mais il est **écrasé immédiatement** par le bloc `:root, .admin-theme, .alex-immersive` (ligne ~126) qui impose le thème sombre. Il n'y a donc aujourd'hui **aucun mode clair fonctionnel** sur l'app (seul `.landing-warm` fait exception, sur certaines pages publiques).
- `src/hooks/useThemeToggle.ts` : le hook est un stub — il force le sombre, retire la classe `light`, et ses fonctions `toggle`/`setTheme` sont vides. Aucune persistance.
- `tailwind.config.ts` : `darkMode: ["class"]` est configuré mais la classe n'est jamais pilotée.
- `src/components/system/background/StableBackgroundLayer.tsx` : fond global monté une seule fois au-dessus du router, avec `#050816` + 2 halos + grain **en dur** (styles inline). Il ne peut pas suivre un thème.
- `src/components/home-orb/HeroOrbMockup.tsx`, `HomeFin3Sections.tsx`, `BottomDockGlass.tsx`, `SmartHeader.tsx` : couleurs codées en dur (`text-white`, `bg-white/[0.06]`, `hsl(220 60% 8%)`) — invisibles en mode clair.
- Existant à réutiliser tel quel : `AlexMorphingOrb`, `AlexHomepageConversation`, `AlexVoiceContext.openAlex`, `useHomeFin3Copy` (FR/EN), `trackCopilotEvent`, routes `/analyse-soumissions/importer`, `/entrepreneur`, `/problemes`, tokens `--glass-*`, `--shadow-*`, `.glass-strong`.

Conséquence : ce n'est pas un travail de couleurs, c'est la **réactivation du système de thème** puis la conversion des composants clés vers les tokens.

## Ce qui va être construit

### 1. Système de thème réel (Light / Auto / Dark)

- Nouveau `src/lib/theme/themeStore.ts` : mode `light | dark | system`, persistance `localStorage` (`unpro-theme`), écoute de `prefers-color-scheme`, application de la classe `light` ou `dark` sur `<html>` + `<meta name="theme-color">` synchronisé.
- Script inline anti-flash dans `index.html` (avant paint) qui pose la bonne classe dès le premier octet — zéro flash blanc/noir.
- `useThemeToggle.ts` réécrit sur ce store, en conservant l'API actuelle (`theme`, `isDark`, `toggle`, `setTheme`) pour ne rien casser.
- Aucune table, aucune migration : `localStorage` suffit. Si une préférence utilisateur existe déjà en base, on la lit au login et on hydrate le store (lecture seule, pas de nouveau système).
- Transition globale 240ms sur `background-color`, `border-color`, `color`, `box-shadow`, désactivée sous `prefers-reduced-motion` et pendant l'hydratation initiale.

### 2. Restructuration des tokens CSS

- `:root` = **thème clair** (palette bleutée glacée déjà écrite, aujourd'hui écrasée).
- `.dark` = thème sombre cinématique (le bloc actuel, déplacé sans changement de valeurs pour ne pas régresser la lisibilité).
- `.admin-theme`, `.alex-immersive`, `.intel-theme` restent des alias du scope sombre — aucune page existante ne change d'apparence.
- `.landing-warm` conservé tel quel.
- Nouveaux tokens d'atmosphère par thème : `--atmos-base`, `--atmos-glow-a`, `--atmos-glow-b`, `--atmos-bloom`, `--atmos-grid`, `--atmos-noise-opacity`.

### 3. Fond atmosphérique multi-couches

`StableBackgroundLayer` passe des styles inline en dur à des couches pilotées par tokens :

```text
1. base          → near-black navy / off-white bleuté
2. halo bleu     → radial large hors cadre, haut-gauche
3. halo graphite → radial secondaire, bas-droite
4. bloom navy    → gradient d'ambiance très faible
5. blueprint     → grille SVG légère, opacité 0.02-0.04
6. grain         → noise overlay existant
```

Aucune vidéo, aucun canvas : gradients CSS + un SVG inline compressé, `pointer-events:none`, `contain: layout paint style` (déjà en place).

### 4. Langage glass unifié

Classes utilitaires dans `index.css`, déclinées automatiquement Light/Dark via tokens : `.glass-surface`, `.glass-card`, `.glass-nav`, `.glass-button`, `.glass-modal`, `.glass-dock`. Blur 20-30px, bordure fine, highlight supérieur, ombre diffuse. `.glass-strong` (règle de lisibilité existante) reste la référence dès qu'un texte long est posé sur du verre.

### 5. Theme switcher

- Nouveau `src/components/theme/ThemeSwitcher.tsx` : segmented control ☀︎ / Auto / ☾ sur desktop, un seul bouton compact ouvrant un menu (Clair / Automatique / Sombre) sur mobile.
- Intégré dans `SmartHeader` (desktop) et dans `MobileDrawer`/`MobileMenu` (mobile) pour ne pas surcharger la barre mobile.
- `ThemeToggleInspirations` existant est recâblé sur le store au lieu d'un state local.

### 6. Hero cinématique

`HeroOrbMockup` reste le composant (pas de nouveau hero) — refonte visuelle :

- Eyebrow `UNPRO + ALEX`, headline `LA FIN DES 3 SOUMISSIONS.` en échelle cinématique, sous-titre, puis paragraphe d'explication court.
- Copy ajouté/ajusté dans `src/lib/copy/homeFin3.ts` (FR + EN) — source unique, rien de codé en dur.
- CTA primaire `Trouver mon PRO →` → `openAlex()` existant. CTA secondaire `J'ai déjà des soumissions` → `/analyse-soumissions/importer`. Aucun nouveau flux.
- Micro-proof : mention « entrepreneurs vérifiés » affichée **uniquement** si la vérification est réellement confirmée côté données ; sinon la clause est retirée de la ligne.
- Atmosphère : halo bleu hors cadre, gradients asymétriques, blueprint quasi invisible, quelques particules lentes (désactivées en reduced-motion), illumination qui monte depuis l'orbe.
- Orbe Alex : `AlexMorphingOrb` conservé, entouré d'un glow volumétrique, respiration lente, marge suffisante sur mobile.
- Toutes les couleurs en dur (`text-white`, `bg-white/[0.06]`, gradient inline) remplacées par des tokens sémantiques.

### 7. Récit de la homepage

`HomeFin3Sections` réordonné et retokenisé sur la trame : 01 Rupture → 02 Intelligence (Alex) → 03 Analyse → 04 Matching → 05 Soumissions existantes → 06 Confiance (preuves réelles seulement) → 07 Passeport Maison → 08 CTA final `Parler à Alex`. La section 02 branche sur le workflow Alex existant (`Analyser ma situation` / `Voir un exemple`), sans dupliquer de composant.

### 8. Header & dock

- `SmartHeader` : barre glass, opacité qui monte au scroll, spacing et états hover revus. Logo, recherche, Alex, FR/EN, QR, Entrepreneurs, Connexion, CTA — tous conservés.
- Header mobile : priorité logo → FR/EN → notifications → profil → menu ; le reste bascule dans le drawer existant.
- `BottomDockGlass` : container transformé en dock flottant glass, Alex central, safe-area iOS/Android vérifiée, masquage clavier ouvert testé.

### 9. Cartes & motion

Langage de carte unique (rayon 28px, glass, glow local, icônes line-art, hover : élévation 2-4px + illumination de bordure). Motion : fade, reveal, glow, parallax très léger, orb breathing. Aucun bounce, aucun scroll hijacking, `prefers-reduced-motion` respecté partout.

### 10. Analytics

Ajout des noms manquants au type `CopilotEventName` existant (`hero_find_pro_clicked` est déjà couvert par `hero_find_pro_click`, `hero_existing_quotes_clicked` par `hero_compare_quotes_click` — on réutilise, on ne duplique pas) et ajout de `alex_analysis_started`, `example_clicked`, `theme_changed`, `contractor_nav_clicked`. Aucune seconde infrastructure.

## Détails techniques

| Fichier | Action |
| --- | --- |
| `index.html` | script anti-flash inline |
| `src/lib/theme/themeStore.ts` | nouveau store thème + persistance |
| `src/hooks/useThemeToggle.ts` | réécrit sur le store, API inchangée |
| `src/index.css` | `:root` = clair, `.dark` = sombre, tokens atmosphère + classes glass |
| `src/components/system/background/StableBackgroundLayer.tsx` | 6 couches pilotées par tokens |
| `src/components/theme/ThemeSwitcher.tsx` | nouveau |
| `src/components/navigation/SmartHeader.tsx` / `MobileDrawer.tsx` | glass + switcher |
| `src/components/home-unicorn/BottomDockGlass.tsx` | dock flottant glass |
| `src/components/home-orb/HeroOrbMockup.tsx` | hero cinématique tokenisé |
| `src/components/home-fin3/HomeFin3Sections.tsx` | récit 8 sections tokenisé |
| `src/lib/copy/homeFin3.ts` | copy FR/EN étendu |
| `src/utils/trackCopilotEvent.ts` | 4 événements ajoutés |

Aucune migration, aucune nouvelle route, aucune modification de matching / paiement / vérification / rendez-vous / auth.

## Vérification avant de déclarer terminé

- Light / Auto / Dark réellement fonctionnels, choix persistant, aucun flash au chargement ni au refresh.
- Captures Playwright réelles en Light et Dark à 320, 390, 430, 1024 et 1440px.
- Parcours testés : Home → Trouver mon PRO → Alex ; Home → J'ai déjà des soumissions → analyse.
- FR et EN, connecté et déconnecté, retour arrière, refresh, changement de thème en cours de session.
- Contraste WCAG AA minimum sur toute surface glass ; focus clavier visible ; reduced-motion respecté.
- Aucun contenu fictif, aucun bouton décoratif, aucun doublon de route/table/composant.

## Question ouverte

Par défaut au premier chargement : **Auto** (suit le système). Dites-le si vous préférez forcer Dark par défaut.
