# Roadmap UNPRO

## Fait (P0 acquisition)
- [x] Cause trouvée : les entreprises importées directement n'étaient jamais sélectionnées par l'agent (sélection limitée aux tables de scraping). Corrigé : sélection pilotée par la file, échéance seulement.
- [x] Envois réels vérifiés : 8 entreprises « débarras » contactées, 6 livraisons confirmées.
- [x] Panneau « Prospection aujourd'hui » (données réelles), état des agents, verdict, actions Lancer un cycle / Diagnostiquer, journal des cycles — dans Admin → Acquisition, lisible sur mobile.

## Fait (P0 activation gratuite)
- [x] Activation gratuite atomique hors Stripe : le parcours après connexion exécute la transaction canonique unique (rôle, fiche, réclamation, année gratuite, accompagnement) et n'affiche « Votre profil UNPRO est actif » qu'après confirmation serveur.
- [x] Chemin gratuit hérité réparé : plus d'écriture silencieuse sur des colonnes inexistantes.

## À faire ensuite
- [ ] Poursuivre jusqu'à 10 activations gratuites (cycle automatique aux 15 minutes).
- [ ] Élargir la découverte de nouvelles entreprises admissibles (bloquée par le coupe-circuit Google).
- [ ] Thème sombre par défaut sur l'accueil (logo actuel conservé).
- [ ] Animation de l'en-tête fixe au défilement.
- [ ] Mettre à jour l'article canonique « Les 3 soumissions, c'est terminé » avec sources, visuels éditoriaux, SEO et validation de production.

- [ ] Remplacer puis publier la vidéo finale Audit IA sur /entrepreneurs/audit-ia; vérifier lecture 16:9 et console.
