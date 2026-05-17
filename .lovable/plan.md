# Live Run — Zero Simulation, Bout en Bout

Aujourd'hui le cockpit `/admin/live-runs` tombe en mode "simulé" parce que `TWILIO_PHONE_NUMBER` / `TWILIO_FROM` ne sont pas configurés (seul `TWILIO_MESSAGING_SERVICE_SID` est dispo), et la chaîne `SMS → click → checkout → payment → activated` n'est jamais bouclée automatiquement. On corrige tout.

## Objectif
Un seul clic admin → vrai SMS Twilio au prospect → vrai checkout Stripe 1$ → vrai paiement → activation marquée. Aucune étape simulée, aucun fallback silencieux.

## Changements

### 1. `approve-isr-sms` — vrai SMS, jamais simulé
- Utiliser `TWILIO_MESSAGING_SERVICE_SID` (déjà dans les secrets) comme alternative à `From` (priorité : `MessagingServiceSid` si présent, sinon `From`).
- Supprimer le fallback `{ simulated: true }`. Si Twilio n'est pas configuré OU l'envoi échoue → retourner 502 avec message clair (`twilio_not_configured` / message d'erreur Twilio).
- Logger `sid` réel Twilio dans `acquisition_run_steps`.

### 2. `create-isr-promo-checkout` — déjà live
- Aucune modif fonctionnelle. Confirmer que `STRIPE_SECRET_KEY` est en mode live (vérifier préfixe `sk_live_`). Si test, prévenir l'admin via badge cockpit.

### 3. Nouveau webhook `stripe-isr-webhook`
- Écoute `checkout.session.completed`.
- Filtre `metadata.source === "sms_live_run"`.
- Upsert dans `acquisition_run_steps` :
  - `payment_completed` (status succeeded, sid session)
  - `activated` (status succeeded)
- Update `live_acquisition_runs.status = "succeeded"`.
- Update `war_prospects.status = "activated"` + `activated_at`.
- Pas de `verify_jwt` (config function block `verify_jwt = false`).
- Demander à l'admin de coller le webhook signing secret → `add_secret STRIPE_ISR_WEBHOOK_SECRET`.

### 4. Tracking `link_clicked` + `plan_viewed`
- Page `/pro/:slug` : si query `?r=<run_id>` présent, fire-and-forget `supabase.functions.invoke("log-isr-event", { run_id, step: "link_clicked" })`.
- Au scroll/affichage du bloc plans : même chose pour `plan_viewed`.
- Nouveau edge function `log-isr-event` (public, no auth) : upsert step succeeded.
- `run-live-acquisition` : injecter `?r=<run_id>` dans `landing_url` et `trackingLink` du SMS body.

### 5. Cockpit `/admin/live-runs` — bouton "Run live de A à Z"
- Nouveau bouton primaire `Lancer le run live complet` qui chaîne automatiquement :
  1. `run-live-acquisition` (création + draft)
  2. `approve-isr-sms` `dry_run=false` (envoi prospect réel, après confirmation modale `confirm_phone`)
- Plus de bouton "Dry-run" mis en avant ; déplacer en bouton secondaire `Test SMS sur mon numéro` (optionnel pour QA).
- Garder `confirmPhone` requis (sécurité) mais auto-remplir avec `run.metadata.sms_to` après aperçu humain.
- Badge live/test sur `STRIPE_SECRET_KEY` (lecture via edge function `stripe-mode-check`).
- Polling steps toutes les 4s tant que le run n'est pas `succeeded` ou `failed`, pour voir `link_clicked → plan_viewed → checkout_started → payment_completed → activated` arriver en temps réel.

## Détails techniques

### Twilio body (modifié)
```ts
const body: Record<string, string> = { To: targetPhone, Body: smsBody };
const messagingSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
if (messagingSid) body.MessagingServiceSid = messagingSid;
else if (twilioFrom) body.From = twilioFrom;
else throw new Error("twilio_not_configured: set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER");
```

### Webhook signature
- Utiliser `stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_ISR_WEBHOOK_SECRET)`.
- `supabase/functions/stripe-isr-webhook/index.ts` + entrée `[functions.stripe-isr-webhook] verify_jwt = false` dans `supabase/config.toml`.

### Steps order (rappel)
```text
1 search → 2 extracted → 3 aipp → 4 page → 5 sms_drafted →
6 sms_approved → 7 sms_sent → 8 link_clicked → 9 plan_viewed →
10 checkout_started → 11 payment_completed → 12 activated
```

## Fichiers touchés
- `supabase/functions/approve-isr-sms/index.ts` (modif)
- `supabase/functions/run-live-acquisition/index.ts` (ajout `?r=` dans landing_url)
- `supabase/functions/stripe-isr-webhook/index.ts` (nouveau)
- `supabase/functions/log-isr-event/index.ts` (nouveau)
- `supabase/functions/stripe-mode-check/index.ts` (nouveau, mini)
- `supabase/config.toml` (verify_jwt=false pour webhook + log-isr-event)
- `src/pages/admin/PageAdminLiveRuns.tsx` (bouton "Run live complet", polling, badge mode Stripe)
- `src/pages/pro/[slug]` (ou équivalent) : tracking `link_clicked` / `plan_viewed`
- Secret à ajouter : `STRIPE_ISR_WEBHOOK_SECRET`

## Succès
- Admin clique 1 fois, prospect reçoit un vrai SMS Twilio (sid loggé), clique le lien, voit la page, paie 1$ Stripe en vrai, et le cockpit affiche les 12 étapes vertes en temps réel — sans aucune mention "(simulé)".
