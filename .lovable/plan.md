
# UNPRO — Refonte Orb + Hero + Audit Flow Entrepreneur

Livraison big bang en un seul build, sans casser l'existant. Aucune nouvelle table : on réutilise `contractors`, `contractor_aipp_scores`, `contractor_pages` (`/pros/[slug]`), `subscriptions`, `payments`, le checkout Stripe Payment Element existant et `useVoiceSales`.

## Phase 0 — Fix bloquant (5 min)

**Bug** : `[UNPRO_BOOT] PROFILE_FETCH_TIMEOUT 5000ms` après chaque `SIGNED_IN`. La home reste suspendue 5 s, Alex ne démarre pas, et c'est probablement la cause réelle de "voix ne démarre pas".

Cause attendue : la query `profiles` dans `useAuth`/providers attend une ligne qui n'existe pas (ou RLS bloque) sans fallback.

Action :
- Lire `src/app/providers.tsx`, `src/hooks/useAuth.ts`, `src/contexts/AlexVoiceContext.tsx`.
- Réduire le timeout à 2 s, ne plus bloquer le boot : si timeout/erreur → continuer avec `profile = null`, logger une fois, ne pas re-tenter en boucle.
- Vérifier qu'un trigger crée bien une ligne `profiles` à la création d'un `auth.users` (sinon ajouter trigger `handle_new_user`).

## Phase 1 — Refonte visuelle homepage (mockup)

Cible : `src/pages/PageHomeSimple.tsx` (route `/`). Garder structure SEO/Helmet existante.

Nouveaux composants dans `src/components/home-orb/` :
- `HeroOrbSection.tsx` — sphère 3D bleu néon, smiley waveform, badge "● ONLINE" vert, sous-titre "ALEX".
- `OrbSphere.tsx` — sphère CSS pure (radial-gradients + box-shadows + animations) avec :
  - icône maison bleue en haut intérieur,
  - 2 yeux pilule bleu lumineux,
  - reflet supérieur subtil,
  - halo bleu pulsant en dessous (plateau réfléchissant),
  - animation `breathe` (scale 1 → 1.02), `pulse-glow` boucle 3s.
- `WaveformLive.tsx` — 40 barres SVG animées via `requestAnimationFrame`, amplitude liée à `isSpeaking`/`isListening` du `AlexVoiceContext`.
- `AlexTranscriptBubble.tsx` — bulle sous l'orb qui affiche en temps réel le texte d'Alex (transcription user + réponses agent) en streaming. Source : events `useLiveVoice` / `useAlexConversation` existants.
- `OrbStateBadge.tsx` — micro-indicateur listening | thinking | speaking | paused | completed.
- `QuickActionsRow.tsx` — 5 cards arrondies 2xl : Problème maison, Analyse soumission, Vérifier un pro, Rejoindre UNPRO, Gestion condo. Liens vers routes existantes.
- `HomeFeatureStrip.tsx` — 4 mini-cards pied de hero : AI-POWERED, SECURE BY DESIGN, SMART AUTOMATION, HUMAN + AI (icônes Lucide bleues, style mockup).

CTAs hero :
- Primaire "Parler à Alex" → ouvre overlay voix (existant `openAlex("intent_conversation")`).
- Secondaire "Je suis entrepreneur" → `/entrepreneur` (landing pro existant).
- Sous-texte : "Trouvez le bon pro. Ou devenez le pro recommandé."

Tokens dark dans `src/index.css` (sans toucher `landing-warm`) :
- `--orb-base: 222 90% 8%`, `--orb-glow: 217 100% 60%`, `--orb-rim: 217 100% 75%`.
- `--hero-bg: 222 47% 4%` (proche `#060B14`), `--hero-grain` overlay 3% noise.
- Garder light mode existant intact (toggle plus tard).

Mobile-first : orb 240 px sur mobile (centré, marge top 64 px), 320 px ≥ md. Chat bubble pleine largeur en dessous. Quick actions scroll-snap horizontal sur mobile.

## Phase 2 — Audit + fix flow entrepreneur (sans nouvelles tables)

Mapping de l'existant à valider/réparer :

| Étape brief | Module existant | Action |
|---|---|---|
| Onboarding pro | `useContractorFunnel`, `contractorStore`, `/entrepreneur`, `useContractorMode` | Vérifier que les 9 questions du brief existent ; sinon ajouter celles qui manquent dans le store (objectif actuel, panier moyen, services rentables) |
| AIPP score | `contractor_aipp_scores`, `useAIPPv2Audit`, `useContractorAippAudit`, `aipp-real-scoring-engine` | Vérifier appel + affichage forces/faiblesses/recos. Ajouter mode "analysis pending" si pas de site. |
| Plan reco | `useContractorPlan`, `useFounderPlans`, `CONTRACTOR_PLANS` | Vérifier reco automatique selon capacité/territoire/ticket. Ajouter phrase "Selon votre situation actuelle, le plan le plus logique est X parce que…" |
| Stripe | `pricing/checkout-architecture` (Payment Element natif fr-CA) | Aucun nouveau checkout. Vérifier flow Recrue gratuit (skip Stripe → activation directe) |
| Page pro | `/pros/[slug]`, `useContractorPublicPage` | Vérifier passage `status: draft → active` après paiement |
| Notif admin | `/admin/operations` | Vérifier event `contractor_activated` loggé (sinon l'ajouter au callback success) |
| Succès | `useAlexSalesSession` | Écran final "Boom. Votre profil UNPRO est live." + checklist (calendrier, photos, services) |

Livrable : un seul rapport `.lovable/audit-entrepreneur-flow.md` avec ✅/❌ par étape + fixes minimaux appliqués. Aucune nouvelle table.

## Phase 3 — Backup & rollback (conforme demande)

- Tag de version Lovable nommé `UNPRO_PRE_ALEX_ORB_TRANSFORMATION_2026-05-14` au début (commit avant toute modif).
- Script `scripts/backup-critical-tables.ts` exécutable depuis `/admin/operations` qui exporte en CSV vers Storage bucket `backups/` les tables : `profiles`, `contractors`, `contractor_aipp_scores`, `contractor_pages`, `subscriptions`, `payments`, `bookings`, `reviews`, `documents`. Edge function `backup-critical-tables` avec service role.
- Fichier `.lovable/migration-log-2026-05-14.md` : tables modifiées (aucune en Phase 1, à confirmer en Phase 2), edge functions touchées, routes modifiées, vars utilisées.
- Bouton admin "Restaurer la version stable précédente" dans `/admin/operations` qui ouvre l'historique Lovable (le rollback DB n'est pas couvert par Lovable — affichage d'un avertissement clair + lien vers les CSV de backup).

## Phase 4 — Vérifications avant publish

Liste manuelle (cochée par l'utilisateur après build) :
- [ ] `/` charge en < 3 s mobile, orb visible, "Parler à Alex" cliquable
- [ ] Login fonctionne, plus de `PROFILE_FETCH_TIMEOUT`
- [ ] Alex voix démarre en < 2 s (signed URL websocket, voice ID `or4EV8aZq78KWcXw48wd`)
- [ ] Onboarding entrepreneur complet `/entrepreneur` → AIPP → plan → Stripe sandbox → `/pros/[slug]` `active`
- [ ] Stripe Payment Element s'affiche fr-CA
- [ ] iPhone Safari + Android Chrome (responsive 384 px et 414 px)
- [ ] Retour après login redirige correctement
- [ ] `/pros/[slug]` SSR (Googlebot via prerender) toujours OK

Si l'un échoue → STOP, on n'écrase pas la prod.

## Détails techniques

```
Files créés
- src/components/home-orb/HeroOrbSection.tsx
- src/components/home-orb/OrbSphere.tsx
- src/components/home-orb/WaveformLive.tsx
- src/components/home-orb/AlexTranscriptBubble.tsx
- src/components/home-orb/OrbStateBadge.tsx
- src/components/home-orb/QuickActionsRow.tsx
- src/components/home-orb/HomeFeatureStrip.tsx
- supabase/functions/backup-critical-tables/index.ts
- scripts/backup-critical-tables.ts (admin trigger)
- .lovable/migration-log-2026-05-14.md
- .lovable/audit-entrepreneur-flow.md

Files modifiés
- src/pages/PageHomeSimple.tsx          (swap hero pour HeroOrbSection)
- src/app/providers.tsx                 (timeout profile non bloquant)
- src/hooks/useAuth.ts                  (fallback profile null sans retry)
- src/index.css                         (tokens orb/hero, dark uniquement)
- src/pages/admin/PageOperations.tsx    (bouton backup + bouton rollback)

Fichiers NON modifiés (réutilisés tels quels)
- useLiveVoice, AlexVoiceContext, alexVoiceConfig.ts
- contractorPlans, pricing/checkout-architecture
- contractor_aipp_scores, contractor_pages, /pros/[slug]
- toutes les edge functions Stripe et voice existantes
```

Risques :
- Phase 2 peut révéler des trous dans le flow existant. Si trop d'écarts, on remonte les fixes en commits séparés et on documente dans audit-entrepreneur-flow.md plutôt que de tout corriger en silence.
- Le rollback DB reste manuel via les CSV (Lovable ne restaure que le code). Ce point est documenté dans le bouton admin.
