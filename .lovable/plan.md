# Finaliser le chat mobile Clara — référence du champ de saisie et validation finale

## Constat vérifié
- Le build est vert (`build OK`, 2026-09-21).
- Le champ de saisie du chat (`PromptInputTextarea`) est une fonction simple qui ne transmet pas la référence reçue. La console affiche donc l'avertissement React « Function components cannot be given refs » et le composer utilise un contournement par recherche DOM.
- Conséquence : le positionnement automatique sur la dernière ligne tapée et le maintien du curseur au-dessus du clavier reposent sur un repli, pas sur la référence réelle.

## Correctifs
1. **Transmettre la référence du champ de saisie**
   - Envelopper `PromptInputTextarea` dans `forwardRef` en conservant intégralement le comportement actuel : Entrée envoie, Maj+Entrée saute une ligne, collage de fichiers, retour arrière supprimant la dernière pièce jointe, mode contrôlé.
   - Ne rien changer d'autre dans ce fichier partagé.

2. **Nettoyer le contournement dans le composer Clara**
   - Utiliser la référence réelle pour le focus, l'auto-agrandissement et le défilement vers la ligne active; garder la recherche DOM uniquement comme filet de sécurité.
   - Aucun changement de logique de session, de médias ou de voix.

3. **Avertissements restants**
   - Corriger uniquement les avertissements de référence qui touchent le fil de conversation (message et contenu de message) si la correction est locale et sans risque. Les autres avertissements hors chat restent hors périmètre de ce P0.

## Validation
- Tests ciblés Clara mobile et continuité voix.
- Contrôle des types, lint critique, build.
- Vérification navigateur à 390 × 844 : champ de 1, 5 et 10 lignes, clavier ouvert, dernières lignes visibles, barre d'actions sans chevauchement, envoi, photo dans le même fil, passage texte → voix → texte.
- Console sans avertissement de référence provenant du chat.

## Garde-fous
- Aucune nouvelle session, table, route, fonction serveur ni parcours.
- Aucun changement Stripe, auth, RLS, données de production.
- Validation sur appareils physiques Android/iPhone reste une limite externe.
