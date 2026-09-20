# P0 — Terminer la réparation de l'activation affiliée

## Cause exacte (vérifiée dans les journaux et la base, aujourd'hui 11:48)

Le premier blocage (enregistrement de la fiche affiliée) est bel et bien corrigé : la fiche est maintenant créée. L'activation échoue désormais une étape plus loin, à l'enregistrement de l'acceptation des conditions :

`partner_terms_acceptance violates foreign key constraint partner_terms_acceptance_partner_id_fkey`

Raison : la colonne « partenaire » de cette table pointe vers la table des **partenaires d'affaires**, pas vers les **affiliées**. La fonction y inscrit l'identifiant de la fiche affiliée, qui n'existe pas dans la table partenaires → refus de la base → erreur 500 → « Activation impossible pour le moment ».

De plus, l'index d'unicité ajouté précédemment porte sur (partenaire, rôle, version). Pour une affiliée, la colonne partenaire est vide, donc cet index ne peut pas dédoublonner : l'enregistrement idempotent n'est pas garanti.

## Correctif

1. **Enregistrer l'acceptation sur le bon lien.** Pour une affiliée, l'acceptation est rattachée au **compte utilisateur** (colonne prévue et déjà présente), la colonne partenaire reste vide. Aucun changement de contrainte étrangère, aucune donnée touchée (la table est vide aujourd'hui).
2. **Unicité correcte.** Migration non destructive : ajouter l'unicité sur (compte utilisateur, rôle, version des conditions) et retirer l'index inutile sur (partenaire, rôle, version). Rend l'activation rejouable sans doublon.
3. **Fonction d'activation.** Écrire l'acceptation avec compte utilisateur + rôle « affiliate » + version, en conflit sur la nouvelle unicité. Le contrôle d'erreur et le journal déjà en place restent : aucune activation silencieuse sans preuve d'acceptation.
4. **Message à l'écran.** Inchangé : français clair + bouton « RÉESSAYER », jamais d'erreur technique.

## Vérification immédiate après correction

- Rejouer l'activation de bout en bout avec le compte réel déjà bloqué à l'étape 4/4.
- Contrôle en base : une seule fiche affiliée pour ce compte, code et lien personnels présents, une ligne d'acceptation des conditions avec version, date, adresse IP et appareil.
- Deuxième clic sur le bouton : aucune deuxième fiche, aucune deuxième acceptation.
- Arrivée effective sur l'espace affilié (premier prospect réel, sinon état vide productif).
- Tests, vérification des types, lint, compilation.

## Ensuite (déjà planifié, inchangé)

P1 : retour arrière et reprise aux étapes 2 et 3, code/lien personnels visibles dès l'arrivée, attribution réelle des entrepreneurs référés et commissions, ville requise seulement si elle sert à la distribution.
P2 : bouton collant affiché après la sortie d'écran du premier bouton, états de chargement et messages d'erreur homogènes.

## Hors périmètre

Aucun envoi automatique de SMS ou courriel, aucun nouveau parcours parallèle, aucune modification Stripe, aucune suppression de données.
