# Header mobile UNPRO — contenu toujours visible

## Résultat
Créer un header d’accueil minimal qui conserve uniquement l’identité UNPRO et trois actions : **Alertes**, **QR** et **menu hamburger**. Déplacer la langue et l’accès au profil dans le menu, puis garantir que le menu et tous ses textes commencent toujours sous le header.

## Implémentation
- Modifier uniquement le header canonique et le tiroir de navigation existant; ne créer aucun deuxième header.
- Sur `/` et `/index`, retirer les sélecteurs FR/EN et le profil de la barre supérieure.
- Ajouter les boutons Alertes et QR existants avant le hamburger, avec zones tactiles d’au moins 44 × 44 px.
- Conserver le comportement actuel : Alertes ouvre les notifications pour une personne connectée ou la connexion pour un visiteur; QR ouvre la feuille de partage existante.
- Garder le sélecteur de langue dans le menu hamburger et y rendre l’accès au profil/connexion clairement disponible.
- Synchroniser la position haute et la hauteur utile du tiroir avec la hauteur réelle du header, dans ses états initial, compact et conversation active, incluant les marges sécuritaires mobiles.
- Garder le bouton de fermeture dans la barre supérieure afin qu’il ne recouvre jamais le contenu du menu.
- Préserver la transformation actuelle du logo au défilement et l’absence de saut de page.

## Validation
- Vérifier à 360, 390 et 430 px que le premier texte et les premiers contrôles du menu sont entièrement visibles.
- Vérifier le header initial, compact et avec Clara active.
- Vérifier ouverture/fermeture du menu, changement de langue, accès profil/connexion, Alertes et QR.
- Vérifier rotation mobile, zones tactiles, défilement interne du menu et absence de chevauchement.
- Mettre à jour les tests ciblés, puis confirmer types, lint critique et build automatisé.

## Contraintes
- Réutiliser `SmartHeader`, le tiroir, le sélecteur de langue, les notifications et la feuille QR existants.
- Ne modifier aucune route, donnée, session Clara ou logique métier.
- Ne pas publier sans demande explicite.
