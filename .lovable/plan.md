
## Contexte

La homepage `/` (`PageHomeUnicorn.tsx`) déborde sur mobile (cards "Téléverser une photo" / "Analyser une soumission" coupées, capture utilisateur à 384px). Le bouton QR header pointe vers `/scan` (qui redirige vers diagnostic-photo) — il n'y a pas de page `/qr` ni de générateur QR utilisateur. L'infra DB existe déjà : `qr_user_links` (avec `short_code`, `destination_url`, RLS user/admin), `qr_scans` (référence `link_id`). On consolide dessus — pas de nouvelle table.

## Objectif

1. Compacter la homepage mobile (zéro débordement).
2. Restaurer un item "QR Code" cliquable → page `/qr` (générateur).
3. Brancher tracking via `qr_user_links` + `qr_scans` existants + route `/r/:short_code`.
4. Vue admin des QR.

---

## 1. Homepage mobile compacte

**Fichier** : `src/pages/PageHomeUnicorn.tsx`

Remplacer le bloc 2-cards "Téléverser/Analyser" (lignes 241-284) + section catégories par **une seule grille compacte d'actions** :

```
[ Diagnostic photo ] [ Soumission ] [ QR Code ]
[ Isolation ] [ Toiture ] [ Thermopompe ] [ Humidité ]
```

- Composant nouveau `HomeQuickActionsGrid` (interne au fichier).
- `grid-cols-4` mobile avec `gap-2`, cards 72×80px : icône 22px en haut, label 11px 1 ligne, `truncate`.
- Si plus de 8 items : scroll horizontal `snap-x` (pas le cas ici).
- Garder en gros bouton uniquement "Parler avec Alex" (CTA prioritaire).
- Retirer la double card secondaire qui débordait.

Items :
| Label | Route | Icon |
|---|---|---|
| Diagnostic photo | /diagnostic-photo | ImageIcon |
| Soumission | /analyser-soumissions | FileText |
| QR Code | /qr | QrCode |
| Isolation | /probleme/isolation | HomeIcon |
| Toiture | /probleme/toiture | Hammer |
| Thermopompe | /probleme/thermopompe | Thermometer |
| Humidité | /probleme/humidite | Droplets |

Header : QR icône passe de `/scan` → `/qr`.
Sheet menu : item "Scanner QR" → "QR Code" `/qr`.

## 2. Page `/qr` — Générateur QR utilisateur

**Nouveau** : `src/pages/QrGeneratorPage.tsx`, route ajoutée `src/app/router.tsx`.

Flow :
1. Si non connecté → `AuthOverlayPremium` (déjà existant) avec retour `/qr`.
2. Sélecteur de type QR (chips) :
   - `contractor_booking` → destination `/pro/{userId}/book`
   - `home_passport_gold` → `/dashboard/passport`
   - `diagnostic_photo` → `/diagnostic-photo?ref={short}`
   - `quote_analyzer` → `/analyser-soumissions?ref={short}`
   - `contractor_profile` → `/pro/{userId}`
   - `affiliate` → `/?ref={short}`
3. Bouton "Générer mon QR" → INSERT dans `qr_user_links` (le `short_code` est auto-généré par la DB).
4. Affichage : QR rendu via `qrcode.react` (déjà packagé) pointant vers `https://unpro.ca/r/{short_code}`, boutons Télécharger PNG / Copier le lien / Partager.
5. Liste "Mes QR" sous le générateur (lecture `qr_user_links` user) avec compteur `scans_count` (sous-requête `qr_scans` group by link_id) et toggle `is_active`.

## 3. Tracking — Route `/r/:short_code`

**Nouveau** : `src/pages/QrRedirectPage.tsx` montée sur `/r/:short_code` (la route `/r/:refCode` existe déjà → `ReferralLandingPage`; on la remplace par redirection silencieuse + tracking).

Logique :
1. SELECT `qr_user_links` où `short_code = param` et `is_active = true`.
2. INSERT `qr_scans` { link_id, intent_slug, variant, user_agent, source:'qr' } (table existe, RLS permissive insert).
3. Set `localStorage.qr_referrer_code` + `qr_code_id` + `source=qr` (attribution).
4. `window.location.replace(destination_url)`.

Si introuvable → redirige `/` avec toast.

## 4. Mini-migration (extension seulement)

Une seule migration pour rester aligné avec l'existant :

```sql
ALTER TABLE public.qr_user_links
  ADD COLUMN IF NOT EXISTS qr_type text DEFAULT 'affiliate',
  ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS idx_qr_user_links_active ON public.qr_user_links(user_id, is_active);
```

Pas de nouvelles tables. `qr_user_links` + `qr_scans` couvrent tout le brief (le brief demande `user_qr_codes` + `qr_scan_events` mais les équivalents existent déjà — on consolide).

## 5. Admin

**Nouveau** : `src/pages/admin/PageAdminQrCodes.tsx` route `/admin/qr-codes`.

Tableau : owner email (join profiles), `qr_type`, `short_code`, `destination_url`, total scans (count `qr_scans`), dernier scan, `is_active`, bouton toggle (UPDATE `is_active`). Filtres : type, actif/inactif. Pagination 50.

Ajouter entrée dans la sidebar admin (chercher `src/components/admin/AdminSidebar*` ou équivalent — link "QR Codes").

## 6. Critères de succès

- Aucun élément coupé à 384px sur `/`.
- Item "QR Code" visible (grille homepage + header + sheet menu).
- `/qr` génère un short_code unique par clic, affiche le QR scannable.
- Scan d'un QR → `/r/{short}` → insert dans `qr_scans` → redirection.
- `/admin/qr-codes` liste tous les QR et leurs scans.
- RLS déjà en place (user CRUD own + admin all).

## Détails techniques

- Pas de nouvel item layout dans bottom dock (le dock garde Accueil / Croissance / Alex / Profil / Compte).
- `qrcode.react` est déjà importé ailleurs (vérifier `package.json`); sinon `bun add qrcode.react`.
- `AuthOverlayPremium` réutilisé pour gating sans page séparée.
- Pas de modification des engines Alex, scoring, etc.
- Texte FR-CA conforme aux règles localisation.
