
User asks about the "1 signup in 3 days" challenge — needs automated agents + outbound emails to contractors to drive signups.

Looking at memory: there's already a massive outbound infrastructure (`outbound-autonomous-pipeline`, `outbound-aipp-automation`, `outbound-execution-pipeline`, `outbound-email-scheduling`, `outbound-ai-personalization`, `outbound-sms-fallback`). So the infrastructure exists. The question is: is it ACTIVATED and PRODUCING signups?

I should diagnose first, then propose a focused activation plan — not rebuild what exists.

Plan structure:
1. Diagnose current state (read-only checks already implied by memory)
2. Identify gaps preventing signups
3. Propose a "Signup Acceleration Pack" — a tight 72h activation playbook

Keep it concise.

# Challenge Signup Accelerator — Plan d'activation 72h

## Diagnostic à faire avant build
1. **État pipeline outbound** : combien de prospects en queue, combien d'emails envoyés ces 7 derniers jours, taux d'ouverture, taux de clic vers AIPP/landing
2. **Conversion funnel** : prospect_email_sent → email_clicked → AIPP_viewed → onboarding_started → signup
3. **Goulot identifié** : où s'arrête le funnel ? Email pas envoyé ? Pas ouvert ? Cliqué mais pas converti ?

## Hypothèse principale
L'infrastructure existe (AIPP automation, AI personalization, SMS fallback, scheduler 15min, autopilot waves) mais **n'est probablement pas en production active** ou **manque de prospects qualifiés en queue**.

## Build proposé — 4 agents autonomes orchestrés

### Agent 1 — `signup-hunter-agent` (toutes les 30 min)
- Scan `prospects` non contactés avec NEQ + email valide + AIPP score < 60
- Filtre par City × Activity matrix (zones haute demande)
- Approuve auto les prospects passing tous les checks (sinon → admin queue)
- Output : prospects prêts à recevoir séquence

### Agent 2 — `email-sequence-orchestrator` (toutes les 15 min)
- Active séquence 3-emails personnalisés Gemini (déjà existante)
- Email 1 : AIPP score reveal + revenue loss
- Email 2 (J+1) : "Votre concurrent X reçoit déjà des RDV"
- Email 3 (J+3) : Founder slot scarcity ("3 places restantes Montréal")
- Track open/click → trigger SMS fallback si 0 ouverture après 48h

### Agent 3 — `signup-conversion-agent` (temps réel sur événements)
- Détecte `aipp_viewed` sans signup après 2h → email "Vous avez vu votre score, prêt à activer ?"
- Détecte `onboarding_started` sans completion après 30 min → SMS + email rappel
- Détecte `plan_selected` sans paiement après 1h → email checkout reminder + appel possible

### Agent 4 — `daily-progress-reporter` (1×/jour 8h AM)
- Email résumé challenge à toi : signups jour, funnel breakdown, prochains prospects en queue, alertes (si taux ouverture < 20%)
- Push notif/SMS si 0 signup dans les 24h dernières heures

## Surfaces à brancher
- `/admin/challenge-tracker` — page dashboard temps réel : compteur signups (objectif: 1 en 3 jours), funnel live, prochains prospects à contacter, kill switch par agent
- Cron job pg_cron pour chaque agent
- Edge function `challenge-signup-orchestrator` qui coordonne les 4 agents

## Tables (additions minimales)
- `challenge_signup_events` : log des événements funnel (prospect_added, email_sent, aipp_viewed, signup_completed)
- `challenge_targets` : objectif (1 signup / 72h) + tracking progress
- Pas besoin de toucher aux tables outbound existantes

## Données mock vs réelles
- Si pipeline a déjà des prospects qualifiés → activation directe
- Si vide → agent peut tirer depuis `outbound_prospects` ou seed depuis `city_activity_matrix` (top 50 contractors Montréal/Québec/Laval haute demande)

## Hors scope (volontaire)
- Refonte des templates email (utiliser ceux existants AI-personalized)
- Nouveau provider email (utiliser infra outbound déjà en place)
- A/B testing avancé (priorité = LIVRER 1 SIGNUP)

## Questions avant build
Une seule clarification critique avant de partir :
- Veux-tu que je commence par **(A) diagnostic immédiat** du pipeline outbound actuel (lire les tables, voir où ça coince) avant de coder, ou **(B) build direct** des 4 agents + dashboard challenge tracker, en supposant que les prospects existent déjà en queue ?

Recommandation : **(A) diagnostic d'abord** — 5 min de lecture DB peut révéler que tout est déjà prêt et qu'il manque juste un cron à activer, ce qui éviterait un build inutile.
