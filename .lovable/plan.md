# Fixes — Homepage (`PageHomeUnicorn`)

## 1. Top menu (header buttons) — actuellement inertes

Dans `src/pages/PageHomeUnicorn.tsx` → `HeaderFloatingGlass`, les boutons n'ont aucun `onClick` (sauf QR et le burger). Résultat: rien ne se passe au tap.

Branchements à ajouter:

- **FR / Langue** → bouton désactivé visuellement pour l'instant (FR-only, conforme à la politique fr-CA). On retire le `ChevronDown` et le `aria-haspopup`, ou on le transforme en pastille statique non cliquable. *(Choix par défaut: pastille statique.)*
- **Bell / Notifications** → `navigate("/notifications")` si la route existe, sinon ouvrir le centre de mémoire `/memory` (déjà présent). Confirme la destination ci-dessous.
- **QR** → déjà branché sur `/qr` (OK).
- **Profil (avatar P + chevron)** → ouvrir un menu (shadcn `DropdownMenu`) avec: *Mon profil* (`/profile`), *Mon compte* (`/account`), *Mon QR* (`/qr`), *Déconnexion* (`/logout`). Mêmes liens que le burger pour cohérence.
- **Burger (Menu)** → déjà OK via `Sheet`.

## 2. Doublon "Espace entrepreneurs"

Dans `ContractorAippSplit` (lignes ~492-543), la mention apparaît **deux fois**:
- Eyebrow externe au-dessus de la carte (ligne 499).
- Badge interne en haut de la carte (ligne 542).

→ **Retirer l'eyebrow externe** (lignes 493-509). On garde uniquement le badge interne `✦ ESPACE ENTREPRENEURS` qui est dans le contexte premium dark de la carte.

## Questions

1. **Bell** → destination préférée: `/notifications` (à créer plus tard), ou réutiliser `/memory` (Centre de mémoire existant) pour l'instant?
2. **Bouton FR** → on le rend statique (pas de menu) ou on le retire complètement du header mobile pour gagner de l'espace?

## Fichiers touchés
- `src/pages/PageHomeUnicorn.tsx` — header buttons + suppression eyebrow doublon.
