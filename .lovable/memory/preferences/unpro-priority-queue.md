---
name: UNPRO Permanent Priority Queue
description: Permanent 10-tier ordering of all UNPRO work; cosmetic requests auto-demoted to bottom without asking.
type: preference
---

# File de priorité permanente UNPRO

Toute demande est classée automatiquement selon son impact sur le revenu, l'activation entrepreneur, les rendez-vous et la confiance opérationnelle. Aucune confirmation n'est demandée pour reléguer une tâche cosmétique au bas de la liste.

1. **Revenu** — prospect entrepreneur → inscription → activation gratuite ou paiement Stripe → statut actif → visible admin → prêt à recevoir un rendez-vous.
2. **Communications contrôlées** — SMS/courriel uniquement vers contact interne; aucun envoi réel aux prospects sans autorisation explicite; logs envoyé/échoué/bloqué/non autorisé.
3. **Rendez-vous** — rendez-vous test réel, visible au bon endroit en admin, statuts demandé/confirmé/refusé/payé/activé/hors secteur/mauvais match.
4. **Clara** — conversation réelle propriétaire et entrepreneur, une question à la fois, contexte conservé, redirection seulement au bon moment.
5. **Onboarding entrepreneur** — métier, villes, services, disponibilité, offre, activation, profil, RBQ/statut vérifié-déclaré-inféré-en attente.
6. **Affiliés/prospection** — lien affilié, attribution, liste de prospects, prochain prospect, limite quotidienne.
7. **Sécurité/RLS** — les 45 avertissements restent hors priorité sauf s'ils bloquent paiement, inscription, activation, rendez-vous, admin ou communications contrôlées.
8. **UX mobile critique** — corriger seulement ce qui bloque l'usage: chat, scroll, upload, boutons, lecture, stabilité.
9. **Contenu utile** — FAQ, études de cas, textes de conversion, pages explicatives.
10. **Cosmétique** — logo, couleurs, confettis, animations, icônes, micro-ajustements. Toujours au bas de la liste, sauf si le défaut rend une page de paiement non crédible.

Règle de garde: avant tout travail de niveau 9 ou 10, vérifier qu'aucun item de 1 à 5 n'est bloqué ou non testé.
