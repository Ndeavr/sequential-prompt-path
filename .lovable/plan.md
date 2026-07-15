## Diagnostic actuel

Le blocage est confirmé avant Twilio/SMS : les fonctions backend appelées depuis `/admin/verified-contractors` ne sont pas disponibles côté backend déployé.

Preuves observées :

```text
POST /functions/v1/enrich-contractor-from-official-site
→ navigateur: Failed to fetch

Test backend direct:
/enrich-contractor-from-official-site → 404 Requested function was not found
/validate-contractor-phone → 404 Requested function was not found
/send-verified-batch → 404 Requested function was not found
```

La fiche Réno-Toit existe, mais reste bloquée :

```text
verification_status = needs_enrichment
phone_validation_status = unverified
sms_eligible = false
data_quality_score = 65
outreach_status = none
```

Donc `Envoyer lot réel (0)` est cohérent : aucune fiche ne peut passer le filtre strict.

## Plan de correction strict

### 1. Déployer les fonctions manquantes
Déployer uniquement les fonctions nécessaires à cette chaîne :

```text
enrich-contractor-from-official-site
validate-contractor-phone
send-verified-batch
```

Puis vérifier directement que chaque fonction répond autrement qu’en 404.

### 2. Rendre les erreurs lisibles dans l’admin
Modifier seulement le hook/page admin des prospects vérifiés pour afficher :

```text
Function: enrich-contractor-from-official-site
Status: 404 / 401 / 500 / timeout / network
Message: ...
Request ID: ... si disponible
```

Au lieu de :

```text
Failed to send a request to the Edge Function
```

Si le navigateur reçoit encore `Failed to fetch`, l’UI affichera une cause exploitable :

```text
Appel impossible: fonction non déployée, CORS ou réseau bloqué.
```

### 3. Durcir les réponses backend
Dans les 3 fonctions :

- CORS présent sur `OPTIONS`, succès et erreurs
- validation claire de `prospect_id`
- validation claire des variables backend requises
- timeouts courts et explicites pour scraping externe
- réponse JSON standardisée :

```json
{
  "ok": false,
  "function": "enrich-contractor-from-official-site",
  "status": 500,
  "message": "...",
  "request_id": "..."
}
```

### 4. Corriger la progression réelle du prospect
Après enrichissement réussi :

- conserver uniquement les données réellement trouvées
- inscrire les URLs sources scannées
- mettre à jour `data_quality_score`
- passer `verification_status` à `verified` seulement si les critères réels sont atteints

Après validation téléphone :

- normaliser `phone_e164`
- identifier mobile / VoIP SMS / ligne fixe / invalide
- mettre `sms_eligible = true` uniquement pour mobile ou VoIP SMS-compatible

### 5. Valider avec la fiche existante
Tester Réno-Toit de bout en bout :

```text
Enrichir
→ récupérer téléphone/email/source ou afficher cause précise

Valider
→ phone_validation_status réel
→ sms_eligible true/false réel

Dry-run
→ eligible_count > 0 seulement si la fiche est vraiment envoyable
```

### 6. Confirmer le critère de reprise acquisition
Arrêt du correctif seulement quand au moins une de ces deux situations est vraie :

```text
A) 1 prospect atteint verified + sms_eligible = true
   → Envoyer lot réel affiche au moins (1)
```

ou

```text
B) le prospect est rejeté avec une raison précise et actionnable
   ex: ligne fixe, site inaccessible, aucun email/téléphone trouvé, score < 80
```

## Hors périmètre

Je ne toucherai pas à :

- landing pages
- Alex
- Stripe
- scoring IA
- matching
- redesign
- nouveau dashboard

Objectif unique : rendre la chaîne `Prospect → Enrichissement → Validation → Vérifié → Lot réel` vérifiable et non bloquée par une erreur opaque.