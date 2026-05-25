# Plan : Funnel Autonome Acquisition Entrepreneur

## Décisions actées
- **Source de vérité unique** : `outbound_*` (38 tables, 14 pages admin déjà construites)
- **Sources de données** : Firecrawl (déjà connecté) + Google Places (clé `GOOGLE_PLACES_API_KEY` à confirmer)
- **MVP de validation** : Isolation à Laval + Terrebonne, 100 prospects
- **Aucune nouvelle table** sauf vue d'unification (les 38 tables outbound suffisent)

## Architecture cible (chaîne unique)

```text
[1] Scrape Google Places (trade+city) ─► outbound_companies
       │
[2] Firecrawl enrich site web ─────────► outbound_lead_enrichment
       │
[3] AIPP Score (réutilise aipp-real-scan) ► outbound_ai_scores
       │
[4] Personnalisation Gemini ───────────► outbound_ai_personalizations
       │
[5] Approval gate (existant) ──────────► outbound_approvals
       │
[6] Email + SMS via process-outbound-queue ► outbound_send_logs
       │
[7] Landing /pro/diagnostic/:slug (existe en partie) ► outbound_clicks
       │
[8] Alex onboarding (existe : contractor-onboarding) ► contractor_onboarding_sessions
       │
[9] Stripe checkout (existe : create-contractor-checkout) ► contractor_subscriptions
       │
[10] AIPP profil publié (existe : aipp_profiles) ► /ai-indexed-profiles/:slug
```

## Livraison (3 phases courtes)

### Phase A — Orchestrateur unique (cette session)
1. **Edge function `autopilot-mvp`** : orchestre les 10 étapes sur un batch de prospects (paramètres : `trade`, `cities[]`, `limit`, `dry_run`)
   - Étape 1-2 : appelle Google Places + Firecrawl, insère dans `outbound_companies` + `outbound_lead_enrichment`
   - Étape 3 : appelle `aipp-real-scan` existant, stocke dans `outbound_ai_scores`
   - Étape 4 : appelle Gemini via Lovable AI Gateway, stocke dans `outbound_ai_personalizations`
   - Étape 5-6 : pousse vers `outbound_approvals` (gate humain) puis queue
   - Logging unifié dans `outbound_pipeline_errors` + `outbound_run_stage_transitions`
2. **Page `/admin/autopilot-mvp`** : 1 écran cockpit
   - Sélecteur trade (10 métiers prioritaires)
   - Sélecteur villes (Laval, Terrebonne précochés)
   - Slider `limit` (10-200)
   - Toggle `dry_run`
   - Bouton **Lancer**
   - Timeline temps réel des étapes (realtime sur `outbound_run_stage_transitions`)
   - KPI : scraped / scored / approved / sent / clicked / paid

### Phase B — Glue manquante (cette session)
1. **Page publique `/pro/diagnostic/:slug`** (créer si absente)
   - Score AIPP + faiblesses + revenu perdu
   - Aperçu profil futur
   - CTA "Activer mon profil"
   - Alex orb pré-contextualisé
2. **Connecter post-paiement → AIPP auto-publish**
   - Webhook Stripe existant (`activate-contractor-plan`) déclenche création `aipp_profiles` + `aipp_pages` automatique
   - Aucune nouvelle fonction, juste ajouter le lien dans `activate-contractor-plan`

### Phase C — Migration de données (différée, après preuve MVP)
- Migration `acq_*` + `prospect_*` + `sniper_*` → `outbound_*`
- Deprecation flags sur anciennes tables
- À planifier après 10 conversions payées via Phase A+B

## Migrations SQL (Phase A)
1 seule migration légère :
- `outbound_companies` : ajouter `trade`, `google_place_id`, `google_rating`, `google_review_count`, `rbq_number`, `neq_number` si absents
- Index sur `(trade, city, status)` pour le cockpit
- Vue `v_autopilot_pipeline` agrégant les KPI temps réel

## Risques traités
- **Pas de duplication** : on réutilise `aipp-real-scan`, `create-contractor-checkout`, `activate-contractor-plan`, queue d'envoi existante
- **RLS** : `autopilot-mvp` exige `has_role(uid, 'admin')`, profile public RLS = `public_status = 'published'`
- **Légal scraping** : Google Places API + sites publics uniquement, logging provenance dans `outbound_companies.source_url`
- **Approval gate** : aucun email envoyé sans validation humaine en MVP (toggle `auto_approve` désactivé par défaut)

## Critères de succès Phase A+B
- Admin clique "Lancer" → 100 prospects isolation Laval+Terrebonne scrapés + scorés en <10 min
- 10 prospects approuvés manuellement → emails envoyés
- 1 prospect clique → landing /pro/diagnostic/:slug s'affiche avec son score
- 1 prospect ouvre Alex → onboarding → Stripe → profil AIPP publié sur `/ai-indexed-profiles/:slug` automatiquement

## Hors scope (volontairement)
- Migration des 4 systèmes legacy (Phase C)
- SMS Twilio (la queue existe, on l'active si Twilio est connecté ; sinon email-only)
- 10 métiers × tout le Québec (on prouve avec 1 métier × 2 villes)

---

**Confirme et je commence Phase A : migration légère + edge function `autopilot-mvp` + page `/admin/autopilot-mvp`.**
