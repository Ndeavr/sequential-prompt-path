## Inspection Only — Revenue Funnel Status (America/Toronto, 29 juil. 2026 13:40 EDT)

**⚠️ Note :** `v_launch_funnel` a expiré (timeout DB Supabase intermittent pendant l'inspection). Compteurs « aujourd'hui » ci-dessous dérivés de `v_first_dollar_tracker` + `v_pipeline_funnel_counts` (all-time) + observations directes. Marqué UNVERIFIED lorsque non prouvé.

### 1) Compteurs

| Étape | Aujourd'hui | All-time (`v_pipeline_funnel_counts`) |
|---|---|---|
| Scraped | UNVERIFIED | 263 |
| Contactable | UNVERIFIED | 260 |
| SMS envoyé | ≥1 (run actif à 15:56 UTC) | 27 |
| SMS livré | 0 (callback Twilio manquant) | 0 |
| Email envoyé | UNVERIFIED | n/a dans cette vue |
| Landing visits | 0 (aucun `first_click_at`) | n/a |
| Registration démarré/complété | 0 / 0 | outreach_queued 8 |
| OTP complété | UNVERIFIED | n/a |
| Stripe checkout ouvert | 0 aujourd'hui | payment_started 2 |
| $1 payé | 0 aujourd'hui | paid 1 (historique) |
| Contractor activé | 0 aujourd'hui | activated 0 |

### 2) Run actif (`v_first_dollar_tracker`)

- Prospect : **E.B. Plomberie inc.** (`816ccccf-…`)
- SID SMS : `SM91c8d48009ff9215033771be2671e6ca`
- Run démarré : `2026-07-29 15:56:11 UTC`
- `first_sms_sent_at` ✅ 15:56 UTC
- `first_delivery_at` ⛔ null → `telemetry_warning: delivery_callback_missing`
- `first_click_at` ⛔ null → **next_missing_milestone: First Click**
- `first_paid_at`, `first_contractor_activation_at`, `first_appointment_at` ⛔ null
- `attribution_warning: attribution_lead_missing` (aucun `contractor_lead_id` lié au prospect actif)

Note : l'ancienne cible « Electro Pompe » (`aa4ebd75…`) n'est plus le run actif ; nouveau prospect substitué.

### 3) Composants demandés — état vérifié dans le code

| # | Composant | État |
|---|---|---|
| 1 | `/admin/launch-control` | ✅ Déployé — route + lazy + nav (`router.tsx:1449`, `adminNav.ts:30`, `PageAdminLaunchControl.tsx` 10 573 o) |
| 2 | RevenueWall dans AdminLayout | ✅ Monté (`AdminLayout.tsx:17,180`) |
| 3 | Manual campaign Preview → Send Now | ⛔ **MANQUANT** — `src/components/admin/acquisition/CampaignLauncher.tsx` n'existe pas. Aucun composant « Preview → Send Now » trouvé |
| 4 | Manual activation backup | ⚠️ PARTIEL — `admin-create-contractor-manual`, `activate-contractor-plan` existent ; aucune fonction dédiée `admin-manual-activate` ni bouton UI trouvé sur Launch Control |
| 5 | SMS-failure email fallback | ✅ Implémenté dans `send-verified-batch/index.ts` (via `outreach-resend-send`, ligne 317) + fn `email-fallback-dispatch` déployée |
| 6 | Per-contractor timeline avec erreurs exactes | ✅ `supabase/functions/contractor-revenue-timeline/index.ts` + `RevenueTimelinePanel.tsx` (vérifié sessions antérieures) |
| 7 | Dead-lead quarantine | ✅ Logique de quarantaine présente dans `acquisition-queue-worker`, `send-verified-batch`, `_shared/acquisitionPipeline.ts` |
| 8 | Post-payment welcome + Alex start | ⚠️ UNVERIFIED — 4 webhooks Stripe existent (`stripe-webhook`, `stripe-unpro-webhook`, `stripe-isr-webhook`, `founder-stripe-test-flow`) mais l'enchaînement welcome-email + auto-Alex-start non inspecté cette session |
| 9 | Run Full Test E2E button | ⚠️ PARTIEL — fn `acq-full-test` déployée + invoke présent dans `PageAdminAcquisition.tsx:65` ; **pas de bouton sur `/admin/launch-control`** |

### 4) Ce qui est confirmé fonctionnel
- Envoi SMS Tier C (Canada sans LTI) — un vrai SMS parti aujourd'hui à 15:56 UTC vers E.B. Plomberie.
- Tracker ancré par identité (prospect_id + SID) — pas de fuite historique.
- Fallback email Resend câblé dans `send-verified-batch`.
- Launch Control + RevenueWall live.
- Timeline edge fn opérationnelle.

### 5) Ce qui manque / non implémenté
- Composant UI **CampaignLauncher** (Preview → Send Now).
- Bouton **Run Full Test** sur `/admin/launch-control` (existe seulement sur `PageAdminAcquisition`).
- Bouton **Activer manuellement** sur Launch Control (fonctions edge existent, pas de câblage UI vérifié).
- **Twilio StatusCallback** non configuré → aucun `delivered` n'arrive → `first_delivery_at` reste null.
- Lien `contractor_lead_id` ↔ `verified_contractor_prospects` pour le run actif (`attribution_lead_missing`).

### 6) Premier vrai bloqueur pour $1 aujourd'hui
**Aucun clic humain sur le lien SMS** envoyé à E.B. Plomberie à 15:56 UTC (`first_click_at = null`, `clicked all-time = 0`). Toute la chaîne aval (registration → OTP → Stripe → activation) est en attente de ce clic. Bloqueur secondaire non-bloquant : Twilio StatusCallback (empêche seulement la confirmation `delivered`, pas le clic).

### 7) Prochaine action opérateur unique
Confirmer par téléphone/canal direct que le destinataire d'E.B. Plomberie a reçu le SMS et l'inviter à cliquer le lien d'activation (contact humain de vérification) — c'est le seul geste qui débloque la suite du funnel sans envoyer de nouveau SMS ni changer de code.

---

*Aucun code modifié, aucun envoi effectué, aucune donnée créée pendant cette inspection.*