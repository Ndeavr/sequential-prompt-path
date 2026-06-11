## Objectif

Éliminer les pages « Cette fonctionnalité arrive bientôt » sur les destinations du menu utilisateur (`Mon profil`, `Mon compte`, `Mon QR Code`, `Déconnexion`) et livrer en vague 1 des pages réellement fonctionnelles. Vagues 2 et 3 ajoutées ensuite.

## Diagnostic

Le dropdown « Mon espace » de `PageHomeUnicorn.tsx` (et la version footer) pointe vers :
- `/profile` → **n'existe pas** → fallback placeholder
- `/account` → redirige vers `/dashboard/account` (page existe mais protégée `homeowner`)
- `/qr` → `QrGeneratorPage` (existe)
- `/logout` → **n'existe pas** → fallback placeholder

Donc même `Déconnexion` ne déconnecte pas — c'est la priorité absolue.

---

## Vague 1 — Priorité absolue (livrée immédiatement)

### 1. Déconnexion réelle (`/logout`)

- Nouvelle route publique `/logout` → `PageLogout.tsx`
- Au mount : `await supabase.auth.signOut()` (via `useAuth().signOut`)
- Toast succès : « Vous avez été déconnecté »
- Toast erreur : « Impossible de fermer votre session »
- Redirection `/` après 600ms
- Aussi : remplacer `navigate("/logout")` du dropdown par appel direct `signOut()` pour fallback instantané

### 2. `/profile` — Mon profil (homeowner + contractor)

Nouvelle page `src/pages/PageMonProfil.tsx` (route publique mais protégée auth) :
- En-tête : avatar (upload via Supabase storage `avatars` bucket si présent, sinon initiales), nom, email, type de compte
- Champs éditables (inline + bouton « Modifier ») : prénom, nom, téléphone, langue (FR/EN)
- Si `activeRole === "homeowner"` : nb propriétés (count `properties`), liste adresses, lien « Voir mon Passeport Maison »
- Si `activeRole === "contractor"` : nom entreprise, RBQ, région, services (lecture depuis `contractors`)
- Sauvegarde via `useUpdateProfile`
- Réutilise `useProfile`, `useNavigationContext`

### 3. `/account` — Mon compte

Refonte `src/pages/dashboard/AccountPage.tsx` (et route `/account` directe, non plus redirect) avec 3 sections :
- **Sécurité** : changer email (`supabase.auth.updateUser`), changer téléphone, statut connexions Google/Apple (lecture `user.app_metadata.providers`)
- **Notifications** : toggles SMS / Email / Push (table `notification_preferences` si existe, sinon `profiles.notification_*`)
- **Confidentialité** : bouton « Exporter mes données » (téléchargement JSON via edge function existante ou client-side dump des tables user), bouton « Supprimer mon compte » (modal confirmation → edge function `delete-account` si existe, sinon RPC `request_account_deletion`)

Route `/account` désormais accessible aux 2 rôles (homeowner + contractor), pas seulement homeowner.

### 4. `/qr-code` — Mon QR Code

Nouvelle page `src/pages/PageMonQRCode.tsx` (route `/qr-code`, garder `/qr` comme alias) :
- Titre : « Mon Passeport UNPRO »
- QR Code centré (lib `qrcode.react` déjà présente sinon `qrcode`) pointant vers `https://unpro.ca/u/{referral_code}` depuis `useReferralProfile`
- Boutons : Télécharger PNG (canvas → blob), Télécharger PDF (`jspdf`), Partager (`navigator.share` avec fallback copy), Imprimer (`window.print()`)
- Section secondaire « Bientôt » : QR panneau électrique, QR immeuble, QR condo (cartes désactivées, pas de placeholder plein écran)

### Mise à jour du menu

Dans `src/pages/PageHomeUnicorn.tsx` :
- `/profile` reste mais résout maintenant
- `/account` reste
- `/qr` → `/qr-code`
- Déconnexion : remplacer `navigate("/logout")` par `signOut()` direct + toast (le `/logout` reste comme route de secours)

---

## Vague 2 (suivante, pas dans ce build)

- `/agenda` : calendrier rendez-vous (réutilise `HomeownerAppointments` et `pro/appointments`)
- Refonte tableau de bord en « Mon centre de contrôle »

## Vague 3 (suivante)

- `/mes-proprietes` (Passeport Intelligence détaillé)
- `/documents` (coffre documentaire)
- `/historique-alex` (conversations + recommandations)

---

## Détails techniques

**Fichiers créés**
- `src/pages/PageLogout.tsx`
- `src/pages/PageMonProfil.tsx`
- `src/pages/PageMonQRCode.tsx`

**Fichiers modifiés**
- `src/app/router.tsx` : ajouter `/logout`, `/profile`, `/qr-code`, élargir `/account` à `authenticated` (pas seulement homeowner)
- `src/pages/dashboard/AccountPage.tsx` : refonte 3 sections
- `src/pages/PageHomeUnicorn.tsx` : remettre Déconnexion sur `signOut()` direct + mise à jour des liens

**Dépendances**
- `qrcode.react` (vérifier sinon ajouter), `jspdf` (vérifier sinon ajouter)

**Contraintes respectées**
- FR-CA, design Cinematic Dark sur surfaces dashboard / Warm Neutral si page publique
- `useProfileCompletionGate` non touché
- Aucune mention « bientôt » sur ces 4 routes
- Lisibilité tokens `--text-*`, pas de `text-gray-*`
- `permissionManager` non sollicité (pas de mic/cam ici)

## Succès

- Cliquer `Mon profil` / `Mon compte` / `Mon QR Code` / `Déconnexion` depuis le dropdown affiche une page fonctionnelle, jamais le placeholder.
- Déconnexion ferme réellement la session Supabase et redirige vers `/`.
- QR Code téléchargeable PNG + PDF + partageable.
- Profil et compte éditables et persistés.
