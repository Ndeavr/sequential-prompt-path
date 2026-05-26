
# UNPRO Homepage — Living AI Environment (Phase 1)

Trois systèmes connectés, déployés ensemble sur la home `/` (`PageHomeUnicorn`), sans casser l'orchestration Alex existante.

## 1. Cinematic Architectural Background

**Nouveau composant** : `src/components/home-unicorn/CinematicArchScenes.tsx`
- 5 scènes WebP générées via `imagegen` (premium), stockées dans `src/assets/scenes/`:
  1. `scene-luxury-exterior.webp` — maison moderne, atmosphère bleue cinéma
  2. `scene-roofing.webp` — toiture, dégradé bleu doux
  3. `scene-kitchen.webp` — cuisine premium blanc/bleu
  4. `scene-framing.webp` — structure bois, brouillard cinématique
  5. `scene-blueprint.webp` — wireframe maison, lignes glow bleu
- Toutes générées dans une palette unifiée (overlay bleu/cyan, glow blanc, esthétique blueprint AI) → pas de jaune chantier.
- Crossfade Framer Motion `AnimatePresence mode="sync"` : 4s par scène, transition 1.4s (opacity + blur 0→8→0 + scale 1→1.025).
- Couche overlay SVG `BlueprintOverlay` (grille, traits architecturaux, marques de cotation) qui dérive doucement.
- Particules ambiantes (8 dots, drift lent) en `will-change: transform`.
- Masque vignettage + dégradé bas pour lisibilité texte.
- Respecte `prefers-reduced-motion` (fige sur scène 1, fade simple).

**Intégration** : monté en `position: fixed inset-0 -z-10` derrière `<PageHomeUnicorn>` via le layout, masque flou `backdrop-blur-[2px]` derrière la carte glass.

## 2. Alex Orb Intelligence System

**Nouveau singleton global** : `src/components/alex-orb-system/AlexOrbGlobal.tsx`
- Monté **une fois** dans `MainLayout` (jamais remount au changement de route).
- Branché sur `AlexVoiceContext` existant + nouveau store Zustand `src/stores/alexOrbState.ts` :
  - `state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'success'`
  - `micAmplitude: number` (0-1, RAF loop via Web Audio AnalyserNode)
  - `ttsAmplitude: number` (depuis `alexSingleAudioChannel` existant)
- Composants visuels (Framer Motion + SVG, GPU-only):
  - `OrbCore` — sphère bleue dégradée, breathing 4s, scale ±2%
  - `OrbHalo` — anneau conique tournant, intensité liée à `micAmplitude`
  - `OrbWaveRings` — 3 cercles d'amplitude réels (listening)
  - `OrbParticleSwirl` — particules orbitales (thinking/processing)
  - `OrbSpeechWaves` — vagues synchronisées TTS (speaking)
  - `OrbSuccessFlash` — pulse vert doux (success)
- **CSS variable globale** `--alex-glow-color` mise à jour selon state → influence subtilement les composants voisins (voice bar, cards) via `box-shadow: 0 0 60px var(--alex-glow-color)`.

**Voice Bar réactive** : `src/components/alex-orb-system/AlexVoiceBar.tsx`
- Remplace l'actuel bouton "Parler avec Alex" dans `PageHomeUnicorn`.
- Visualiseur d'amplitude réel (mic ou TTS selon state) via canvas léger.
- États visuels alignés sur l'orb.

## 3. Voice Session Continuity (no-switch lock)

**Renforcement** de `AlexVoiceContext` + `alexSingleAudioChannel`:
- Ajouter `voiceSessionLock` : une fois session démarrée, `voiceId`/`agentId`/`language` figés jusqu'à `endSession()` explicite.
- Bloquer tout `switchVoice` mid-session (warn + ignore).
- Fallback voice résolu **avant** `startSession` uniquement (via `useVoiceConfig` health check).
- Fix existing reconnection paths to reuse the same `voiceId` from `alexVoiceConfig.ts`.

## 4. UNPRO Pronunciation Global Lock

Étendre `src/lib/prepareAlexSpeechText.ts` (existe déjà avec règle "Un Pro"/"Hun Pro"):
- Couvrir cas manquants : `UN PRO`, `U.N. PRO`, `UNE PRO`, `U N PRO`, `unpro.ca` → "un pro point ca".
- Ajouter tests `src/lib/__tests__/prepareAlexSpeechText.test.ts` pour chaque variante interdite.
- **Injection prompt** : ajouter ligne dans `mem://ai/alex/system-prompt-active` côté DB via migration:
  > "UNPRO se prononce naturellement 'un pro', jamais lettre par lettre, jamais 'une pro'."
- Audit : sweep tous les fichiers où du texte est envoyé à TTS → vérifier que `prepareAlexSpeechText` est appliqué (services/alex* + edge functions `alex-voice-*`).

## Constraintes & non-régressions

- **Ne pas** créer de nouvelles tables.
- **Ne pas** toucher `src/integrations/supabase/*`, `.env`, `supabase/config.toml`.
- Respecter `alexSessionState` (greet once per tab, MAX_AUTO_RETRIES=0).
- Respecter `permissionManager` : mic demandé au tap orb uniquement.
- Pas d'autostart vocal mobile (memory rule).
- Theme `unicorn-theme.css` préservé, Warm Neutral pages publiques intactes.

## Files Plan

**Created:**
- `src/components/home-unicorn/CinematicArchScenes.tsx`
- `src/components/home-unicorn/BlueprintOverlay.tsx`
- `src/components/alex-orb-system/AlexOrbGlobal.tsx`
- `src/components/alex-orb-system/OrbCore.tsx`, `OrbHalo.tsx`, `OrbWaveRings.tsx`, `OrbParticleSwirl.tsx`, `OrbSpeechWaves.tsx`
- `src/components/alex-orb-system/AlexVoiceBar.tsx`
- `src/components/alex-orb-system/useMicAmplitude.ts`
- `src/components/alex-orb-system/useTtsAmplitude.ts`
- `src/stores/alexOrbState.ts`
- `src/assets/scenes/scene-{1..5}.webp` (imagegen)

**Edited:**
- `src/pages/PageHomeUnicorn.tsx` — monte `<CinematicArchScenes />`, remplace orb/CTA actuels par `<AlexVoiceBar />`
- `src/layouts/MainLayout.tsx` — monte singleton `<AlexOrbGlobal />`
- `src/contexts/AlexVoiceContext.tsx` — ajout `voiceSessionLock`
- `src/lib/prepareAlexSpeechText.ts` — patterns étendus
- `src/lib/__tests__/prepareAlexSpeechText.test.ts` — couverture variantes
- `src/styles/unicorn-theme.css` — variables `--alex-glow-color`, scene layers

## Success criteria

- Background 5 scènes loop 4s, transitions cinéma fluides, mobile 60fps.
- Orb visuellement vivant dans les 5 états, réactif au micro et au TTS réel.
- Une seule voix du début à la fin d'une session (test : ouvrir Alex → conversation 3 tours → aucun switch).
- "UNPRO" jamais épelé lettre par lettre dans aucun TTS, vérifié par tests unitaires.
- Aucun remount d'orb au changement de route.

Confirme et je lance le build (Phase 1 complète en un message, génération images incluse).
