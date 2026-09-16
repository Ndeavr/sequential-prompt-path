# Révélation progressive du champ « Nom de votre entreprise » sur /entrepreneurs/audit-ia

## Contexte (vérifié)

- Les CTA « AUDIT IA GRATUIT » (header), « Découvrir mon score IA » (hero) et la section finale appellent tous `scrollToAudit` dans `src/pages/entrepreneur/PageAiRecommendationAudit.tsx`, qui fait uniquement un `scrollIntoView` — le champ apparaît déjà là, sans transition.
- Le champ (`Input id="audit-q"`) est dans la carte étape 1 (ligne ~423-443), thème `.audit-gold`.
- Styles `.audit-gold` / `.gold-btn` : `src/index.css` (~ligne 357+), avec un bloc `prefers-reduced-motion` existant.

## Changement

Au clic sur n'importe quel CTA d'audit, le champ « Nom de votre entreprise » se révèle progressivement (fondu + léger ascendant, ~600 ms) et un contour doré subtil s'anime autour du champ pour guider l'œil, puis se stabilise.

1. **`src/pages/entrepreneur/PageAiRecommendationAudit.tsx`**
   - Ajouter un compteur `revealCount` incrémenté dans `scrollToAudit`.
   - Envelopper le bloc champ + bouton d'une div avec `key={revealCount}` et classe `audit-field-reveal audit-field-contour` : l'animation rejoue à chaque clic.
   - Après le défilement (~650 ms), focus sur `#audit-q` (seulement si aucun résultat et pas d'analyse en cours) — le clavier mobile s'ouvre au bon moment, jamais pendant le scroll.
   - Le champ reste présent dans le DOM en permanence (accessibilité, SEO, no-JS) : la révélation est une animation, pas un masquage.

2. **`src/index.css`** (portée `.audit-gold`)
   - `@keyframes audit-field-reveal` : opacité 0→1 + translateY(10px)→0, 600 ms, easing maître `cubic-bezier(.22,1,.36,1)`.
   - `@keyframes audit-field-contour` : halo doré pulsant très discret (box-shadow 0→4 px, opacité ≤ 20 %), ~2,4 s, limité à 3 pulsations puis repos sur la bordure dorée statique.
   - `prefers-reduced-motion: reduce` : apparition instantanée (opacité seule), contour statique sans pulsation.

## Hors scope

Aucun changement backend, route, texte, vidéo, logique d'audit ou autre page. `AuditIntakeForm.tsx` non touché (autre funnel).

## Vérification

- Typecheck + build.
- Playwright mobile 390 px et desktop : clic sur « Découvrir mon score IA » → champ focus, classes d'animation présentes, aucun débordement horizontal; reduced-motion vérifié.
