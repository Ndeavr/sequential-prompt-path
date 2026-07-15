
# Plan — Vraies entreprises, vraies coordonnées, premier lot réel

Objectif unique : passer de « 190 fiches douteuses » à « 10 prospects irréprochables → 10 vrais SMS → premier paiement 1 $ ». Aucun nouveau dashboard tant que le premier lot n'est pas parti.

## Étape 1 — Geler les placeholders (aucune suppression)

Migration Supabase :

- Ajouter sur `contractor_leads` :
  - `data_status text` — `verified | needs_enrichment | invalid | duplicate | archived_placeholder`
  - `sms_eligible boolean default false`
  - `archived_reason text`, `archived_at timestamptz`
- SQL de gel massif (une seule passe, réversible) — passe en `archived_placeholder` + `sms_eligible=false` toute ligne où :
  - `phone` contient `555` (regex `\+?1?[- ]?\(?\d{3}\)?[- ]?555[- ]?\d{4}`)
  - `source_url IS NULL` ET pas de `google_place_id`
  - `city` absente ou non dans la liste blanche des villes cibles
  - `business_name` généré (préfixes seed connus : `Toit-Vert Éco`, `ToitStar`, `Pro-Toit Montérégie`, `Isolation Nord-Sud`, `CouvertureXL`, `Toitures Lanaudière`, `Toiture 360`, `Réno-Toit` **si** téléphone en 450-555…)
- Vue `v_active_leads` = `WHERE data_status <> 'archived_placeholder'` — toutes les stats basculent dessus.

## Étape 2 — Nouvelle table propre `verified_contractor_prospects`

Table dédiée, ne réutilise pas la table corrompue comme source d'envoi.

Colonnes clés :
`id, business_name, legal_name, category, website_url, google_business_url, google_place_id, phone_primary, phone_secondary, phone_e164, phone_line_type, phone_validation_status, sms_eligible, email, street_address, city, postal_code, service_areas text[], rbq_number, verification_status, data_quality_score int, source_urls jsonb, phone_source_url, email_source_url, address_source_url, rbq_source_url, verified_at, last_enriched_at, outreach_status, created_at, updated_at`.

GRANT + RLS admin-only. Index sur `(data_quality_score desc)`, `(sms_eligible, outreach_status)`, unique partiel sur `phone_e164 WHERE phone_e164 IS NOT NULL`.

## Étape 3 — Edge Functions d'enrichissement réel

### `enrich-contractor-from-official-site`
Entrée : `{ business_name, website_url, known_city?, known_phone? }`.
- Fetch homepage + `/contact`, `/nous-joindre`, `/contactez-nous`, `/a-propos`, `/about` (max 6 pages, timeout 8s chacune).
- Parse : `tel:`, `mailto:`, adresse (regex QC postal `[A-Z]\d[A-Z] ?\d[A-Z]\d`), RBQ (`\d{4}-\d{4}-\d{2}`), villes desservies, logo (`og:image`/`link rel=icon`), horaires, services.
- Priorité conflit : **site officiel > Google Business > registre > secondaire**.
- Écrit dans `verified_contractor_prospects` avec `*_source_url` renseigné pour chaque champ. Ne jamais inventer un champ absent.

### `validate-contractor-phone`
- Normalise E.164 (`+1…`), rejette non-CA.
- Appelle **Twilio Lookup v2** (`line_type_intelligence`) — déjà connecté au projet.
- Écrit : `phone_e164`, `phone_line_type` (`mobile|landline|voip|nonFixedVoip`), `phone_validation_status` (`valid_mobile | valid_sms_capable_voip | landline | invalid | disconnected | unverified`).
- Règle SQL : `sms_eligible = phone_validation_status IN ('valid_mobile','valid_sms_capable_voip')`.
- Ligne fixe → bascule en canal email + tag `needs_secondary_phone`.

### `deduplicate-contractors`
- Clés de fusion : nom normalisé (accents strip, `inc/ltée/enr` retiré), domaine web, `phone_e164`, email, `google_place_id`, RBQ.
- Fusionne : conserve la fiche au meilleur `data_quality_score`, migre `source_urls` (jsonb merge), historise dans `contractor_dedupe_log`. Jamais 2 SMS à la même entité.

### `score-contractor-quality`
`data_quality_score` = +20 site officiel + 20 tél. confirmé + 15 email + 15 adresse + 10 GBP + 10 RBQ (ou non requis) + 10 services/zones. Seuils : ≥70 outreach, 50–69 enrichissement, <50 no-contact.

## Étape 4 — Seed manuel de 10 prospects réels

Pas d'invention. Migration qui insère 10 fiches à partir de recherches vérifiables (site officiel + GBP), catégories/villes prioritaires listées par l'utilisateur. Exemple confirmé par capture :

```
Réno-Toit — Mirabel — +15147948648 / +14504301999 — info@reno-toit.com — reno-toit.com — verified
```

Chaque ligne insérée passe ensuite obligatoirement par `enrich-contractor-from-official-site` + `validate-contractor-phone` + `score-contractor-quality`. Aucune n'entre `verified` sans `business_name + (phone_primary|email) + city + source_url`.

## Étape 5 — Écran Conversion Truth honnête (édit minimal)

Sur `/admin/conversion-truth`, remplacer la carte « Leads 190 » par un edge `conversion-truth-real-numbers` qui lit `v_active_leads` + `verified_contractor_prospects` :

- Anciennes fiches (190)
- Archivées comme non fiables (X)
- Vraies entreprises confirmées (X)
- Mobiles SMS valides (X)
- Emails valides (X)
- À enrichir / Invalides
- SMS envoyés / livrés / cliqués / activations 1 $

Toutes les cartes activation restent identiques ; seule la source change (`v_active_leads`).

## Étape 6 — Page `/admin/verified-contractors`

Une seule page, lecture de `verified_contractor_prospects`. Colonnes demandées + actions ligne : Voir source, Réenrichir, Valider, Corriger, Fusionner, Exclure, Envoyer SMS, Envoyer email, Ouvrir landing. La colonne statut affiche la vraie raison (Données non vérifiées / Numéro invalide / Ligne fixe / Email dispo / Prêt / Envoyé / Livré / Échec Twilio / Cliqué / Activé 1 $) — jamais « SMS non envoyé par Twilio » seul.

## Étape 7 — Premier lot réel de 10 SMS

Bouton « Envoyer lot réel (10) » sur `/admin/verified-contractors`. Filtre serveur strict :

```
data_quality_score >= 80
AND sms_eligible = true
AND outreach_status IS NULL
AND phone_e164 IS NOT NULL
AND website_url IS NOT NULL
AND NOT EXISTS (membre UNPRO)
```

Edge `send-verified-batch` :
1. Génère `prospect_token` unique → `/unpro/activate/{token}`
2. Envoie via Twilio existant, stocke `twilio_sid`, écoute webhook livraison (déjà en place)
3. Template SMS (variante A demandée) :
   > Bonjour {{first_name_or_business_name}}, UNPRO a préparé gratuitement un profil pour {{business_name}}… Les 10 premières entreprises peuvent l'activer pour 1 $ : {{tracked_link}}
4. Landing `/unpro/activate/:token` (page existante `PageProLandingNuclearClose`) — pré-remplie avec les vraies données de la fiche (nom, logo, services, ville, tél, RBQ). Aucune donnée fictive.

Pas d'envoi automatique 25/50 tant que les 10 premiers n'ont pas confirmé livraison + au moins 1 clic.

## Étape 8 — Interdictions codifiées (garde-fous CI)

- Trigger SQL `verified_contractor_prospects_before_insert` : refuse `phone_primary ~ '555'`, refuse `source_url IS NULL` pour `verification_status='verified'`.
- Trigger `send-verified-batch` : `raise exception` si `sms_eligible=false` ou `phone_line_type='landline'`.
- Test unit : `docs/tests/no-placeholder-data.test.ts` scanne les seeds pour préfixes interdits.

## Détails techniques

- **Twilio Lookup v2** : appel via connecteur Twilio existant, endpoint `/v2/PhoneNumbers/{E164}?Fields=line_type_intelligence`.
- **Scraping site officiel** : `fetch` côté edge, User-Agent explicite `UNPRO-Enrichment/1.0`, respect `robots.txt` best-effort, cache 24h dans `contractor_enrichment_cache`.
- **Dédup** : normalisation nom via `regexp_replace(lower(unaccent(name)), '\s+(inc|ltée|ltee|enr|srl)\.?$', '')`.
- **Tables auxiliaires** : `contractor_dedupe_log`, `contractor_enrichment_cache`, `verified_prospect_tokens` (token → prospect_id).
- **RLS** : toutes tables admin-only, edge functions en `service_role`.

## Fichiers touchés

Créés :
- `supabase/migrations/<ts>_verified_prospects_and_freeze.sql`
- `supabase/functions/enrich-contractor-from-official-site/index.ts`
- `supabase/functions/validate-contractor-phone/index.ts`
- `supabase/functions/deduplicate-contractors/index.ts`
- `supabase/functions/score-contractor-quality/index.ts`
- `supabase/functions/send-verified-batch/index.ts`
- `supabase/functions/conversion-truth-real-numbers/index.ts`
- `src/pages/admin/AdminVerifiedContractors.tsx`
- `src/hooks/useVerifiedProspects.ts`

Édités (minimal) :
- `src/pages/admin/AdminConversionTruth.tsx` — source = edge real-numbers
- `src/app/router.tsx` — route `/admin/verified-contractors`
- `src/pages/pro-landing/PageProLandingNuclearClose.tsx` — lecture par `prospect_token` sur `verified_contractor_prospects`

## Non touchés

Parcours entrepreneur, Alex, checkout Stripe, orchestrateurs, design system, feature flags.

## Critères de succès

1. `data_status='archived_placeholder'` pour toute fiche 555 / sans source / ville invalide.
2. `verified_contractor_prospects` contient ≥10 entreprises réelles avec `data_quality_score ≥ 80`.
3. `/admin/conversion-truth` n'affiche plus « 190 Leads » comme métrique principale.
4. Un batch de 10 SMS Twilio réels envoyé, `twilio_sid` en base, webhook livraison reçu.
5. ≥1 clic tracké → landing personnalisée réelle → activation 1 $ passe de bout en bout.

Aucun autre dashboard, aucune autre feature avant que ces 5 critères soient verts.
