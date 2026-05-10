# UNPRO — Launch Checklist

## Paiement & activation (Phase A)
- [ ] Stripe en mode **live** (PK `pk_live_Gw47doir5ZX9n9uM0nrBpKro` confirmée)
- [ ] Webhook Stripe configuré: `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/stripe-webhook`
- [ ] Events souscrits: `checkout.session.completed`, `checkout.session.expired`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `STRIPE_WEBHOOK_SECRET` configuré dans les secrets
- [ ] Test bout-en-bout: plan-recommendation → checkout → contractor `status=active` + email bienvenue reçu
- [ ] Bouton "Gérer mon abonnement" → `create-billing-portal` fonctionnel

## Outbound & acquisition (Phase B)
- [x] Source `rbq` supportée dans `outbound_prospects` (colonne `source` existante, valeur `"rbq"`)
- [x] Edge function `scrape-rbq-leads` déployée (POST `{ leads: RbqLead[], dry_run? }`)
- [x] Mode "Registre RBQ" dans `/admin/import-prospects` avec mapping catégories
- [ ] Test bout-en-bout: CSV RBQ → import → enrichissement → AIPP → outreach

## Production hardening (Phase C)
- [x] Page 404 FR (`PageSafeFallbackRedirect`)
- [x] Observability hook (`src/lib/observability.ts`) — actif si `VITE_SENTRY_DSN` défini + `@sentry/react` installé (reporté post-launch)
- [x] `robots.txt` configuré (Disallow zones privées, Sitemap déclaré)
- [x] Sitemap dynamique via edge functions `sitemap-xml` / `seo-index-domination`
- [ ] Sitemap soumis à Google Search Console (`https://unpro.ca/sitemap.xml`)
- [ ] Sentry activé en production (reporté — ajouter `@sentry/react` + `VITE_SENTRY_DSN` quand les flux core sont stables)

## Email & deliverability
- [x] Templates Resend: `entrepreneur-welcome`, `payment-success`, `payment-failed`
- [x] `send-transactional-email` accepte appels server-to-server (service role)
- [ ] SPF / DKIM / DMARC vérifiés via `/admin/outbound/email-health`
- [ ] Domaine `notify.unpro.ca` warmé

## Alex & voix
- [x] Voice agent ID locked: `UJCi4DDncuo0VJDSIegj` (FR only)
- [x] Opening + English fallback line conformes à la memory
- [ ] Test d'auto-start sur landings entrepreneur en prod

## Conformité
- [x] TPS/TVQ via Stripe Tax
- [x] Lien désabonnement (CASL) dans templates outbound
- [ ] Politique de confidentialité publiée
- [ ] Conditions d'utilisation publiées
