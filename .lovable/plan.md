## Diagnostic

Looking at the screenshot + DB:

| Stage | Affiché | Réalité |
|---|---|---|
| 1. Prospect trouvé | 10 (0 RBQ, 0 email, 10 phone) | OK — 10 prospects en 7j, mais qualité faible (0 RBQ, 0 email) |
| 2. SMS / Email envoyés | 85 (label "email_sent: 85") | **Bug d'étiquette** : ce sont des **SMS** dans `contractor_outreach_logs` (channel='sms'), pas des emails. Aussi : la valeur additionne `contractor_curiosity_sms_events` + `contractor_outreach_logs` → **risque de double-comptage** (curiosity sms = 0 ici, donc pas visible mais fragile). |
| 3. Lien cliqué | 0 | **Tracking cassé** : 0 ligne dans `outreach_click_events` jamais (total = 0). Les SMS envoyés ne contiennent pas de lien tracké qui écrit dans cette table. |
| 4. Alex démarre | 0 | Conséquence directe de #3 : si personne n'atterrit, Alex ne démarre pas. Aussi : le compteur lit `alex_conversation_sessions` sans filtrer par contexte « depuis lien SMS ». |
| Scroll | Bloqué avant le bas | `admin-theme` + `min-h-screen` sur la page interne, combiné au funnel horizontal `overflow-x-auto` qui capte le geste vertical. |

## Plan

### 1 — Réparer l'instrumentation Lien Cliqué (vraie cause des 0)
- **Edge function `track-outreach-click`** : ajouter une route `GET ?token=…&to=…` qui (a) insère dans `outreach_click_events` (b) 302 vers l'URL finale. Idempotent par `(token, ip_hash, minute)`.
- **SMS sender (`dispatch-outreach-batch` + `sms-curiosity-tick`)** : remplacer le lien direct `https://unpro.ca/pro/:slug` par `https://api.unpro.ca/functions/v1/track-outreach-click?token=…` (token = `tracking_token` du prospect).
- **`pro-landing-resolve`** : doublon de sécurité — insérer aussi une ligne `outreach_click_events` quand un `token` est présent (filet si le redirect saute).

### 2 — Corriger les étiquettes & doubles comptages dans `critical-path-snapshot`
- Stage 2 : `value = max(sms_logs, sms_events) + email_logs` (jamais d'addition naïve). Méta renommée : `sms_sent`, `sms_failed`, `email_sent` lus des bonnes sources (`contractor_outreach_logs` filtré par `channel`).
- Stage 3 : `value = outreach_click_events` (les `pro_landing_views` deviennent meta, pas additionnés).
- Stage 4 : ajouter filtre `alex_conversation_sessions.metadata->>'source' IN ('outreach','pro_landing','curiosity')` pour ne compter QUE les sessions issues du funnel.
- Ajouter `meta.quality_alert` sur Stage 1 si `with_email/scraped < 0.3` ou `with_rbq/scraped < 0.3` → affiché en rouge dans l'UI.

### 3 — Corriger le scroll mobile sur `/admin/critical-path-audit`
Dans `PageAdminCriticalPathAudit.tsx` :
- Remplacer le wrapper racine `min-h-screen … pb-32` par `min-h-dvh overflow-y-auto pb-40` (utilise dynamic viewport, évite la barre Chrome qui mange le bas).
- Ajouter `overscroll-behavior-y: contain` sur le wrapper.
- Sur le funnel horizontal : retirer le `style={{ touchAction: "pan-y pan-x" }}` (il capture le geste) et utiliser à la place `touch-action: pan-x` SEULEMENT sur l'élément `overflow-x-auto` interne, avec un wrapper extérieur qui garde le pan-y natif.
- Vérifier qu'aucun parent (App layout) ne pose `overflow: hidden` sur `body` quand `admin-theme` est actif.

### 4 — Vérification (post-build)
- Exécuter un test Playwright sur `/admin/critical-path-audit` viewport 384×706 : scroll jusqu'au bas, screenshot du dernier Card "Test live prospect réel".
- Déployer les 3 edge functions modifiées, puis appeler manuellement `track-outreach-click?token=<existant>` et vérifier `SELECT count(*) FROM outreach_click_events` = 1.
- Relancer `critical-path-snapshot` et confirmer : Stage 2 label correct, Stage 3 ≥ 1.

## Détails techniques

- Fichiers touchés :
  - `supabase/functions/track-outreach-click/index.ts` (étendre)
  - `supabase/functions/dispatch-outreach-batch/index.ts` (remplacer URL SMS)
  - `supabase/functions/sms-curiosity-tick/index.ts` (remplacer URL SMS)
  - `supabase/functions/pro-landing-resolve/index.ts` (ajouter click event si token)
  - `supabase/functions/critical-path-snapshot/index.ts` (corriger labels + dédoublonnage + filtre Alex)
  - `src/pages/admin/PageAdminCriticalPathAudit.tsx` (scroll mobile + badge quality_alert)
- Pas de migration SQL : `outreach_click_events` existe déjà.
- Pas de changement de messaging — uniquement instrumentation et UI.
