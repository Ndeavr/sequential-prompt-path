## Constat (depuis la capture)
1. `resend` reste **RED** avec code `LOVABLE_CONNECTOR_KEY_INSTEAD_OF_RESEND` alors que le tour précédent a explicitement validé que les clés `lovc_` doivent passer par la passerelle Lovable (et qu'un envoi réel a réussi).
2. La liste "Alertes critiques ouvertes" accumule des entrées historiques (`LOVABLE_CONNECTOR_KEY_INSTEAD_OF_RESEND`, `WRONG_VARIABLE_MAPPING`) jamais résolues → bruit permanent.
3. Le selftest plante désormais à l'étape `delivered_webhook` : l'envoi part, mais aucun webhook Resend ne revient dans le délai d'attente.

## Cause racine
- Le **diagnose** et le **health agent** classent encore `lovc_` comme erreur fatale au lieu de le considérer comme un mode "gateway" valide. Le code d'envoi est bon, mais la sonde santé est restée sur l'ancienne logique → score plafonné, alerte permanente.
- Aucune entrée n'écrit `resolved_at` sur les alertes `outreach_health_checks` quand la sonde repasse au vert → la liste grossit indéfiniment.
- Pour `delivered_webhook` : les webhooks Resend doivent pointer vers `resend-events`. Avec une clé `lovc_` (connecteur), on **ne peut pas** créer le webhook côté Resend via API ; il faut soit le configurer manuellement, soit retomber sur le **polling de l'API Resend** (`GET /emails/:id`) pour confirmer la livraison.

## Plan

### 1. `supabase/functions/resend-key-diagnose/index.ts` + `outreach-health-agent`
- `lovc_` → statut `ok_gateway` (vert). Plus jamais de code `LOVABLE_CONNECTOR_KEY_INSTEAD_OF_RESEND`.
- `re_` → `ok_direct` (vert).
- Tout autre préfixe → `RED` `INVALID_PREFIX`.
- Un seul critère de vert pour Resend : un envoi réel a réussi dans les 24h **OU** la sonde gateway répond 200 au `verify_credentials`.

### 2. Nettoyage des alertes ouvertes (`outreach-health-agent`)
- Avant d'écrire une nouvelle ligne, marquer `resolved_at = now()` sur toutes les alertes ouvertes du même `provider + code` quand la condition n'est plus vraie.
- Migration ponctuelle : `UPDATE outreach_health_checks SET resolved_at = now() WHERE code IN ('LOVABLE_CONNECTOR_KEY_INSTEAD_OF_RESEND', 'WRONG_VARIABLE_MAPPING') AND resolved_at IS NULL;`
- Dans l'UI `/admin/outreach-health` : ne lister que `resolved_at IS NULL` (déjà le cas, mais à confirmer).

### 3. Fix selftest `delivered_webhook` (`acq-e2e-real`)
Stratégie en cascade (premier succès gagne) :
1. **Webhook** : si `resend_webhook_secret` est configuré → on attend l'event `email.delivered` dans `acquisition_events` pendant 90 s.
2. **Polling API** : sinon → on appelle `GET https://connector-gateway.lovable.dev/resend/emails/{id}` toutes les 10 s pendant 90 s ; succès si `last_event in ('delivered','sent')`.
3. **Sinon** → step marqué `WARN` (pas `FAIL`), avec instruction explicite : "Configurer le webhook Resend → `https://api.unpro.ca/resend-events` dans le tableau Resend." Le score global n'est plus plafonné par ce step seul ; seul un échec d'**envoi** plafonne.

### 4. UI `/admin/outreach-health`
- Badge "Alertes" filtre déjà sur ouvertes — ajouter bouton "Tout marquer résolu" pour purger manuellement (admin only).
- Ajouter un panneau `Webhook Resend` qui montre :
  - URL attendue : `https://api.unpro.ca/resend-events`
  - Statut : "Reçoit des events" (vu dans les dernières 24h) / "Aucun event reçu" + lien direct vers la doc Resend.

### 5. Déploiements
- Redeploy : `resend-key-diagnose`, `outreach-health-agent`, `acq-e2e-real`, `outreach-repair-agent`.
- Relancer un selftest pour vérifier le passage au vert.

## Succès
- Resend = GREEN après une sonde, sans changer la clé.
- Liste "Alertes critiques" se vide automatiquement quand la condition disparaît.
- Selftest n'échoue plus à `delivered_webhook` si l'envoi réussit ; il avertit seulement si le webhook Resend n'est pas configuré, sans bloquer le score.
- Le score opérationnel peut atteindre 95+ → autopilote débloqué.

## Hors scope
- Aucune nouvelle variante d'email (la séquence "IA invisible" reste planifiée séparément — repris au tour précédent et toujours en attente côté implémentation).
- Aucune modif Twilio.
