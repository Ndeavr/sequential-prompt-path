# Relance P0 de l’acquisition entrepreneur

## Objectif
Rendre opérationnel le parcours canonique existant, sans système parallèle :

```text
prospect réel → admissibilité → SMS unique → audit personnalisé → profil
→ plan personnalisé → paiement → activation → recommandabilité
```

Aucun lot de production ne sera envoyé avant la réussite d’un test réel vers la destination administrateur déjà configurée.

## Exécution

1. **Verrouiller le chemin canonique**
   - Désigner l’expéditeur partagé existant comme unique autorité Twilio.
   - Raccorder le lot `verified_contractor_prospects` à cet expéditeur, au callback canonique et aux journaux actuels.
   - Neutraliser les chemins historiques incompatibles dans l’orchestration, sans supprimer les données ni casser les anciens liens.

2. **Réparer la santé SMS et les reprises**
   - Corriger l’écart entre l’URL de callback envoyée et celle contrôlée par le diagnostic.
   - Conserver les contrôles CASL, STOP, suppression, numéro mobile, provenance, fenêtre d’envoi et idempotence.
   - Classifier les 262 échecs par code/source avant toute reprise; seuls les échecs explicitement temporaires seront admissibles.
   - Garder les ordonnanceurs d’envoi désactivés tant que le test complet n’est pas vert.

3. **Unifier le message et le lien personnalisé**
   - Utiliser le modèle court demandé, sans score ni promesse non prouvée.
   - Générer un jeton opaque existant, transmettre campagne/variante/affiliation, et diriger vers `/entrepreneurs/audit-ia`.
   - Préremplir seulement les données réelles avec provenance; ne jamais exposer un identifiant privé.

4. **Garantir la continuité jusqu’au revenu**
   - Vérifier et compléter la reprise du même prospect/session dans Clara, l’audit et l’onboarding.
   - Persister chaque réponse et reprendre au premier champ incomplet.
   - Réutiliser le calcul de plan, les promotions admissibles, le paiement et l’activation existants.
   - Bloquer la recommandabilité tant que paiement, profil et conformité obligatoire ne sont pas confirmés.
   - Conserver une relance administrative idempotente lors d’un paiement abandonné.

5. **Réparer les mesures et le contrôle opérateur**
   - Faire lire au tableau d’administration le stock réel et chaque étape canonique du funnel.
   - Exclure les tests/simulations des indicateurs commerciaux.
   - Afficher les causes d’échec, les callbacks manquants et l’état exact du verrou de lot.

6. **Valider avant déverrouillage**
   - Tester téléphone, suppression, idempotence, jeton et continuité.
   - Envoyer un seul SMS au numéro administrateur configuré; attendre l’état fournisseur, ouvrir le lien et confirmer l’événement d’arrivée.
   - Tester le parcours mobile, la reprise, Clara texte/voix, le plan et le paiement sans déclarer un faux succès de production.
   - Autoriser ensuite un premier lot maximal de 10 prospects : vérifiés selon les règles existantes, qualité ≥ 80, provenance publique, mobile confirmé, non supprimés, jamais contactés, sans échec terminal.

## Technique
- Étendre les tables, fonctions, vues, routes et composants existants uniquement.
- Appliquer les changements de schéma par migration avec permissions et sécurité existantes.
- Déployer seulement les fonctions modifiées et vérifier leurs journaux.
- Ne jamais activer un ordonnanceur général ni utiliser `force=true` pour contourner le test.
- Considérer toute configuration Twilio externe non vérifiable comme un blocage du lot, pas comme une permission d’envoyer.

## Critères de succès
- Un test approuvé produit un identifiant fournisseur, un callback traçable et une arrivée personnalisée enregistrée.
- Les données connues suivent jusqu’au profil et au plan.
- Le montant du plan est celui transmis au paiement et confirmé par le webhook.
- Le lot de 10 demeure impossible tant que les contrôles précédents ne sont pas verts.
- Le tableau expose les volumes réels de bout en bout, hors tests.
