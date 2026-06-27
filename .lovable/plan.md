## Diagnostic Resend — HTTP 400 "API key is invalid"

### Hypothèse principale
Le secret `RESEND_API_KEY` contient une clé qui n'existe plus / a été révoquée / a un caractère parasite (espace, saut de ligne, copie partielle). Resend renvoie HTTP 400 + `"API key is invalid"` quand le format du Bearer est valide mais que la clé n'est pas dans le registre actif (les clés vraiment révoquées renvoient parfois 400 et non 401). Le dashboard montre 4 clés actives (`re_9Wsv…`, `re_bCBX…`, `re_9Ku1…`, `re_bdz9…`) — il faut identifier laquelle (ou aucune) correspond au secret déployé.

### Constat code
Tous les modules lisent la même variable `RESEND_API_KEY` via `Deno.env.get("RESEND_API_KEY")` (health-agent, repair-messaging, repair-agent, outreach-resend-send, outreach-dispatch, acq-e2e-real, acq-send-outreach, send-outbound-test-email, etc.). Donc pas de variable mappée différemment. Le problème vient de la **valeur** du secret, pas du nom.

### Étapes

1. **Ajouter un endpoint diagnostic `resend-key-diagnose` (read-only, admin)**
   - Renvoie : `present`, `length`, `prefix` (8 premiers caractères), `suffix` (4 derniers), `has_whitespace`, `starts_with_re_`.
   - Appelle `GET https://api.resend.com/api-keys` → log `status`, `body.message`, et le `id`/`name` retourné si succès.
   - Appelle `GET https://api.resend.com/domains` → log status + body + `account` info.
   - Ne logue jamais la clé complète.

2. **Patcher `outreach-health-agent.probeResend`**
   - Log structuré : `console.log("[resend.probe] prefix=", RESEND_KEY.slice(0,8), "len=", RESEND_KEY.length)`.
   - Traiter HTTP 400 sur `/api-keys` ou `/domains` comme `RESEND_AUTH_ERROR` (clé révoquée) au lieu de `RESEND_PROVIDER_ERROR` générique, et stocker `prefix` + `length` dans `outreach_health_state.resend_last_error` pour comparaison visuelle au dashboard Resend.
   - Stocker le prefix observé dans `outreach_health_state.resend_key_prefix` (nouvelle colonne nullable).

3. **Migration mince**
   ```sql
   ALTER TABLE public.outreach_health_state
     ADD COLUMN IF NOT EXISTS resend_key_prefix text,
     ADD COLUMN IF NOT EXISTS resend_key_length int,
     ADD COLUMN IF NOT EXISTS resend_account_id text;
   ```

4. **Test d'envoi réel via `outreach-resend-send` (déjà existant)**
   - Bouton/admin action `Tester envoi réel Resend` → POST vers `outreach-resend-send` avec `to = founder email (yturcotte@gmail.com)`, `subject = "UNPRO RESEND TEST"`, body minimal + CTA tracké. Le résultat est inscrit dans `email_send_log` avec `metadata.resend_id` ou `metadata.error_body`.
   - Statut affiché dans `/admin/outreach-health` (carte « Dernier envoi réel Resend »).

5. **UI `PageAdminOutreachHealth`**
   - Sous la carte `resend`, afficher :
     ```
     prefix attendu : re_
     prefix observé : <resend_key_prefix>
     longueur       : <resend_key_length>
     account id     : <resend_account_id>
     ```
   - Bouton **Tester envoi réel** (lance étape 4).
   - Bouton **Marquer GREEN** désactivé tant que le dernier `email_send_log` lié au probe n'est pas `sent`.

6. **Logique honest scoring (déjà en place) — renforcer**
   - `messaging` reste capé à 60 tant que `outreach_health_state.resend_last_send_status !== 'sent'` (et pas seulement tant que le probe est rouge).

### Root cause attendu
Une des 4 valeurs ci-dessous (à confirmer dès que le prefix est loggé) :
- **wrong_key** : `RESEND_API_KEY` contient une clé qui n'apparaît pas dans le dashboard (ancienne / supprimée).
- **revoked_key** : prefix présent dans le dashboard mais marquée révoquée → régénérer + `update_secret`.
- **whitespace_corruption** : la valeur a un `\n` ou espace en fin → `length` ne matche pas la longueur Resend standard (~36 après `re_`).
- **stale_deployment** : prefix observé ≠ prefix actuel en Secrets UI → redéployer les fonctions concernées.
- **insufficient_scope** : prefix matche `re_bdz9…` (Onboarding, Sending access) qui n'a pas droit à `/api-keys` — auquel cas l'envoi réel (étape 4) doit réussir et seul le probe doit être ajusté pour utiliser `/domains` uniquement.

### Règle de sortie
Le panneau Resend **ne passe GREEN** que si :
- `probe /domains` → 200
- ET `outreach-resend-send` test → `sent` avec un `id` Resend confirmé < 24h.

### Fichiers touchés
- `supabase/functions/resend-key-diagnose/index.ts` *(nouveau)*
- `supabase/functions/outreach-health-agent/index.ts` *(prefix log + 400→AUTH_ERROR + persist prefix)*
- Nouvelle migration `outreach_health_state` (3 colonnes)
- `src/pages/admin/PageAdminOutreachHealth.tsx` *(carte diagnostic + bouton test réel)*
- `src/hooks/useOutreachHealth.ts` *(query diagnose + mutation test send)*
