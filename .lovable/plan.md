## Fix top menu mobile — homepage

**Problème** : sur mobile (384px) le header de `PageHomeUnicorn.tsx` contient 5 boutons (FR · Bell · QR · Profil · Hamburger) + le logo → débordement, items coupés à droite.

**Demande utilisateur** : tous les items du top menu (FR, bell, QR, profil) doivent rester visibles sur mobile. Le hamburger doit être **caché** sur mobile.

### Changements (`src/pages/PageHomeUnicorn.tsx` — fonction `HeaderFloatingGlass` uniquement)

1. **Cacher le hamburger sur mobile** : ajouter `hidden md:flex` sur le bouton `SheetTrigger` (reste accessible desktop). Le `<Sheet>` lui-même reste mais le déclencheur disparaît sous md.
2. **Compacter la rangée droite pour éviter l'overflow** :
   - `gap-2` → `gap-1.5`
   - Boutons icônes 40×40 → **36×36** (`w-9 h-9`) sur mobile, retour à 40 sur `md:`
   - Bouton FR : padding réduit (`px-2.5 py-1.5`), texte `text-[11px]`
   - Bouton Profil : avatar 28→26px, padding réduit
3. **Logo plus compact** : `pl-2 pr-3 py-1.5`, badge maison 24×24 au lieu de 28
4. **Wrapper header** : `px-3` au lieu de `px-4` sur mobile pour gagner 8px ; `gap-1.5` entre le bloc logo et la rangée actions
5. **Garde-fou** : ajouter `min-w-0` sur les conteneurs flex pour empêcher tout débordement, et `flex-shrink-0` sur les icônes

### Hors périmètre
- Aucun changement aux routes, à la logique du Sheet, ni au reste de la page.
- Pas de redesign visuel.

### Critères de succès
- Sur 384px : FR + Bell + QR + Profil tous visibles à droite, aucun item coupé.
- Hamburger absent sur mobile (`< 768px`), visible dès `md:`.
- Aucun débordement horizontal de la page.
