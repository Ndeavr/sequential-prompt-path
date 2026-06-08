
# Remplacement de la séquence outbound active — Approche "Visibilité IA"

## Objectif
Remplacer la séquence email actuellement par défaut (`Séquence Entrepreneur FR — ChatGPT`, 4 étapes email) par la nouvelle approche basée sur la curiosité IA, en **SMS principal** + **email backup**.

## État actuel
- Séquence active par défaut: `b0000001-0000-0000-0000-000000000001` — channel `email`, 4 steps (J0/J3/J7/J12).
- Tables utilisées: `outbound_sequences` (champ `channel` unique par séquence) + `outbound_sequence_steps` (`subject_template`, `body_template`, `delay_days`).
- Variables disponibles dans le moteur de rendu: `{{first_name}}`, `{{company_name}}`, `{{city}}`, `{{specialty}}` (déjà câblées dans le sender courant).
- Infra Twilio SMS et email queue déjà actives (cf. mem://outbound/email-scheduling et Outbound Execution Pipeline).

## Migration (1 seule migration SQL)

1. **Désactiver l'ancienne séquence**
   - `UPDATE outbound_sequences SET is_default=false, is_active=false WHERE id='b0000001-0000-0000-0000-000000000001'`.
   - Aucune purge — les messages déjà envoyés gardent leur FK.

2. **Créer la nouvelle séquence SMS principale**
   - `sequence_name`: `Visibilité IA — SMS J1/J3/J7`
   - `channel`: `sms`, `sequence_type`: `entrepreneur`, `language`: `fr`, `is_default`: `true`, `is_active`: `true`.
   - 3 steps (subject_template `NULL` car SMS):

   ```
   J1  Direct      — "Bonjour {{first_name}}, aimeriez-vous que {{company_name}} soit recommandée
                      quand un propriétaire demande à ChatGPT, Google Gemini ou UNPRO
                      « Quel est le meilleur entrepreneur en {{specialty}} à {{city}} ? »
                      Répondez OUI et je vous montre votre visibilité actuelle gratuitement."
   J3  Curiosité   — "Question rapide. Si quelqu'un demande aujourd'hui à ChatGPT « Qui recommandez-vous
                      pour {{specialty}} à {{city}} ? », est-ce que {{company_name}} apparaît parmi
                      les recommandations ? Je peux vérifier gratuitement pour vous."
   J7  FOMO        — "L'IA influence déjà les décisions de milliers de propriétaires. Aimeriez-vous
                      savoir si {{company_name}} est visible quand des clients demandent un
                      entrepreneur en {{specialty}} dans votre région ? Répondez OUI."
   ```

3. **Créer la séquence email backup**
   - `sequence_name`: `Visibilité IA — Email Backup`
   - `channel`: `email`, `is_default`: `false`, `is_active`: `true`.
   - 3 steps (J1/J3/J7) reprenant les corps SMS adaptés en email court, rotation des 5 objets fournis:
     - J1: « Votre entreprise est-elle visible sur ChatGPT? »
     - J3: « L'IA recommande-t-elle {{company_name}}? »
     - J7: « Les futurs clients vous trouvent-ils via l'IA? »
   - Les 2 objets restants stockés comme alternates (champ `subject_template` accepte une seule valeur — on les place en commentaire JSON dans `step_name` pour A/B futur, hors scope).

4. **Câblage SMS→Email fallback**
   - Conforme à la mémoire `Outbound SMS Fallback`: déjà en place. Une fois la séquence SMS marquée `is_default`, le dispatcher SMS la sélectionne; le fallback email est déclenché par l'engine existant après échec/2 non-réponses (aucun changement code requis).

## Variables et garde-fous
- Rendu identique au sender actuel: `{{first_name}}`, `{{company_name}}`, `{{city}}`, `{{specialty}}`.
- Aucun lien `/analyse/:slug` injecté (choix utilisateur).
- Aucun score AIPP pré-calculé (choix utilisateur).
- Respect du Brand Identity Enforcement (filtres edge existants) — aucun changement.

## Hors scope
- Pas de nouvel edge function.
- Pas d'UI admin nouvelle (les nouvelles séquences apparaissent automatiquement dans `/admin/outbound/campaigns` et l'éditeur de templates).
- Pas de changement aux fenêtres d'envoi, quotas, suppression list.
- Pas de modification du moteur de personalization Gemini (les corps SMS sont déjà serrés et personnalisés via merge tags).

## Validation
- `select sequence_name, channel, is_default, is_active from outbound_sequences where is_active` → la nouvelle SMS est la seule `is_default=true`.
- Test send via `/admin/outbound/test-center` sur un numéro/email interne pour J1 (SMS) et J1 (email backup) — vérifier rendu des 4 variables.
- Smoke test dispatcher en `dry_run` pour confirmer que la séquence SMS est sélectionnée comme principale.

## Livrable
1 fichier de migration SQL (`supabase/migrations/<ts>_outbound_visibility_ia_sequence.sql`) contenant l'UPDATE + 2 INSERT séquences + 6 INSERT steps.
