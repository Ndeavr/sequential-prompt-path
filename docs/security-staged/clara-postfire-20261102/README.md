# Clara — préparation hors déploiement, 2026-11-02

Statut : **PATCH PRÉPARÉ ET TESTÉ LOCALEMENT**, pas de fonctionnalité publiée. Aucun crédit Lovable utilisé, aucune écriture Supabase, aucun message externe, aucune demande cliente créée.

Base inspectée : `lovable-sync` à `638c6b5433b3c2d868389c9f0748c6866d694202`.
Spécification : [parcours complet](../../product/clara-isolation-apres-incendie-2026-11-02.txt).

## Livrable

`server.patch` étend le module canonique `insulationProject.ts` et son appel dans `alex-chat`. Les fichiers actifs ne sont pas modifiés : les changements Edge peuvent déclencher un déploiement automatique.

- Le contexte après incendie est une déclaration, pas une vérification.
- Questions distinctes sur accès, surfaces et étapes préalables, avec choix « inconnu ».
- Les valeurs structurées sont acceptées uniquement avec leur question précédente. Les réponses libres ambiguës demandent une clarification; elles ne deviennent pas une autorisation technique.
- Le contexte réutilise `alex_sessions.context_json.homeowner_insulation` puis la sanitisation existante vers `payload.project_context`.
- Les surfaces hors entretoit ne reçoivent pas de compatibilité d’entretoit par défaut.
- Le matching générique ne recommande aucun entrepreneur après incendie, même avec préparation déclarée complète. Il manque un contrat serveur de preuve de compétence après sinistre pour lever ce blocage.
- Le prompt reprend résumé corrigeable, consentement, anonymisation et absence de promesse de suivi sans job enregistré.

## Vérification reproductible

Depuis la racine, Node 24 :

```sh
node --test docs/security-staged/clara-postfire-20261102/check.mjs
```

Le test reconstruit les deux fichiers existants dans un dossier temporaire, vérifie et applique le patch uniquement là, puis exécute 14 tests synthétiques. Résultat : 14/14. `npm run verify:source` passé. Aucun fournisseur externe appelé.

La vérification locale ne prouve ni rendu mobile, ni persistance distante, ni disponibilité des entrepreneurs. Typecheck/build/Vitest complets non exécutés : dépendances du projet non installées. Le test de branche runtime est statique; les autres portent sur les fonctions reconstruites.

## Limites avant intégration

Ce patch est une base de collecte et de protection, pas le workflow complet. Ne pas l’appliquer seul en prétendant que la cliente recevra des offres.

1. Tester le rendu réel des choix et l’interprétation des réponses FR/EN/voix. La capture automatique est volontairement conservatrice et ne remplace pas l’extraction conversationnelle complète. Une question reformulée doit garder sa clé canonique plutôt que dépendre de l’égalité du texte. Préserver les corrections, changements de projet et réponses déjà connues.
2. Faire respecter la suspension accès interdit/inconnu dans `alex-qualify-turn` aussi : un retour `null` du sélecteur seul peut faire poursuivre la qualification générique. L’avertissement du prompt n’est pas un verrou d’état serveur. Ajouter le verrou au flux canonique avant déploiement.
3. Auditer tous les chemins de matching, notamment SQL/no-match : le refus de `evaluateInsulationRules` ne garantit pas leur couverture. Lier la vérification post-sinistre, surfaces, RBQ, assurance, territoire et disponibilité à des preuves serveur. Aucun booléen client ni profil payé ne peut lever le refus.
4. Vérifier soumission explicite, propriété du dossier, RLS, documents privés et consentement. Les appels existants ont été inspectés, leur fonctionnement distant n’a pas été testé.
5. Brancher recherche puis sollicitation anonymisée dans les files existantes. Réutiliser la politique de preuves automatique approuvée, sans fabriquer une signature humaine; revue humaine seulement pour les dossiers ambigus à potentiel élevé. Respecter suppressions, plafonds et contrôles actifs.
6. Relier réponse admissible confirmée → suivi client consenti via l’événement/job persistant existant, avec idempotence et statut honnête. Sans job enregistré, aucune promesse « je vous reviens ».

## Intervention Lovable ciblée à utiliser quand les crédits sont disponibles

Dans le projet existant `ba1eabf3-fd1c-40fe-9856-3812a70f9869`, partir du dernier `lovable-sync`. Lire ce dossier et la spécification liée. Réutiliser la préparation, sans reconstruire Clara ni créer un moteur/file/cron parallèle. Vérifier les conflits avant d’appliquer le patch. Achever les six points ci-dessus avec le minimum de modifications et sans nouvelle table si le modèle existant suffit. Conserver données déclarées et preuves vérifiées séparées. Tester avec dossiers synthétiques : collecte/reprise/corrections FR/EN, accès interdit, murs vs entretoit, qualification manquante, aucun partenaire, consentement refusé, erreur serveur, notification idempotente après réponse confirmée, mobile. Aucun SMS/courriel réel, paiement, campagne, changement de contrôles ou publication dans cette intervention. Rapporter les tests exécutés, fichiers modifiés et blocages exacts; ne pas annoncer de parcours complet sans preuve de bout en bout. Ne pas lancer d’audit général ni consommer de crédits pour refaire les tests locaux déjà présents.
