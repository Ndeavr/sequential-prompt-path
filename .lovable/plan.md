A — PROMPT LOVABLE FINAL

1. CONTEXT
UNPRO doit arrêter les faux statuts SMS “sent” et prouver le chemin réel : UNPRO → fonction backend → Twilio → transporteur → delivered/failed. La configuration Voice visible dans Twilio ne corrige pas les SMS; l’audit doit porter sur Messaging, webhooks, credentials et logs.

2. OBJECTIVE
Créer un audit Twilio production complet, bloquant et traçable, pour identifier la cause racine du 329 SMS sent / 0 delivered et valider un SMS réel avec Message SID, réponse API, statut livraison et code erreur.

3. USERS
- Admin UNPRO
- Founder / opérateur acquisition
- Système Autopilot SMS

4. DELIVERABLES
- Vérification sécurisée des secrets backend existants : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` / `TWILIO_PHONE_NUMBER`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_VERIFY_SERVICE_SID` si présent.
- Fonction backend d’audit Twilio qui interroge Twilio Messaging via les credentials serveur.
- Diagnostic Admin dans Revenue Intelligence / Acquisition avec :
  - numéro actif
  - sender attendu `+14503286776`
  - statut Messaging
  - présence/absence Messaging Service
  - webhooks configurés
  - derniers 25 SMS Twilio
  - Message SID
  - From / To masqués
  - status Twilio
  - error_code / error_message
  - statusCallback présent ou absent
- Bouton “Envoyer SMS test” avec destination contrôlée.
- Blocage dur si sender différent de `+14503286776`.
- Blocage dur si status callback absent ou pointe vers une URL non-production.
- Rapport racine : credentials, sender, messaging service, restrictions pays/trial, Canada SMS, webhooks, erreurs Twilio.

5. LOGIC
- Ne jamais considérer un SMS comme delivered sur simple succès API.
- `sent/queued/accepted` = statut intermédiaire.
- `delivered` = uniquement depuis webhook Twilio ou lecture directe du message Twilio.
- `failed/undelivered` = capturer `ErrorCode` + `ErrorMessage`.
- Si Twilio API rejette la requête, enregistrer `failed_api_rejected`, pas `sent`.
- Si aucun webhook delivery n’arrive, marquer `delivery_unknown_callback_missing`, pas `delivered`.
- Si Messaging Service SID existe, vérifier que le numéro `+14503286776` y est attaché.
- Si Messaging Service absent, envoyer avec `From=+14503286776`.
- Si Messaging Service présent mais mal configuré, bloquer l’envoi et afficher la réparation requise.

6. DATA
- Lire les tables SMS existantes (`sms_events_v2` et/ou tables récentes créées autour de `sms_messages`, `message_events`, `click_events`) sans casser l’existant.
- Ajouter uniquement les champs manquants si nécessaire :
  - `twilio_sid`
  - `twilio_status`
  - `twilio_error_code`
  - `twilio_error_message`
  - `status_callback_url`
  - `provider_response`
  - `delivery_verified_at`
  - `root_cause_code`
- Maintenir RLS, grants et accès admin uniquement.

7. UI/UX
- Ne pas redesign.
- Ajouter un panneau diagnostic compact dans Admin → Revenue Intelligence / Acquisition.
- Afficher des états lisibles : Green = livré vérifié, Amber = en attente / inconnu, Red = bloqué / rejeté / mauvais sender.
- Masquer les numéros clients partiellement.
- Afficher des actions claires : “Configurer webhook”, “Réparer sender”, “Relancer test”, “Voir dernier SID”.

8. COMPONENTS
- `TwilioDiagnosticPanel` enrichi ou réparé.
- `TwilioSmokeTestForm` si le panneau actuel ne suffit pas.
- `TwilioMessageTraceTable` pour les 25 derniers messages.
- `TwilioRootCauseCard` pour afficher la cause principale.

9. ACTIONS
- Vérifier les secrets sans exposer les valeurs.
- Vérifier la présence et la cohérence du sender.
- Interroger Twilio `/Messages.json` pour les derniers SMS.
- Interroger Twilio Messaging Services si `TWILIO_MESSAGING_SERVICE_SID` existe.
- Envoyer un SMS test réel via backend.
- Poller ou relire le Message SID pour obtenir le statut.
- Enregistrer l’événement dans la table SMS.
- Mettre à jour le dashboard avec le statut réel.

10. CONSTRAINTS
- Ne jamais afficher Account SID complet, Auth Token ou credentials.
- Ne jamais logger les secrets.
- Ne pas utiliser les réglages Voice comme preuve de santé SMS.
- Ne pas inventer de screenshots Twilio Dashboard, Messaging Logs, Messaging Services ou Verify Services; Lovable ne peut pas capturer l’interface Twilio Console privée sans accès navigateur utilisateur. Remplacer par données API Twilio réelles et demander les captures si une vérification UI manuelle reste nécessaire.
- Ne pas compter les landlines / non-mobile comme échecs SMS.
- Ne pas débloquer Autopilot si E2E SMS n’est pas delivered ou si callback delivery manque.

11. SUCCESS
- L’audit retourne une cause racine explicite pour “329 sent / 0 delivered”.
- Le test SMS retourne : Message SID, réponse API, delivery status, error code si failed.
- Le dashboard distingue `api_accepted`, `sent`, `delivered`, `undelivered`, `failed`, `unknown_no_callback`.
- Aucun SMS ne part depuis un numéro différent de `+14503286776`.
- Aucun SMS n’est marqué delivered sans preuve Twilio.
- Autopilot reste bloqué tant que le test réel n’est pas vert.

12. TASKS
- Inspecter les fonctions Twilio existantes : send, inbound, status, diagnostics.
- Inspecter le panneau admin existant Twilio.
- Inspecter la table SMS réelle utilisée en production.
- Renforcer l’audit backend pour lire Twilio Messaging, Messaging Service et derniers messages.
- Renforcer le smoke test pour retourner le Message SID et relire son statut.
- Renforcer le mapping des statuts entrants Twilio webhook.
- Ajouter ou compléter la trace UI dans Admin → Revenue Intelligence.
- Ajouter les blockers sender/callback/messaging-service.
- Vérifier via appel edge function et retourner le résultat exploitable.

Technical implementation details
- Use backend functions only for Twilio API calls.
- Prefer existing Twilio connector/gateway if linked; otherwise use existing runtime secrets already configured.
- Use form-urlencoded Twilio requests.
- Use CORS on every function response.
- Keep all secret values masked.
- If a live test destination phone number is required and not already available in a secure field, request it via secure input or ask the user to provide the test number explicitly before sending.