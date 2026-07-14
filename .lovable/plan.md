
# Audit du funnel d'acquisition — lecture seule

Objectif : ne rien reconstruire. Produire un rapport unique qui montre où le premier entrepreneur payé est bloqué, à partir des données déjà en base.

## Portée stricte

- Aucune migration.
- Aucun nouveau design, aucune nouvelle fonctionnalité produit.
- Aucun changement à Stripe, Twilio, ni aux pages publiques.
- Une seule route admin ajoutée : `/admin/funnel-audit`.
- Un edge function en lecture seule qui agrège les 30 derniers jours.

## Livrables

1. **Edge function `funnel-audit-report`** (read-only, service_role)
   Retourne un JSON avec, pour chaque étape des 30 derniers jours :
   - `count`
   - `conversion_from_previous` (%)
   - `drop_from_previous` (%)
   - `last_occurrence_at`
   - `top_error` `{ code, message, count }`
   - `sample_ids` (5 max, pour spot-check)

   Étapes couvertes (nom → source) :
   ```text
   scraped              → launch_leads / contractor_prospects (created_at)
   mobile_valid         → launch_leads.phone présent + normalisable mobile QC
   email_present        → launch_leads.email non nul
   excluded_aggregators → launch_leads (source/domain in liste agrégateurs)
   sms_queued           → sms_events_v2.status='queued'
   sms_sent             → sms_events_v2.status='sent'
   sms_delivered        → sms_events_v2.status='delivered'
   sms_failed           → sms_events_v2.status in ('failed','undelivered')
   link_clicked         → contractor_funnel_events.event_type in
                          ('sms_clicked','link_clicked')
   landing_view         → contractor_funnel_events.event_type in
                          ('landing_view','landing_viewed','landing_viewed_first_dollar')
   alex_started         → contractor_funnel_events.event_type='alex_started'
   signup_started       → event_type in ('registration_started','signup_started','profile_started')
   signup_completed     → event_type in ('registration_completed','signup_completed')
   checkout_opened      → event_type in ('checkout_started','stripe_checkout_opened')
   payment_success      → event_type in ('payment_success','stripe_payment_success','payment_succeeded')
                          + fallback launch_leads.lead_status in ('PAID','ACTIVATED')
   activated            → event_type in ('activation_completed','contractor_activated','activated')
                          + fallback launch_leads.lead_status='ACTIVATED'
   recommendable        → contractors.status='active' AND is_recommendable=true
                          (fallback: contractor_profiles complet + plan actif)
   ```
   Prefill check séparé : sur un échantillon des 20 derniers `signup_started`, vérifier si `contractor_prospects` a `business_name / phone / category / city` → renvoyer `prefill_coverage_pct`.

2. **Page `/admin/funnel-audit`** (`src/pages/admin/AdminFunnelAudit.tsx`)
   - Tableau vertical des étapes avec : nombre, %, drop-off, dernière occurrence relative, erreur dominante.
   - Bandeau rouge : « Plus grand drop-off : {étape} (−X%) » calculé côté client.
   - Card « Couverture préremplissage » avec % + 3 exemples anonymisés.
   - Card « Derniers SMS livrés / échoués (7j) » : compte queued/sent/delivered/failed/undelivered.
   - Aucun graphique fancy, du texte lisible dans le thème admin sombre existant.
   - Bouton « Rafraîchir » (invalide le query).

3. **Hook `useFunnelAudit`** (`src/hooks/useFunnelAudit.ts`)
   - `useQuery` sur l'edge function, `refetchInterval: 60_000`.

4. **Entrée sidebar admin** (une ligne dans le registry admin existant) — pas de refonte de nav.

## Détails techniques

- Edge function : Deno, import `https://esm.sh/@supabase/supabase-js@2.49.1`, CORS via `npm:@supabase/supabase-js@2/cors`, garde admin via `has_role(auth.uid(),'admin')`.
- Fenêtre : `now() - interval '30 days'`, paramétrable par query `?days=30`.
- Aucune écriture DB. Aucune notification. Aucun webhook touché.
- Erreurs dominantes : agrégation `event_type` + `metadata->>'error_code'` (ou `sms_events_v2.error_code`) par étape, `ORDER BY count DESC LIMIT 1`.

## Critères de succès

- `/admin/funnel-audit` affiche 15 lignes de chiffres réels lus depuis la base.
- Le plus gros drop-off est identifié explicitement (bandeau).
- Chaque étape montre : count, %, dernière occurrence, top erreur.
- Aucun fichier de design public modifié, aucune migration créée.
