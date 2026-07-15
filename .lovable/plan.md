# Autonomous Revenue Engine — jusqu'au premier 1 $

Objectif unique : passer d'un système bloqué par `sms_not_eligible` à un moteur auto-diagnostiquant, auto-réparant, qui continue jusqu'à la première activation payée. Aucune nouvelle UI avant que la boucle envoie réellement.

## 1. Logique d'éligibilité SMS revue (débloque Réno-Toit)

Nouvelle colonne `sms_eligibility_tier` sur `verified_contractor_prospects` :
- `A` — `line_type = mobile` → SMS auto
- `B` — `line_type = voip` capable → SMS auto
- `C` — `line_type in ('unknown', null)` MAIS `verification_status = verified` ET `data_quality_score >= 80` ET (email OU phone extrait du site officiel) → `sms_eligibility_confidence = high`, SMS auto sous quota
- `D` — landline confirmé → email only

`send-verified-batch` accepte désormais A + B + C. Le filtre `sms_eligible = true` est remplacé par `sms_eligibility_tier in ('A','B','C')`.

## 2. File d'attente d'acquisition unifiée

Nouvelle table `acquisition_queue` :
- `prospect_id`, `state` (`new` → `verified` → `ready_sms` / `ready_email` → `contacted` → `clicked` → `activated` / `failed`)
- `next_action_at`, `attempt_count`, `last_error`, `channel`
- Transitions via `src/lib/reliability/stateMachine.ts` (canonique, jamais silencieuses)

Cron `*/5 * * * *` déclenche `acquisition-queue-worker` qui traite le prochain prospect disponible. Jamais bloqué par un échec unitaire.

## 3. Auto-réparation (max 3 tentatives par échec)

Nouvelle table `acquisition_repair_log` : `error`, `root_cause`, `repair_attempt`, `repair_result`, `timestamp`.

Escalade automatique quand une étape échoue :
1. Ré-enrichissement (rescrape site officiel)
2. Recherche téléphone alternatif (about, contact, mentions légales)
3. Bascule email
4. Génération landing personnalisée + email
5. Follow-up email J+2

Si taux de livraison SMS < 10 % sur 24 h → bascule automatique du batch en canal email.

## 4. Framework d'expérimentation

Nouvelle table `outreach_experiments` :
- `variant`, `channel`, `sent`, `delivered`, `clicked`, `activated`, `cost_cents`, `revenue_cents`
- Vue `v_experiment_winners` avec score bayésien simple

Le worker choisit la variante gagnante automatiquement (>3 clics minimum, sinon rotation équilibrée).

## 5. First Revenue Mode

Flag global `FIRST_REVENUE_MODE = true` (dans `src/lib/launch/founderMode.ts` ou table `system_state`). Effets :
- Priorité totale : contractors vérifiés (site + tél + email) → outreach immédiat
- Désactive les gates de perfection (score parfait, ligne 100 % mobile)
- KPI unique remonté au sommet : `paid_activation_count`

Se coupe automatiquement dès `paid_activation_count >= 1` et déclenche un rapport `first_revenue_incident_report`.

## 6. Revenue Command Center (remplace le compteur "Prospects verified")

Nouvelle page `/admin/revenue-progress` (ou refonte du header de `/admin/verified-contractors`) — affichage seul, aucune nouvelle logique :
- Verified companies
- Ready for SMS (A+B+C)
- Ready for Email
- Contacted / Delivered / Clicked
- **Activated** (KPI principal)
- Revenue $ + progression vers premier 1 $

## 7. Périmètre exclu

- Pas de refonte landing, Alex, Stripe, matching, scoring IA
- Pas de nouveau dashboard tant qu'aucun SMS réel n'est parti
- Pas d'ajout d'overrides manuels

## Détails techniques

**Migration :**
- `verified_contractor_prospects` : ajouter `sms_eligibility_tier` (`A|B|C|D|null`), `sms_eligibility_confidence` (`low|medium|high`)
- Trigger : recalcul du tier à chaque update de `line_type`/`data_quality_score`/`verification_status`
- Nouvelles tables : `acquisition_queue`, `acquisition_repair_log`, `outreach_experiments` + GRANT + RLS admin-only
- Vue `v_revenue_progress` agrégée

**Edge Functions :**
- `send-verified-batch` : nouveau filtre tiers, log expérience, incrémente `sent`
- `acquisition-queue-worker` (nouveau) : boucle FSM, appelle enrich/validate/send, écrit repair_log, respecte quota
- `first-revenue-report` (nouveau) : déclenché sur premier `activated`

**Frontend :**
- `useVerifiedProspects` : afficher `sms_eligibility_tier` + raison
- Nouveau bandeau Revenue Progress en tête de `/admin/verified-contractors`

**Critère d'arrêt du chantier :**
Au moins 1 SMS réel envoyé automatiquement par le worker à Réno-Toit (tier C) via le nouveau filtre, et queue en progression continue sans intervention. La boucle continue ensuite jusqu'au premier `activated`.
