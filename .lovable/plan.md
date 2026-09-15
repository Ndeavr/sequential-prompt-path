# Calendrier entrepreneur — phase 1 : un compte NICK peut recevoir un vrai rendez-vous

## Ce qui existe déjà (vérifié)

- La connexion Google fonctionne déjà côté serveur : autorisation sécurisée, retour, stockage chiffré, déconnexion, plus les écrans `/calendar/connect`, succès et échec. Les identifiants Google sont configurés.
- L'abonnement au calendrier Apple existe déjà (lien privé qui envoie les rendez-vous UNPRO vers Apple).
- Un moteur de créneaux existe déjà : heures de travail, absences, durées, tampons, temps de déplacement, rendez-vous UNPRO déjà réservés.
- Manquant : les périodes occupées du vrai calendrier ne sont jamais lues, la connexion n'est jamais proposée après l'activation du forfait, le tableau de bord n'affiche pas l'état de la connexion, et l'assistant de réservation de Clara invente des créneaux quand il n'en trouve pas.

## Ce que je construis

1. **Lecture des vraies périodes occupées (Google)**
   Après connexion, UNPRO lit uniquement les plages occupé/libre — jamais le titre ni le contenu des évènements personnels. Rafraîchissement à chaque calcul de créneaux et en tâche de fond. Gestion du fuseau horaire du Québec.

2. **Écriture des rendez-vous confirmés dans le calendrier**
   Quand l'entrepreneur l'autorise, un rendez-vous UNPRO confirmé apparaît dans son Google Calendar. Pour Apple, les rendez-vous arrivent par le lien d'abonnement existant; l'entrepreneur peut en plus coller le lien de partage de son calendrier Apple pour que ses périodes occupées soient prises en compte.

3. **Fin des créneaux inventés**
   L'assistant de réservation ne proposera plus de créneaux fictifs. Sans disponibilités configurées, il le dit honnêtement et propose de configurer l'horaire ou d'être rappelé.

4. **Connexion du calendrier juste après l'activation du forfait**
   Après « Votre forfait est activé », Clara enchaîne : « Ton forfait est activé. Connectons maintenant ton calendrier pour qu'UNPRO puisse te proposer des rendez-vous aux bons moments. » avec le bouton **Connecter mon calendrier**. L'entrepreneur peut passer : il accède au tableau de bord, mais l'étape reste visiblement incomplète.
   Barre de progression : Profil ✓ · Services ✓ · Territoire ✓ · Calendrier ○ · Disponibilités ○ — la même sur le tableau de bord.

5. **Réglages de rendez-vous réels**
   Types de rendez-vous (estimation gratuite, inspection, réparation, entretien, estimation téléphonique, visite d'urgence, personnalisé) avec durée, tampon avant/après, temps de déplacement, préavis minimum, horizon de réservation, jours et heures permis, territoire, prix s'il y a lieu. Clara propose des réglages de départ cohérents avec les vrais services de l'entreprise; l'entrepreneur confirme ou modifie. Rien n'est présenté comme vérifié si ce n'est qu'une suggestion.

6. **Anti-double réservation**
   La disponibilité est revalidée côté serveur au moment exact de la confirmation, avec verrou : deux propriétaires qui visent le même créneau ne peuvent pas réserver tous les deux. Le second reçoit une alternative immédiate.

7. **Tableau de bord**
   État de la connexion, santé de la synchronisation, avertissement de reconnexion si l'accès est révoqué ou expiré, prochains rendez-vous, modification des règles, déconnexion/reconnexion — sans repasser par l'inscription.

8. **Clara au courant**
   Clara connaît le compte réel, le forfait actif (NICK a couvert le prix, rien d'autre), l'état du calendrier, le territoire et les règles. Elle ne renvoie jamais vers un paiement pour ce forfait.

## Outlook et Apple

- **Google** : complet dans cette phase.
- **Apple** : envoi des rendez-vous immédiat; lecture des périodes occupées via lien de partage, facultative.
- **Outlook / 365** : affiché comme bientôt disponible. Il manque l'application Microsoft (Azure) et ses identifiants. Dès que vous les créez, je l'ajoute derrière la même mécanique.

## Ce que je ne touche pas

Parcours payant normal, prix, produits Stripe, enrichissement d'entreprise, matching existant, aucune donnée fabriquée, aucun envoi SMS/courriel d'acquisition, aucune terminologie test/démo/essai.

## Détails techniques

- Réutilise `calendar_connections`, `calendar-google-oauth-start/callback`, `calendar-disconnect`, `calendar-apple-ics`, `booking_appointment_types`, `booking_availability`, `booking_blackouts`, `smart_bookings`, `src/services/bookingSlotEngine.ts`. Les tables vides et redondantes `contractor_calendar_connections` et `booking_calendar_integrations` sont marquées dépréciées, pas supprimées.
- Nouvelles fonctions serveur : `calendar-freebusy-sync` (lecture busy Google, rafraîchissement du jeton, journal dans `calendar_sync_logs`, marquage `needs_reconnect` sur révocation), `calendar-push-event` (écriture d'un rendez-vous confirmé), `booking-confirm-slot` (revalidation + verrou consultatif + création atomique). Cache des périodes occupées dans une table dédiée, jamais de titre d'évènement stocké.
- `bookingSlotEngine` étendu pour soustraire les périodes occupées externes; le calcul final de confirmation se fait côté serveur, jamais sur la confiance du client.
- `alex-inline-booking` : suppression de la branche `mock slots`, réponse honnête en absence de disponibilité.
- Évènements d'audit : `contractor_calendar_connection_started`, `_connected`, `_disconnected`, `_sync_failed`, `contractor_availability_updated`, `contractor_appointment_created` — sans jeton ni donnée sensible.
- RLS : chaque entrepreneur ne voit que ses connexions, règles et rendez-vous; les jetons restent illisibles côté client.
- Erreurs couvertes : annulation OAuth, jeton expiré, accès révoqué, panne d'API calendrier, échec de synchronisation, course de double réservation, rafraîchissement pendant l'activation. Une erreur de calendrier n'altère jamais le profil ni l'abonnement.
- Tests : connexion et retour OAuth, périodes occupées respectées, refus de double réservation concurrente, reconnexion après révocation, refus des créneaux fictifs, non-régression du parcours payant et de l'activation NICK. Typecheck, build et suite complète avant livraison.
- Mobile 390 px validé sur : activation → connexion → retour OAuth → réglages → tableau de bord.
