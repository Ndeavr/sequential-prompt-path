# Audit IA — vidéo prioritaire et copie resserrée

## Résultat

Placer la vidéo existante immédiatement sous l’explication principale, avec l’aperçu extrait de cette même vidéo et une lecture automatique silencieuse après 650 ms. Garder le formulaire, les résultats réels, les routes et tous les mécanismes existants inchangés.

## Changements

1. Déplacer l’unique `AuditVideoBlock` dans le haut de `/entrepreneurs/audit-ia`, avant les étapes et les cartes inférieures; retirer son rendu actuel plus bas pour éviter tout doublon.
2. Conserver le MP4 durable actuel de 20,36 s, le format 16:9, les contrôles natifs, l’absence de boucle et l’image finale cliquable pour rejouer.
3. Remplacer le déclenchement au défilement par une tentative unique 650 ms après le montage, en mode silencieux et `playsInline`; ignorer proprement un refus du navigateur.
4. Extraire un nouvel aperçu propre entre 0,3 et 1,0 s du MP4 courant, vérifier visuellement le présentateur, l’héberger durablement et supprimer toute référence à l’ancienne image de maison.
5. Resserrer la copie visible : conserver le H1 et le CTA, remplacer les deux paragraphes principaux par une seule proposition claire, aligner l’étape d’audit et la description SEO sur « environ 60 secondes », puis retirer les phrases inférieures qui répètent sans apporter d’information.
6. Préserver la promesse « Des rendez-vous exclusifs, jamais des leads partagés. » et toutes les mentions de provenance, limites et absence de garantie.

## Vérification

- Confirmer à 390 px et sur ordinateur : vidéo proche du haut, aucun grand espace, aperçu réel 1920×1080, tentative de lecture entre 500 et 800 ms, silencieux, `playsInline`, contrôles présents, aucune boucle et image finale préservée.
- Confirmer une seule occurrence de `AuditVideoBlock` et aucune référence à l’ancien poster dans ce composant.
- Exécuter les vérifications de types et de construction, puis publier uniquement cette version sur le projet existant.
