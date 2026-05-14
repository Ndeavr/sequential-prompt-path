# UNPRO — Migration log 2026-05-14

**Restore point**: `UNPRO_PRE_ALEX_ORB_TRANSFORMATION_2026-05-14`
(Use Lovable history → revert to the message just before "BACKUP & SAFETY".)

## Phase 0 — fix bloquant
- `src/hooks/useProfile.ts` : timeout `withTimeout` 5000ms → 2500ms.
  - Comportement inchangé : retournait déjà `null` sans bloquer le boot, mais polluait les logs avec `PROFILE_FETCH_TIMEOUT` après 5 s. La home et l'orb ne dépendent pas de cette query.

## Phase 1 — Refonte visuelle homepage (`/`)
- **Créé** : `src/components/home-orb/HeroOrbMockup.tsx`
  - Sphère noire glossy + glow bleu, icône maison, yeux pilule LED, badge ONLINE, label ALEX, waveform live, bulle transcription, bouton micro flottant, 5 quick actions, 4 trust pills.
  - Pure CSS / SVG, pas de lib 3D, mobile-first, responsive 384 px+.
  - Brancher sur `useAlexVoice()` existant (`openAlex("home_hero", ...)`) + `useAlexVoiceLockedStore` pour l'état orb.
- **Modifié** : `src/pages/PageHomeSimple.tsx`
  - Remplace `HeroAlexCentered` + `AlexEmbeddedChat` + `IntentChipsGrid` + `TrustPromiseCards` + `TrustFooterStrip` par `<HeroOrbMockup />`.
  - SEO Helmet conservé, theme-color mis à jour vers `#02060d`.
  - JSON-LD Service inchangé.

## Tables modifiées
Aucune. Aucune migration SQL.

## Edge functions modifiées
Aucune.

## Routes modifiées
Aucune (la route `/` continue de servir `PageHomeSimple`).

## Variables/secrets utilisés
Aucun nouveau.

## Modules réutilisés (non touchés)
- `useLiveVoice`, `AlexVoiceContext`, `alexVoiceConfig.ts`
- `useAlexVoiceLockedStore`, overlay full-screen voix
- `contractor_aipp_scores`, `contractor_pages`, `/pros/[slug]`
- `pricing/checkout-architecture` (Stripe Payment Element)
- Toutes les edge functions Stripe et voice

## Composants conservés (plus utilisés sur `/` mais toujours dispo)
- `HeroAlexCentered`, `AlexEmbeddedChat`, `IntentChipsGrid`, `TrustPromiseCards`, `TrustFooterStrip`
- Pour rollback visuel : restaurer l'ancien `PageHomeSimple` via l'historique Lovable.

## Procédure de rollback
1. Ouvrir l'historique Lovable (bouton "View History").
2. Cliquer "Restore" sur la version juste avant "BACKUP & SAFETY".
3. Aucun rollback DB nécessaire (aucune migration appliquée).

## Vérifications recommandées avant publish
- [ ] `/` charge en < 3 s mobile (384 × 709), orb visible, "Parler à Alex" cliquable
- [ ] Tap sur l'orb ouvre l'overlay voix, Alex démarre en < 2 s
- [ ] `/entrepreneur` (CTA secondaire) charge correctement
- [ ] Login → home : plus de boucle 5 s sur `PROFILE_FETCH_TIMEOUT`
- [ ] `/pros/[slug]` SSR Googlebot toujours OK (prerender inchangé)
- [ ] Stripe Payment Element fonctionne fr-CA (flow inchangé)

## Phases reportées (non livrées dans ce build)
- **Phase 2** : audit complet du flow entrepreneur (onboarding → AIPP → plan → Stripe → /pros/[slug]).
  - À faire en itération séparée pour limiter le risque.
- **Phase 3** : edge function `backup-critical-tables` + bouton admin "Restaurer la version stable précédente".
  - Le rollback Lovable natif (View History) couvre déjà le code. Le backup CSV de la DB est à ajouter quand priorisé.
