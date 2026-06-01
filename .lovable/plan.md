# Remove contractor directory exposure — Alex-only entry

## Problem
UNPRO ne fournit pas de répertoire/recherche d'entrepreneurs. L'utilisateur passe uniquement par Alex. Or:
1. **PageHomeUnicorn → ContractorAippSplit** — "Voir mon AIPP" pointe vers `/entrepreneur/aipp` (route inexistante → tombe sur `ContractorSeoPage` qui affiche "Entrepreneur non trouvé").
2. **NearbyContractorsCarousel** — affiche un lien "Voir tous les entrepreneurs vérifiés près de {city}" → `/trouver-entrepreneur` (répertoire).
3. **ContractorSeoPage not-found** — bouton "Voir tous les entrepreneurs" → `/entrepreneurs` (répertoire).

## Fixes (scope strictly UI/links — pas de logique métier)

### `src/pages/PageHomeUnicorn.tsx` (ContractorAippSplit, lignes 474-492)
- "Voir mon AIPP" → `to="/aipp"` (vraie page AIPP, pas le slug profil)
- "Activer mon profil" → conserve `/entrepreneur/join` (route valide)

### `src/components/home-unicorn/NearbyContractorsCarousel.tsx` (lignes 225-229)
- Supprimer entièrement le lien "Voir tous les entrepreneurs vérifiés près de {city}". Remplacer par un texte sobre non cliquable: **"Recommandation faite par Alex selon votre besoin."** (ton: Concierge Décisif, aucune mention de répertoire).

### `src/pages/seo/ContractorSeoPage.tsx` (ligne 137)
- Remplacer le bouton "Voir tous les entrepreneurs" (→ `/entrepreneurs`) par **"Parler à Alex"** → `/` (Alex orb prend le relais sur la home). Garder le titre "Entrepreneur non trouvé" + sous-texte existants.

## Hors scope
- Ne touche pas aux routes `/entrepreneurs*` ni `/trouver*` (utilisées ailleurs en SEO programmatique / admin). On retire seulement les CTA visibles côté utilisateur final qui exposent un répertoire.
- Pas de changement de logique Alex ni de routing.

## Success
- Sur la home, "Voir mon AIPP" ouvre la vraie page AIPP, pas une page 404.
- Aucun lien "Voir tous les entrepreneurs" visible dans le carrousel home ni dans l'état not-found d'un profil.
- Tout chemin de découverte d'entrepreneur passe par Alex ou par une page de profil directe (slug connu).
