# Recâblage cockpit acquisition — 8 stages officiels

## Contexte

Le cockpit `/admin/acquisition/machine` expose une rangée de boutons (`Force scrape`, `Cascade`, `Extract data`, `Score AIPP`, `Generate messages`, `Send test email/SMS`, `Launch outreach`, `Pause`) qui ne correspondent pas au pipeline officiel demandé :

```text
Discovery → Batch enrichment → Deterministic scoring →
Message generation → Approval queue → Outreach → Stripe → Activation
```

Aujourd'hui :
- "Score AIPP" appelle `acq-generate-aipp` (LLM, coûteux) au lieu de `acq-generate-score` (déterministe, 37 signaux — c'est la fonction "officielle").
- Aucune étape Stripe ni Activation visible dans la barre.
- Pas de visualisation de la file d'approbation (déjà construite : `/admin/acquisition/duplicates`).
- Les libellés mélangent verbes anglais et français, et n'indiquent pas la position dans le pipeline.

## Objectif

Une seule barre de contrôle horizontale numérotée 1→8, chaque bouton wire vers la edge function officielle, état actif highlight la stage courante.

## Mapping officiel

| # | Stage | Bouton | Edge function | Body |
|---|---|---|---|---|
| 1 | Discovery | `1. Discovery` | `acq-cascade-scrape` | `{ trade, city, limit, enrich: false }` |
| 2 | Batch enrichment | `2. Enrichment` | `acq-enrich-contractor` | `{ batch: true, limit: 20 }` |
| 3 | Deterministic scoring | `3. Scoring` | `acq-generate-score` (boucle sur contractors non scorés via `acq-generate-aipp` en fallback batch) | `{ batch: true, limit: 20 }` |
| 4 | Message generation | `4. Messages` | `acq-generate-test-variants` (prospect sélectionné) ou `acq-generate-outreach` (batch) | `{ prospect_id }` ou `{ batch: true, limit }` |
| 5 | Approval queue | `5. Approval` | Lien vers `/admin/acquisition/duplicates` + badge count | — |
| 6 | Outreach | `6. Outreach` | `acq-send-outreach` | `{ batch: true, dry_run: false, require_approval: true }` |
| 7 | Stripe | `7. Checkout` | `acq-create-checkout` (test link admin) | `{ prospect_id, plan: "pro", test: true }` |
| 8 | Activation | `8. Activation` | `activate-contractor-plan` | `{ prospect_id, dry_run: true }` |

Boutons annexes conservés en seconde ligne : `Send test email`, `Send test SMS`, `Pause campagne`.

## Changements UI

- Une seule rangée `flex flex-wrap gap-2` numérotée, chaque bouton préfixé `1.`, `2.`, etc.
- Tooltip sur chaque bouton décrivant la edge function appelée (debug).
- Badge orange sur `5. Approval` avec le count de doublons en attente (query existante).
- Stage active (`running === stageKey`) → border-primary + ring subtil.
- Boutons stage 3/6 désactivés si la stage précédente n'a aucune donnée disponible (warning toast plutôt que blocage dur).

## Changements code

### Fichier modifié
- `src/pages/admin/acquisition/PageAdminAcquisitionMachine.tsx`
  - Refactor du bloc `Pipeline Control` (lignes ~195-298).
  - Définir une constante `PIPELINE_STAGES` (8 entrées) pour rendre la barre via `.map()`.
  - Mettre à jour le footer (`Edge: ...`) avec la liste exacte des 8 fonctions appelées.
  - Conserver `callEdge` tel quel (déjà structurée pour parser `{ ok, error_code, missing, next_action }`).

### Aucun changement
- Edge functions (`acq-generate-score`, `acq-create-checkout`, `activate-contractor-plan` existent déjà).
- Schéma DB.
- Routes.

## Détails techniques

- `acq-generate-score` attend `{ contractor_id }` unitaire → on ajoute un mode `{ batch: true, limit }` côté edge OU on itère côté client sur les contractors non scorés (préférer côté client pour rester dans une seule passe — pas de migration). **Décision** : itération client (max 20 prospects sélectionnés via `contractor_prospects` non scorés), `Promise.allSettled`, toast récap.
- `acq-create-checkout` en mode test : on génère un payment link et on l'affiche dans un toast cliquable (pas de redirection auto).
- `activate-contractor-plan` en `dry_run: true` par défaut depuis le cockpit pour éviter une activation accidentelle.

## Critères de succès

- La barre montre exactement 8 boutons numérotés dans l'ordre du pipeline.
- Chaque bouton appelle la fonction officielle listée dans le tableau.
- "Approval" affiche le count en temps réel et navigue vers `/admin/acquisition/duplicates`.
- Aucun bouton n'utilise plus `acq-generate-aipp` directement (LLM) — déterministe par défaut.
- Footer du cockpit liste les 8 fonctions officielles.
