# Débloquer les inscriptions gratuites (objectif : 10 entreprises)

## Le vrai blocage, vérifié en base aujourd'hui

L'inscription gratuite sur `/fondateurs` **ne peut plus aboutir**. Le correctif de sécurité appliqué le 8 septembre fait que la fonction d'inscription retourne toujours « vérification requise » pour un visiteur non connecté. La page, elle, ne connaît pas cette réponse et affiche « Une information est manquante ou invalide. Vérifiez les champs. »

Autrement dit : une entreprise qui remplit le formulaire aujourd'hui reçoit un message d'erreur trompeur et repart.

Preuves relevées :
- la fonction d'inscription renvoie `verification_required`, sans activation, tant qu'aucun contact vérifié n'existe ;
- l'étape d'activation canonique existe déjà et exige un courriel ou un téléphone réellement vérifié ;
- `founder_memberships` : 1 seule ligne, activée avant le correctif. Aucune demande en attente. Personne n'a pu s'inscrire depuis.

Lancer une campagne avant de corriger cela brûlerait les prospects.

## Étape 1 — Rendre l'inscription gratuite fonctionnelle de bout en bout

Sur `/fondateurs`, après le formulaire :

1. La demande est enregistrée comme **place réservée, en attente de vérification** (aucune carte de crédit, aucun paiement).
2. Un code de vérification est envoyé au courriel saisi (réutilisation du mécanisme de connexion déjà en place, aucun nouveau système).
3. L'entreprise saisit le code sur la même page.
4. Une fois le code validé, l'activation gratuite canonique est déclenchée : compte, rôle entrepreneur, fiche entreprise, réclamation et session d'inscription.
5. Écran de confirmation avec la date de fin des 12 mois offerts et le lien vers la page publique de l'entreprise.

Messages corrigés : « demande reçue », « vérification requise », « place réservée » — jamais « activé » avant validation du code. Les raisons de refus réelles (ville complète, catégorie non admissible, déjà inscrit, code expiré) obtiennent chacune un message clair.

## Étape 2 — Compléter le profil et la page publique

Après activation : ville, services, coordonnées, description. Vérification que la page publique s'affiche correctement et complètement sur mobile. Aucune étape ne dépend de Stripe.

## Étape 3 — Observabilité du tunnel

Journalisation de chaque étape avec le journal d'événements existant : sélection, vérification du numéro, message tenté/envoyé/livré, clic, page vue, inscription commencée, code validé, profil commencé, profil complété, adhésion gratuite activée.

Écran admin d'abandon : nombre d'entreprises à chaque étape, taux de passage, et par variante de message (envoyés, livrés, clics, inscriptions commencées, complétées, conversion). Le seul indicateur de réussite est l'inscription gratuite complétée.

## Étape 4 — Test réel contrôlé, puis publication

Un parcours complet réel effectué de bout en bout avec un contact contrôlé, puis vérification en base que chaque événement et chaque artefact existent. Publication seulement si ce parcours réussit.

## Étape 5 — Prospection

La prospection reste coupée tant que l'étape 4 n'est pas prouvée. Ensuite, réactivation progressive des agents existants uniquement (aucun système parallèle), ciblage des catégories admissibles à l'offre gratuite, anti-doublon, règles de conformité déjà en place, et arrêt du recyclage du même lot.

Envoyer de vrais messages à de vrais prospects est irréversible : je vous demanderai votre feu vert explicite avant la première vague, puis un premier envoi limité avant le volume.

## Détails techniques

- Migration : `founder_public_signup` renvoie un identifiant de demande en attente exploitable par la page (état `founder_signup_started`, dates nulles) ; `claim_pending_free_service_signup` reste le seul chemin d'activation, appelé après vérification.
- Front : `src/pages/founder/PageFounderLocalServices.tsx` gagne un état « vérification » réutilisant le code à usage unique existant (`signInWithOtp` courriel, composants d'authentification déjà présents), puis appelle l'activation.
- Événements via `src/lib/analytics/logFunnelEvent.ts` (types existants + ajouts pour l'offre gratuite), aucun second système d'analytique.
- Admin : nouvel onglet d'abandon alimenté par le journal d'événements et `founder_memberships`.
- Interrupteur global de prospection et tâches planifiées inchangés (inactifs) jusqu'à l'étape 5.
