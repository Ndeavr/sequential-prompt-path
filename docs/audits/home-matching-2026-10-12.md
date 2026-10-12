# Accueil — parcours compatibles et impact séparé

## Modifications
- Route vérifiée : `/` et `/index` → HomeWithFeatureFlag → PageHomeLight.
- PageHomeLight remplace HomeImpactCounter par SectionMatchingPaths dans HomeLightSections; Clara reste montée, sans changement de son chat/voix.
- Deux cartes FR/EN, textes approuvés, boutons du design system et événements existants `contractor_entry_click` / `hero_find_pro_click`.
- Entrepreneur → `/entrepreneur/devis-personnalise`, formulaire existant → `/entrepreneur/plan-personnalise/:quoteId` → EntryActivation350Card pour les admissibles → connexion avec retour au devis → checkout serveur → confirmation webhook. Inspection du code, pas un paiement E2E.
- Propriétaire → composer Clara existant; si présent, le contrôle existant de retour propriétaire suspend le parcours entrepreneur sans effacer la conversation.
- `/impact` réutilise les trois cadrans, calcul serveur existant et animation 2 secondes. Suppression des statistiques statiques redondantes et de la date de départ : un scénario par parcours ne calcule pas un cumul temporel.
- Aucun changement backend, Stripe, promotions, OTP, SMS ou Voice; aucune publication demandée/exécutée.

## Preuves
- `bunx vitest run src/test/home-matching-paths.test.tsx src/test/impact-dials.test.tsx src/test/home-glossy-contract.test.ts src/test/entry-activation-350.test.tsx` : 21 tests passent. Premier passage : deux échecs de simulation IntersectionObserver; corrigé dans le test, relancé.
- Playwright Chromium local : `/`, `/index`, `/impact`, 360/390/1280 pixels, deux cartes, aucun cadran accueil, aucun débordement horizontal, CTA entrepreneur ouvre le formulaire réel, CTA propriétaire focalise le composer existant, anglais et reduced-motion vérifiés; aucune erreur JavaScript.
- Captures inspectées; animations d’entrée conservent le texte visible avant intersection, sans espace vide si le titre est hors écran au premier scroll.
- Journal de compilation automatique : build OK. Pas de compilation ni typecheck manuels (contrôles gérés par l’environnement).

## Limites
- Android/iOS physiques, clavier réel, audio et inscription/paiement authentifiés non testés dans cette tâche.
- Aucun paiement, envoi ni publication. Les blocages commerciaux et de sécurité préexistants ne sont pas levés par cette modification de présentation.