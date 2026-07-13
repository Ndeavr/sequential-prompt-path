## Diagnostic (confirmé sur DB)

- 188 / 188 leads ont `lead_status='BLOCKED'`, `block_reason='stage_timeout:DISCOVERED'`.
- 188 / 188 ont un téléphone QC valide (438/450/514/…). Aucun `opted_out`, aucun claim batch existant.
- `phone_type` n'est jamais enrichi dans `launch_leads.payload` → l'hypothèse "phone_type=unknown rejeté" est fausse. Le rejet vient du `lead_status`, pas du type de téléphone.

Le batch sender (`first-dollar-send-batch` + `EligibilityPanel`) exige `lead_status IN ('SCORED','ENRICHED')`. 188 leads sont `BLOCKED` par timeout → 0 éligibles.

## Objectif

Débloquer l'envoi du premier batch de 25 SMS sans affaiblir la sécurité :
1. Récupérer les leads `BLOCKED` par simple `stage_timeout` (transient) avec téléphone valide.
2. Rendre la règle d'éligibilité visible et corrigible depuis `/admin/first-dollar/batches`.
3. Diagnostiquer précisément *pourquoi* un lead est exclu.

## Étapes

### 1. Migration — recovery des leads bloqués par timeout

Fonction SQL `public.recover_blocked_launch_leads()` qui :
- Cible `lead_status='BLOCKED'` AND `block_reason LIKE 'stage_timeout:%'` AND `phone IS NOT NULL`.
- Repasse à `lead_status='SCORED'`, vide `block_reason`, `failure_code`, incrémente `retry_count`.
- Retourne `{ recovered_count, sample_ids[] }`.
- SECURITY DEFINER, admin-only via `has_role(auth.uid(),'admin')`.

Pas de trigger automatique — on veut un bouton explicite dans l'admin.

### 2. Élargissement de l'éligibilité (assoupli, pas ouvert)

Nouvelle statut set canonique dans le send batch + panneau :

```
ELIGIBLE_STATUSES = ('SCORED', 'ENRICHED')
```

Reste inchangé. On ne fait PAS `unknown → eligible` (pas pertinent, le champ n'existe pas). Le déblocage passe par `recover_blocked_launch_leads()` qui remet en `SCORED`.

Justification : garder la porte étroite (`SCORED`/`ENRICHED`) évite d'envoyer des SMS à des leads dont on n'a validé ni l'entrepreneur, ni le numéro, ni l'opt-in. Le recovery reclasse proprement.

### 3. Panneau diagnostic dans `EligibilityPanel`

Ajouter sous les compteurs existants un tableau des **50 premiers leads exclus** avec :

| id (tronqué) | company_name | phone | lead_status | block_reason | eligibility_reason |

`eligibility_reason` calculé côté hook :
- `missing_phone`
- `opted_out`
- `already_claimed`
- `blocked_stage_timeout` (RÉCUPÉRABLE — badge ambre + CTA)
- `blocked_other` (raison affichée telle quelle)
- `wrong_status:<status>`

Un CTA **« Récupérer les leads bloqués par timeout »** apparait dès qu'il y a ≥1 `blocked_stage_timeout`. Appelle `recover_blocked_launch_leads()` puis refetch éligibilité.

### 4. Rafraîchir le SMS Health

Le panneau existant marque déjà `WARNING` (dernier test 602h). L'utilisateur relance "Tester maintenant" (cooldown déjà en place). Aucun changement code nécessaire ici — juste documenter dans l'UI que ce blocage devient secondaire une fois les leads récupérés.

## Fichiers touchés

- **NEW** `supabase/migrations/<ts>_recover_blocked_leads.sql` — fonction `recover_blocked_launch_leads()`.
- **EDIT** `src/components/admin/EligibilityPanel.tsx` — ajouter table des exclus + bouton recovery + reason calculée.
- **EDIT** `src/hooks/useFirstDollarFunnel.ts` — pas de changement (déjà event-driven).
- Aucun changement à `first-dollar-send-batch` (règle inchangée).

## Critères de succès

1. Après clic sur « Récupérer les leads bloqués », `SELECT COUNT(*) FROM launch_leads WHERE lead_status='SCORED'` ≥ 25.
2. `EligibilityPanel` affiche `Éligibles pour ce batch ≥ 25`.
3. Une fois le SMS Health repassé `HEALTHY` (bouton test → Twilio callback), le batch de 25 peut être envoyé.
4. Aucune règle de sécurité n'est retirée (24h test check, atomic claim, cap 25, opt-out).

## Ce qu'on ne fait PAS

- Pas de bypass de la health check 24h.
- Pas d'ajout de `phone_type` (le champ n'existe pas ; introduire une carrier lookup Twilio Lookup API dépasse le scope de ce fix).
- Pas de mock, pas de seed factice.