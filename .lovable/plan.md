## Problème

Sur `/pro/:slug` (page atterrissage SMS), Alex parle puis demande "Voulez-vous le résumé en soixante secondes ?" — mais c'est du TTS uniquement (one-way). Le prospect n'a aucun bouton "Oui" et le mic n'écoute pas. Conversation morte → conversion morte.

## Cause

`PageProLandingNuclearClose.tsx` ligne 56-62 : `buildIntroScript` se termine par une question fermée, mais le composant n'utilise que `useNuclearCloseFemaleVoice` (lecture seule). Aucun listener, aucun CTA "Oui".

## Solution

Réécrire le script en deux phases déterministes, **sans question pendante** :

1. **Intro courte (auto-play, ~12s)** — diagnostic + impact financier, se termine par une affirmation : "Voici votre résumé en 60 secondes."
2. **Recap 60s (chaîné automatiquement)** — joué immédiatement après l'intro, livre les 5 dimensions + l'opportunité + le CTA verbal "Touchez Rejoindre maintenant pour activer votre territoire."

Plus de question → plus besoin que l'utilisateur dise "oui". La voix livre la valeur en continu. Les CTAs visuels (Rejoindre / Fondateur / Questions) restent les seuls points de décision.

### Bonus mini-CTA

Ajouter à côté du bouton "Écouter" un bouton **"▶ Résumé 60s"** qui rejoue uniquement la partie recap (pour ceux qui ont raté le début ou veulent réécouter). Aucun listener vocal — l'intent est click-driven.

## Détails techniques

Fichier : `src/pages/pro-landing/PageProLandingNuclearClose.tsx`

1. Remplacer `buildIntroScript` par deux fonctions : `buildIntroScript` (sans question, finit par "Voici votre résumé en 60 secondes.") et `buildRecapScript` (5 dimensions + missed leads + CTA verbal).
2. Dans le `useEffect` auto-arm (ligne 211) : enchaîner `speak(intro)` puis `.then(() => speak(recap))`.
3. Ajouter `playRecap` handler + bouton "Résumé 60s" dans la voice bar (entre "Écouter" et l'indicateur).
4. Garder le bouton "Couper" qui stoppe les deux.

Aucune modif backend, aucune modif des CTAs, aucun changement de logique de scoring.

## Succès

- L'utilisateur n'entend plus de question sans réponse possible.
- Le recap 60s se joue automatiquement après l'intro.
- Un bouton permet de rejouer le recap.
- Les 3 CTAs restent les seuls points de conversion.
