## Objectif

Verrouiller le Go-Live outbound: aucun envoi production tant que SPF + DKIM + DMARC ne sont pas tous valides, avec diagnostics granulaires copy-paste dans l'UI. À exécuter quand les crédits sont rechargés.

## Contexte (déjà en place)

- `check-outbound-health` edge fonction: lookups SPF/DKIM multi-selector/DMARC + alignement
- `email_domain_health` colonnes diagnostiques (`dkim_selector`, `dkim_reason`, `suggested_dkim_record`, `alignment_status`)
- `PanelDkimDiagnostics.tsx` créé (affichage + copie record)
- `PanelLiveKPIs.tsx` montre déjà bandeau jaune si DKIM échoue
- `ModalConfirmGoLive.tsx` affiche pré-flight blockers

## Ce qui reste à faire

### 1. Hard gate côté serveur (le plus critique)

Bloquer l'envoi production directement dans les edge functions d'envoi (pas seulement l'UI).

- `supabase/functions/send-outbound-email/index.ts` (ou équivalent dispatcher): avant chaque envoi non-test, requêter `email_domain_health` du domaine actif. Si `spf_valid && dkim_valid && dmarc_valid && mx_valid` ≠ true → retourner 412 `preflight_failed` avec `{ blockers: [...] }`.
- Test sends (`send-outbound-test-email`) restent autorisés si SMTP `auth_status='connected'`, même si DKIM échoue.
- Logger les blocages dans `automation_jobs` ou `outbound_send_log` avec `status='blocked_preflight'`.

### 2. Recheck automatique 60s après update DNS

- Hook `useOutboundHealth`: ajouter un mode `pollingMs?: number`. Quand l'admin clique "J'ai ajouté le record", déclencher polling 60s pendant max 10 min.
- Bouton explicite "Revérifier le DNS" sur `PanelDkimDiagnostics` qui force `check-outbound-health` avec `?nocache=1`.

### 3. Diagnostics granulaires complets

Compléter `PanelDkimDiagnostics` avec sections séparées:

- **SPF**: record détecté, `includes` présents, `~all` vs `-all`, statut (valide / trop d'inclusions >10 / softfail).
- **DKIM**: déjà OK, vérifier propagation_age affiché en clair ("propagé depuis 2h").
- **DMARC**: policy détectée (none/quarantine/reject), rua/ruf, alignement avec From/Return-Path.
- **Alignement**: tableau 4 lignes (Return-Path, From, DKIM domain, SMTP hostname) avec ✓/✗.

### 4. Fix Panel copy-paste (par enregistrement)

Bloc unique "Records DNS à ajouter" listant uniquement ceux manquants/invalides:
- Type | Host | Value | TTL
- Bouton "Copier" par ligne + "Tout copier"
- Lien direct vers la console DNS du registrar si détectable (Cloudflare, GoDaddy, OVH).

### 5. Pre-flight blocker UI dans `ModalConfirmGoLive`

Renforcer: si un blocker actif → bouton "Activer la production" désactivé, message "Corriger ces 2 records avant de lancer", liste des actions exactes.

### 6. Statuts mailbox unifiés

Vérifier que `outbound_mailboxes.auth_status` est correctement reflété:
- `pending`, `connected`, `verified`, `dns_only`, `error`
- Le dashboard doit afficher chaque statut avec couleur dédiée + dernière sync.

## Fichiers à modifier (liste finale)

1. `supabase/functions/check-outbound-health/index.ts` — ajouter SPF includes count, DMARC policy parsing, propagation_age en secondes
2. `supabase/functions/send-outbound-email/index.ts` (et dispatcher autopilot) — hard gate pré-flight
3. `src/hooks/useOutboundHealth.ts` — mode polling + interfaces SPF/DMARC enrichies
4. `src/components/admin/system/PanelDkimDiagnostics.tsx` — split en 4 sections (SPF/DKIM/DMARC/Alignement)
5. `src/components/admin/system/PanelLiveKPIs.tsx` — bandeau rouge si pré-flight bloque, jaune si DKIM seul
6. `src/components/admin/system/ModalConfirmGoLive.tsx` — bouton désactivé tant que blocker actif
7. Migration: ajouter `spf_includes_count`, `dmarc_policy`, `dmarc_rua`, `propagation_age_seconds` à `email_domain_health`

## Hors scope

- Pas de rebuild homepage, Alex, design system.
- Pas de nouveau provider mail.
- Réutilise toute l'infra Lovable Cloud existante.

## Critère de succès

- Impossible d'envoyer en prod si un seul des 3 (SPF/DKIM/DMARC) échoue (vérifié via `curl_edge_functions`).
- Admin voit exactement quel record copier-coller, où, et le statut se met à jour seul après ajout DNS.
- Test sends restent possibles pour QA pendant la correction DNS.

## Exécution

À déclencher quand les crédits sont rechargés. Aucune action requise maintenant.
