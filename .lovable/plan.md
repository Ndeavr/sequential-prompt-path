A — PROMPT LOVABLE FINAL

1. CONTEXT
La page d’accueil mobile affiche actuellement l’image métier seulement dans l’aura autour de l’orbe Alex. Le screenshot montre que l’image doit occuper la hauteur visible de la première section, mais les textes du haut deviennent difficiles à lire.

2. OBJECTIVE
Créer un héro mobile plein écran où les images métiers sont visibles en grand, tout en gardant le titre, le sous-texte, l’orbe Alex, le badge et le CTA parfaitement lisibles.

3. USERS
- Propriétaires qui arrivent sur la page d’accueil mobile.
- Entrepreneurs qui découvrent rapidement Alex.
- Visiteurs organiques sur un écran étroit.

4. DELIVERABLES
- Modifier uniquement la section `HeroAlexCentered` et l’aura `AlexTradesAura`.
- Faire couvrir l’image sur toute la zone héro mobile.
- Ajouter des overlays sombres propres pour garantir la lisibilité.
- Garder l’orbe Alex centré et premium.
- Ne pas toucher aux autres sections, aux textes, au menu mobile, ni aux flows Alex.

5. LOGIC
- Transformer la section héro en surface `min-height` proche du plein écran mobile.
- Placer `AlexTradesAura` comme background absolu de toute la section, pas seulement dans le carré autour de l’orbe.
- Garder tous les contenus texte/orbe au-dessus via z-index.
- Ajouter un gradient vertical sombre : fort en haut pour le titre, équilibré au centre pour l’orbe, plus sombre en bas pour le badge/CTA.
- Conserver la rotation/crossfade actuelle des images.

6. DATA
Aucune migration.
Aucune table.
Aucune donnée backend.
Aucun changement analytics.

7. UI/UX
- Mobile-first.
- Image plein écran visible derrière Alex.
- Titre blanc lisible même sur image claire.
- Sous-texte lisible avec contraste suffisant.
- Orbe Alex visible sans être noyé dans l’image.
- Badge “Alex · Votre expert IA” lisible.
- CTA “Cliquez pour parler à Alex” lisible.
- Desktop conservé proprement avec largeur contrôlée.

8. COMPONENTS
Refactoriser :
- `src/components/home-simple/HeroAlexCentered.tsx`
- `src/components/home-simple/AlexTradesAura.tsx`

9. ACTIONS
- Déplacer l’aura image au niveau section.
- Ajuster la taille image pour `absolute inset-0` + `object-cover`.
- Retirer ou assouplir le masque qui cache trop le haut.
- Ajouter overlays : top readability, center depth, bottom readability.
- Ajuster espacements mobile pour que le texte reste dans la zone visible.

10. CONSTRAINTS
- Ne pas changer les textes.
- Ne pas changer le design global UNPRO.
- Ne pas modifier les prix/calculateur ISR dans cette intervention.
- Ne pas toucher au menu mobile.
- Ne pas ajouter de nouvelles images.
- Ne pas casser la rotation existante.

11. SUCCESS
Terminé quand :
- Les images métiers remplissent visuellement la section héro sur mobile.
- Le titre et le sous-texte sont clairement lisibles.
- L’orbe Alex reste le point focal.
- Aucun contenu important n’est caché par la navigation mobile.
- L’expérience reste premium, sombre, rapide et claire.

12. TASKS
- Refactoriser `AlexTradesAura` pour support `variant="heroBackground"` ou un rendu plein écran équivalent.
- Mettre `HeroAlexCentered` en section plein écran mobile avec background image absolu.
- Ajouter gradients/vignettes de lisibilité.
- Ajuster le container de l’orbe pour ne plus limiter l’image à 420px.
- Valider visuellement à 384x709 mobile.