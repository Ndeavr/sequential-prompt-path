## 3 correctifs page Partenaire Signature (ISR)

### 1. Nombre d'avis corrigé → 320 (4.9)
Migration data-only sur `signature_partners` pour `slug = 'isolation-solution-royal'`:
```sql
UPDATE public.signature_partners
SET reviews_summary = '{"average":4.9,"count":320,"source":"Google"}'::jsonb
WHERE slug = 'isolation-solution-royal';
```

### 2. Galerie — placeholders marqués "Photos à venir"
Modifier `src/pages/partners/PageSignaturePartner.tsx` (section GALLERY, lignes 193-214):
- Ajouter un flag `media.gallery_verified` (booléen, défaut `false`)
- Si `gallery_verified !== true`, afficher overlay sur chaque image:
  - voile sombre semi-opaque
  - badge centré "Photos à venir" (style `bg-amber-500/15 text-amber-700 border-amber-500/30`, pill 999px)
  - désactiver le lightbox (`onClick` no-op, `cursor-default`)
- Sous-titre de section: "Réalisations récentes" → "Réalisations récentes" + petit caption `text-xs text-muted-foreground`: "Exemples illustratifs — vraies réalisations en cours d'ajout."
- Quand l'admin uploadera de vraies paires avant/après, il passera `media.gallery_verified = true` et les overlays disparaîtront automatiquement.

Aucune migration nécessaire (clé jsonb optionnelle).

### 3. Retirer le créneau 09:00 (ISR commence à 11:00)
Migration sur `partner_calendar_availability` pour retirer "09:00" de tous les slots futurs d'ISR:
```sql
UPDATE public.partner_calendar_availability
SET slots = (SELECT jsonb_agg(s) FROM jsonb_array_elements_text(slots) s WHERE s <> '09:00')
WHERE partner_id = (SELECT id FROM public.signature_partners WHERE slug='isolation-solution-royal')
  AND date >= CURRENT_DATE;
```
Les créneaux affichés deviendront `11:00 · 13:00 · 15:00`.

> Note: tu n'as pas répondu à la question horaires précise — je retire uniquement 09:00 comme suggéré par ton message. Dis-moi si tu veux aussi modifier 13:00/15:00 ou définir une plage différente (ex. lun-ven 11:00-16:00).

### Fichiers / actions
- Migration #1: `UPDATE signature_partners` (count 320)
- Migration #2: `UPDATE partner_calendar_availability` (retire 09:00)
- Edit: `src/pages/partners/PageSignaturePartner.tsx` (overlay "Photos à venir" + caption)
