# Cadrans d’impact — correctif ciblé

## Résultat et provenance
- Surface confirmée : `/` et `/index` → `PageHomeLight` → `HomeImpactCounter`. Méthode : `/impact#calcul`.
- Aucun total sectoriel validé dans les sources existantes. Le modèle `counterEngine` extrapole des volumes et des économies publicitaires hypothétiques : il n’est pas utilisé pour ces cadrans.
- Réutilisation du RPC public existant, avec son actualisation de 60 secondes; seuls les coefficients par parcours et les hypothèses sont affichés. Aucun changement serveur.
- Scénario illustratif actuel : 1,5 h propriétaire + 2 h entrepreneur = 3,5 h. Hypothèses internes non mesurées, non gains garantis. Ni les volumes UNPRO ni un cumul mondial ne sont revendiqués. Aucun montant monétaire inventé.
- Animation de 0 à la cible en 2 secondes, une fois à la première visibilité par visite montée. Pas d’accroissement lié au temps. Réduction des animations respectée; valeurs accessibles stables, sans annonces à chaque image. Nettoyage des observateurs et images d’animation.

## Fichiers fonctionnels
- `src/components/impact-counter/HomeImpactCounter.tsx`
- `src/components/impact-counter/impact-dials.css`
- `src/lib/impactScenario.ts`
- `src/pages/PageImpactCounter.tsx`
- `src/test/impact-dials.test.tsx`

## Vérifications effectuées
- `bunx vitest run src/test/impact-dials.test.tsx` : 8 tests réussis (provenance, progression, visibilité unique, nouvelle visite, actualisation, accessibilité, réduction des animations, données absentes et nettoyage).
- ESLint ciblé sur les quatre fichiers TypeScript : réussi. `git diff --check` : réussi.
- Compilation automatique : `build OK`, journal 23:26:03 UTC après les modifications fonctionnelles. Aucune compilation/typecheck manuelle lancée.
- Chromium en aperçu local : 1280 × 1800, 390 × 844 et 320 × 740. Animation intermédiaire puis cibles stables vérifiées; aller-retour méthode/accueil réussi; aucun débordement horizontal. Réduction des animations vérifiée à 320 px. Captures examinées.
- Limite : Android/iOS physiques non testés; parcours authentifiés, voix et paiement non retestés, car non modifiés. Le cadran utilise des arcs décoratifs, pas une jauge de performance ou un pourcentage mesuré.

## Publication
Aucune publication ni écriture de données. Clara, onboarding, SMS, Stripe, paiement 350 $ et navigation globale inchangés.