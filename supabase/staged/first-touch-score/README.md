# Score de visibilité IA UNPRO dans le premier contact — STAGED (non déployé)

Statut : préparé et testé hors des dossiers Edge actifs. Aucun envoi, aucun déploiement.

## Ce que ça change une fois appliqué
- `send-verified-batch` cite « Votre score de visibilité IA UNPRO est de XX/100 (calcul UNPRO du <date>…) »
  dans le premier SMS (et le courriel forcé par un opérateur) **seulement** si `firstTouchScore.ts` accepte
  une ligne `ai_recommendation_audits` : même `prospect_id`, `baseline.matched.prospect_id` identique,
  source ancrée par identifiant (`outreach_first_touch` | `outreach_precompute`), `completed`, entier 0–100, ≤ 30 jours.
- Sinon, à l'envoi réel seulement : pré-calcul via le moteur existant `ai-recommendation-audit`
  (`kind=prospect`, id exact, lecture BDD uniquement, aucun service payant), validé par les mêmes règles.
  Échec → message v2 actuel, sans score ni « nous avons analysé ».
- `dry_run` : lecture seule (aucun pré-calcul, aucune écriture, aucun fournisseur).
- Trace : `first_touch_score` (score, audit_id, date, source ou raison du refus) dans les métadonnées `sendSms`
  et l'événement `sms_sent`/`email_sent`. Lien `/unpro/audit/:token` et attribution inchangés.
- Un texte personnalisé contenant « score », « /100 », « note », ChatGPT ou OpenAI est refusé.
- Non utilisés : `data_quality_score`, `acquisition_score`, priorité commerciale, `ai_visibility_reports`.

## Appliquer (après approbation explicite de déploiement)
1. `cp supabase/staged/first-touch-score/firstTouchScore.ts supabase/functions/_shared/firstTouchScore.ts`
2. Appliquer `first-touch-score.patch` (`patch -p1 < …`) ; refuser si une section ne s'applique plus.
3. `npx vitest run src/test/first-touch-verified-score.test.ts` puis repointer l'import du test vers `_shared`.
Tous les garde-fous existants (gate OUTREACH, CASL revue humaine, STOP, plafond 25/jour, doublons 72 h, idempotence) restent inchangés.
