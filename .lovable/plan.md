## Problème

Quand `activeRole === "admin"`, **toute la navigation principale pointe vers `/admin`** :

- `BottomDockGlass.tsx` (mobile) — `Croissance`, `Profil`, `Compte` → `/admin`
- `SmartHeader.tsx` — logo → `/admin`
- `ProfileMenu.tsx` — lien `Mon compte` → `/admin`
- `MobileDrawer.tsx` — bouton compte → `/admin`
- `DrawerNavigationMobileIntent.tsx` — `dashboardTo` → `/admin`

Résultat : un admin ne peut plus naviguer dans le reste de l'app — chaque tap ramène sur `/admin`.

## Correction (UI / présentation seulement)

Traiter `admin` comme un **superviseur**, pas comme un rôle utilisateur final :
- Les onglets `Accueil`, `Croissance`, `Profil`, `Compte` doivent l'envoyer dans les surfaces normales (`/`, `/dashboard`, `/dashboard/account`)
- `/admin` reste accessible via :
  1. Le **switcher de rôle** déjà présent dans `ProfileMenu`
  2. Un **lien dédié "Admin"** ajouté dans `ProfileMenu` quand l'utilisateur a le rôle admin

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/home-unicorn/BottomDockGlass.tsx` | Retirer les branches `activeRole === "admin" ? "/admin"`. Admin → mêmes paths que homeowner (`/dashboard`, `/dashboard/account`). |
| `src/components/navigation/SmartHeader.tsx` (`getLogoDestination`) | `admin` → `/dashboard` (logo ne piège plus). |
| `src/components/navigation/ProfileMenu.tsx` | `accountPath` admin → `/dashboard/account`. Ajouter en haut du menu un lien permanent **"Admin"** → `/admin` visible si `ctx.user.roles.includes("admin")`. |
| `src/components/navigation/MobileDrawer.tsx` (ligne 139) | `admin` → `/dashboard/account`. |
| `src/components/navigation/DrawerNavigationMobileIntent.tsx` (`dashboardTo`) | `admin` → `/dashboard`. |

### Hors scope
- Pas de changement de guard / auth / RLS / backend
- Pas de modification du routage `router.tsx`
- Le post-login (`AuthReturnRouter` → `/admin`) reste inchangé : un admin qui se connecte arrive sur `/admin`, mais peut ensuite naviguer librement.

## Critère de succès
- En `activeRole = admin`, taper `Accueil/Croissance/Profil/Compte` ouvre la surface attendue (pas `/admin`)
- `/admin` reste accessible en un tap via `ProfileMenu` (lien Admin + role switcher)
- Aucun changement visuel sur les rôles `homeowner` / `contractor`
