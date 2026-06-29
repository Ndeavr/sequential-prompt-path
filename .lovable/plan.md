## Cause racine identifiée (audit live de la DB et du code)

J'ai requêté `contractor_leads` et lu `leadValidation.ts` / `phoneValidation.ts` / `twilio-status-v2`. Le compteur "0 valides" vient de **trois causes distinctes** mélangées dans un seul bucket UI.

### Distribution réelle des 238 leads

```text
156  validation_status=invalid_phone  reason=invalid_format   → phone IS NULL/''  (jamais scrapé)
 81  validation_status=needs_review   reason=lookup_failed    → format OK, Twilio Lookup v2 répond mal
  1  validation_status=invalid_phone  reason=invalid_nanp     → 514-123-4567 (seed test)
```

Vérifié en SQL : les 156 "Format invalide" ont littéralement `phone = ''`. Ce sont des leads importés **sans téléphone** — pas un bug de normalisation, un problème de qualité de scraping. Les 81 "lookup échoué" ont tous un `phone_e164` valide en area code QC (514/450/438…) — la normalisation marche, c'est Twilio Lookup v2 qui retourne soit une erreur soit `line_type=unknown`, mappée vers `lookup_failed` dans `phoneValidation.ts:96-102`.

### "contact_required" dans le Flux temps réel
N'a **rien à voir** avec la validation. C'est un statut `sms_events_v2` posé par `twilio-status-v2/index.ts:198` après 3 échecs de livraison Twilio. La capture montre que ces lignes datent d'anciens tests bloqués (callback `<24h` rouge).

---

## Ce que je vais faire

### 1. Persister la vraie raison de blocage
- `missing_phone` au lieu de `invalid_format` quand `phone IS NULL/''` (corriger `leadValidation.ts:75` et `phoneValidation.ts` pour propager `missing_phone` jusqu'à la DB).
- Ajouter colonnes `phone_lookup_raw jsonb` + `phone_lookup_http_status int` sur `contractor_leads` pour stocker la réponse brute Twilio (corps + code HTTP).
- Migration: backfill — recalculer `phone_failure_reason='missing_phone'` pour les 156 sans phone.

### 2. Nouveau statut `lookup_unavailable` (non bloquant)
Conformément à la directive : si Twilio Lookup échoue (HTTP error, timeout, type=unknown), **ne pas** marquer invalide.
- Ajout `lookup_unavailable` au type `PhoneValidationStatus`.
- `lookupPhone()` retourne `lookup_unavailable` au lieu de `lookup_failed` quand: HTTP ≥ 400, exception réseau, ou `line_type=unknown`.
- `validateLead()` : `lookup_unavailable` → `validation_status='valid'` avec `phone_confidence_score=70` (assez pour franchir le gate à 85? non — on baisse le seuil SMS à 70 pour ce cas, marqué `tentative_send=true`).
- `gateLeadForOutreach()` : autorise `lookup_unavailable` à passer mais loggue `attribution_warning='lookup_unavailable'`.
- Net : les **81 leads format-OK redeviennent éligibles** à l'envoi SMS.

### 3. Edge function `acq-validation-audit` (lecture seule)
Renvoie pour les 50 premiers échecs et pour les 157 sans-téléphone :
```json
{ company_name, phone_original, phone_normalized, validation_status,
  validation_reason, twilio_lookup_status, twilio_lookup_body }
```
Groupe les 157 invalides par bucket : `missing_phone | invalid_nanp | landline | lookup_unavailable | duplicate`.

### 4. Échantillon scraper qualité (100 prospects)
Réutilise `acq-validation-audit` avec `?sample=100` → renvoie `% mobile, % landline, % fake (555-01XX), % duplicate, % missing`.

### 5. UI — Debug Panel
Ajoute `ValidationDebugPanel.tsx` dans `/admin/acquisition-funnel` :
- Table avec colonnes : Entreprise · Téléphone brut · E.164 · Étape (classify / lookup / dedupe) · Résultat · Raison · Body Twilio (collapsible).
- Bouton "Re-valider" qui appelle `validate-lead-phones` sur la sélection.
- Compteurs mis à jour : `Valide`, `Lookup indispo (envoyable)`, `À enrichir téléphone`, `Sans téléphone`.

### 6. Rapport final (route `/admin/acquisition-funnel` haut de page)
```text
Contactables aujourd'hui          : N  (valid_mobile + lookup_unavailable + email fallback)
Email seulement                   : N  (no mobile + valid email)
Inutilisables                     : N  (missing_phone + missing_email)
```

### 7. Nettoyage des `contact_required` historiques
Script de migration : `UPDATE sms_events_v2 SET status='archived_legacy' WHERE status='contact_required' AND created_at < now() - interval '24 hours'` — pour vider le Flux temps réel pollué par les anciens tests.

---

## Détails techniques (pour l'exécution)

**Fichiers modifiés**
- `supabase/functions/_shared/phoneValidation.ts` — ajout `lookup_unavailable`, mapping `unknown`/HTTP error → `lookup_unavailable`, retour du body brut.
- `supabase/functions/_shared/leadValidation.ts` — `missing_phone` propagé, branche `lookup_unavailable` → valid+tentative, persister `phone_lookup_raw`.
- `supabase/functions/validate-lead-phones/index.ts` — mêmes branches.
- Nouvelle migration : colonnes `phone_lookup_raw`, `phone_lookup_http_status`, `tentative_send` sur `contractor_leads` + backfill `missing_phone` + nettoyage `sms_events_v2.contact_required` legacy.
- Nouvelle edge function : `supabase/functions/acq-validation-audit/index.ts`.
- Nouveau composant : `src/components/admin/ValidationDebugPanel.tsx` monté dans `PageAdminAcquisitionFunnel.tsx`.
- `src/pages/admin/PageAdminAcquisitionFunnel.tsx` — bandeau "Contactables / Email seulement / Inutilisables".

**Résultat attendu après run**
- Bucket "Format invalide" passe de 156 à 0 (renommé `Sans téléphone`).
- Bucket "Lookup Twilio échoué" passe de 81 à 0 (renommé `Lookup indispo` et **envoyable**).
- "Valide (prêt à envoyer)" passe de 0 à ~81.
- Worker SMS peut enfin traiter une vague réelle.

Pas d'envoi automatique tant que tu n'as pas validé la liste dans le Debug Panel.