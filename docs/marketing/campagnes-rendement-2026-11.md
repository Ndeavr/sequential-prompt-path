# Campagnes rendement — lot pilote (préparé 2026-11-01, NON ENVOYÉ)

Statut : préparé seulement. Aucun envoi. Voir « Blocages » ci-dessous.

## Règles du lot
- Plafond GLOBAL existant : 25 nouveaux contacts/jour, tous canaux (compteur du jour inclus). Allocation cible : 10 chauds, 10 équipes (A 5 / B 5), 5 distributeurs ; réallocation entre segments admissibles seulement.
- Jours ouvrables 9 h–17 h heure locale (ou règle existante plus restrictive). Un seul canal par entreprise. Aucun envoi si une tentative précédente a un statut incertain.
- CASL : preuve par adresse/canal (exprès, ou tacite publication bien en vue sans mention de refus + pertinence du rôle) avec revue humaine. Aucun numéro public = consentement SMS. Pas d'adresse devinée.
- Identification UNPRO, 281, rue Saint-Paul, Montréal H2Y 1H1, contact, désabonnement sans connexion (STOP / lien), suppression globale immédiate.
- Une relance max à J+4 ouvrables, sans réponse ni retrait, consentement valide et plafond disponible.
- Pas de lien vers /directeur-des-ventes avant sa publication vérifiée ; réponse directe.
- Références : https://crtc.gc.ca/eng/com500/guide.htm · https://crtc.gc.ca/eng/com500/faq500.htm

## Chauds (vrais événements seulement)
Sujet : Votre inscription UNPRO — besoin d'un coup de main?
> Bonjour {prénom vérifié}, à la suite de votre demande au sujet d'UNPRO, souhaitez-vous reprendre là où nous en étions? L'activation de base est de 350 $ plus taxes, avec votre profil et 12 mois de présence IA sur UNPRO. Les rendez-vous compris dans l'offre retenue sont précisés avant paiement. Quel point souhaitez-vous éclaircir : fonctionnement, territoires ou activation?
Adapter « votre demande » à l'événement réel (devis commencé, conversation). Sans prénom fiable : « Bonjour, ».

## Équipes de vente — A
Sujet : Vos vendeurs sont-ils satisfaits des rendez-vous reçus?
> Votre équipe perd-elle du temps avec des demandes hors territoire ou des travaux qu'elle ne souhaite pas réaliser? UNPRO propose d'étudier vos spécialités, vos territoires et votre capacité afin de définir une offre de rendez-vous exclusifs qualifiés adaptée. Combien de vendeurs avez-vous et quels mandats voulez-vous privilégier?

## Équipes de vente — B
Sujet : Quels mandats voulez-vous vendre davantage?
> Si vous pouviez choisir les prochains mandats de votre équipe, lesquels seraient les plus intéressants? Avec UNPRO, nous commençons par vos spécialités et vos territoires, puis vos objectifs et votre capacité de rendez-vous. Quels travaux recherchez-vous cette saison?

Segments prioritaires (novembre) : isolation, toiture / déneigement de toiture, thermopompes, plomberie.

## SMS équipe (mobile validé + preuve SMS revue uniquement)
> Bonjour, ici UNPRO. Votre équipe peut-elle prendre davantage de rendez-vous en {service vérifié} à {ville vérifiée}? Infos : {lien identité vérifié}. STOP pour arrêter.
Aucun envoi si un champ n'est pas résolu.

## Distributeurs matériaux / CVC (interlocuteur pertinent)
Sujet : Un partenariat pour votre réseau d'installateurs?
> UNPRO souhaite explorer un partenariat avec votre réseau d'installateurs de {catégorie}. L'idée : permettre aux entreprises intéressées de préciser leurs spécialités, leurs territoires et leur capacité pour étudier une offre de rendez-vous qualifiés adaptée. Nous pouvons préparer une présentation et un lien à transmettre par vos propres canaux autorisés, sans transfert de votre fichier clients. Êtes-vous la bonne personne pour discuter d'un pilote avec quelques installateurs volontaires?

## Facebook (préparé, non acheté ni diffusé)
- A : « Vous vendez… mais vous êtes tanné des leads de marde? Envoyez ça à votre directeur des ventes! »
- B : « Vos meilleurs vendeurs perdent-ils leur temps avec les mauvais prospects? »
Destination : qualification directeur (/directeur-des-ventes) après publication vérifiée. Texte long : voir campagne-directeur-des-ventes.md.

## Apporteurs — « Valorisez vos demandes non servies » (NON DIFFUSABLE)
Concept interne « On achète vos leads » : non diffusable avant conditions de rachat et budget approuvés. Aucune promesse de paiement, aucune collecte ni transfert de données de propriétaires : seulement intérêt professionnel et catégories/territoires agrégés. Positionnement exclusif conservé, jamais de leads partagés.

## Mesure
Distinguer queued / sent / delivered / paid. Suivre : paiements réels distincts + activation, recettes HT, livrés réellement, réponses qualifiées, coûts. Aucun gagnant A/B déclaré sur 5 contacts par variante.

## Blocages constatés le 2026-11-01 13:40 UTC
- Courriel : domaine d'envoi notify.unpro.ca en échec DNS (« send path not ready »). Correction requise dans More → Emails.
- SMS : OUTREACH_ENABLED=false ; gate autopilot gated=true (no_recent_e2e_pass, score opérationnel 30/95).
- CASL : 2 preuves revues par un humain sur 872, toutes deux courriel, hors segments ciblés ; 0 preuve SMS revue.
- Chauds : les 12 abandons checkout récents n'ont ni courriel ni téléphone.
