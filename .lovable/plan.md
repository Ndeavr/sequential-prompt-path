## Objectif
Remplacer la carte AIPP statique de `PageHomeUnicorn` par un **carrousel premium des 5 entrepreneurs vérifiés les plus proches de l'utilisateur**, qui change automatiquement toutes les **4 secondes**, et compléter le header avec **QR + Hamburger** (cloche et profil conservés).

## 1. Header — `HeaderFloatingGlass` (dans `src/pages/PageHomeUnicorn.tsx`)
Ordre final : Logo · `FR/EN` · 🔔 Bell · **QR** · Profil P · **Hamburger**
- Bouton QR : ouvre `/scan` (route existante du scanner carte d'affaires)
- Bouton Hamburger (`Menu` lucide) : ouvre une `Sheet` (shadcn) latérale droite avec liens principaux (Accueil, Croissance, Profil, Compte, Déconnexion). Composant léger inline.
- Garder rendu actuel des autres boutons inchangé.

## 2. Geo "local to user"
Nouveau hook `src/hooks/useNearbyCity.ts` :
1. Lit `localStorage.unpro_user_city` si présent → retourne immédiatement.
2. Sinon `fetch("https://ipapi.co/json/")` (no key, CORS OK), prend `city` si `country_code === "CA"`, fallback `"Montréal"`.
3. Persiste dans `localStorage` (24h TTL).
Aucun appel au démarrage de page sans handler — exécuté dans `useEffect` du carrousel uniquement.

## 3. Nouveau composant `src/components/home-unicorn/NearbyContractorsCarousel.tsx`
- Utilise `usePublicContractorSearch({ city, sort: "trust" })` (hook existant) et garde les 5 premiers résultats vérifiés.
- Fallback si <5 résultats : remplit avec mocks réalistes locaux (Toitures LB inc., Isolation BioVert, etc.) déjà présents dans `mockProfessionals.ts`.
- Auto-rotate index toutes les **4000 ms** via `setInterval` ; pause sur `hover`/`focus`/`document.hidden`.
- Transition : `AnimatePresence` (framer-motion déjà installé) avec fade + slide-up 220 ms, easing `cubic-bezier(.22,1,.36,1)`.
- Indicateurs : 5 petits dots cliquables sous la carte (style premium light-blue).
- Carte identique au mockup actuel (badge AIPP, avatar gradient avec initiales, nom, étoile + rating + (count), badge "Profil vérifié", 3 mini-stats : Projets complétés / Satisfaction / Réponse moyenne).
- Mini-stats dérivées : `projects = review_count`, `satisfaction = round(rating/5*100)%`, `response = "2h"` (placeholder déterministe par id pour stabilité).
- A11y : `role="region" aria-label="Entrepreneurs recommandés près de vous"`, swipe tactile (touch start/end) pour passer carte suivante/précédente.

## 4. Intégration
- `ContractorAippSplit` : remplacer le bloc `AIPP card` (lignes ~412-…) par `<NearbyContractorsCarousel />`. Garder titre + CTAs ("Voir mon AIPP", "Activer mon profil") au-dessus.

## 5. Détails techniques
- Aucun changement DB, aucune edge function, aucun changement de tokens globaux.
- Respecte `.unicorn-theme` scope (toutes les couleurs en inline style cohérent avec le reste de la page).
- Pas de modification de `BottomDockGlass` ni de routing.
- Pas de modification d'`AlexVoiceContext`.

## Fichiers
- **Nouveau** : `src/hooks/useNearbyCity.ts`
- **Nouveau** : `src/components/home-unicorn/NearbyContractorsCarousel.tsx`
- **Édité** : `src/pages/PageHomeUnicorn.tsx` (header + remplacement bloc AIPP)

## Succès
- `/` affiche 5 cartes entrepreneur réelles de la ville détectée, rotation fluide toutes les 4 s, pause au survol.
- Header montre Logo · FR · 🔔 · QR · P · ☰, hamburger ouvre un menu latéral fonctionnel.
- Aucune régression sur le reste de l'app (cinematic dark, landing warm intacts).