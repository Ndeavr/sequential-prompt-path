## Objectif
Ajouter une 2e variante d'email cold outbound ("IA invisible") testable en A/B 50/50 contre la séquence actuelle, avec dual-CTA (OUI + tracked link vers `/pro/activate`).

## Changements

### 1. `src/lib/masterOutreachCopy.ts`
- Renommer la variante actuelle en `variant: "founder_value"`.
- Ajouter une nouvelle variante `variant: "ai_invisibility"` :
  - **Subject** : `{{first_name}}, est-ce que l'IA vous voit?`
  - **Preview** : `Vos clients demandent déjà à l'IA. Y êtes-vous?`
  - **Body** : copy fourni intégralement (paragraphes courts, ton conservé).
  - CTA principal : `[Créer mon profil IA]` → `[TRACKED_CTA]` (résolu vers `unpro.ca/r/{id}` → `/pro/activate?utm_campaign=ai_invisibility`).
  - Footer dual-CTA OUI auto-injecté par `outreachDispatch` (déjà en place).
- Exporter `OUTREACH_VARIANTS = ["founder_value", "ai_invisibility"]` + helper `pickVariant(prospectId)` qui hash → 50/50 déterministe (stable par prospect).

### 2. `supabase/functions/_shared/outreachDispatch.ts`
- Appeler `pickVariant(prospect.id)` quand `variant` n'est pas explicitement passé.
- Persister `variant` dans `acquisition_events.metadata.variant` ET dans `contractor_outreach_logs.variant` (nouvelle colonne).
- Forcer `utm_campaign={variant}` dans le tracked link.

### 3. Migration DB
- `ALTER TABLE contractor_outreach_logs ADD COLUMN variant TEXT;`
- `ALTER TABLE acquisition_tracking_links ADD COLUMN variant TEXT;`
- Index `(variant, created_at)` pour les requêtes A/B.

### 4. UI Admin `/admin/outreach-health` (nouveau panneau `ABTestPanel.tsx`)
- Tableau comparatif par variante sur 7/30j :
  - Sends, Delivered, Opened, Clicked, Replied (OUI), Activated, Paid.
  - CTR + Reply rate + Conversion finale.
  - Badge "Winner" si écart ≥ 20% avec p < 0.05 (test z basique côté client).
- Toggle "Forcer variante" (override 50/50) pour tests manuels.
- Bouton "Envoyer test réel" avec sélecteur de variante → `email-daily-selftest` étendu pour accepter `variant`.

### 5. Panneau test admin existant (`PageAdminAcquisitionTests.tsx`)
- Ajout sélecteur `variant` (`founder_value` | `ai_invisibility` | `auto`).
- Preview rendu HTML/text côté UI avant envoi.

### 6. Validation
- `ctaTracker.ts` : aucune modif requise — la nouvelle copy passe déjà la règle dual-CTA (OUI + 1 lien tracké).
- Test E2E `acq-e2e-real` : ajouter une étape qui envoie 1 email par variante et vérifie que `variant` est bien tagué dans `acquisition_events`.

## Non-touché
- Pas de nouvelle landing page (CTA pointe sur `/pro/activate` existant, fondateur 149$).
- Séquence SMS inchangée.
- Cron/autopilot inchangés — ils consommeront automatiquement la nouvelle variante via `pickVariant`.

## Succès
- 50/50 split déterministe vérifiable dans `acquisition_events`.
- Dashboard `/admin/outreach-health` affiche les 2 variantes côte-à-côte avec métriques live.
- Bouton "Envoyer test réel" fonctionne pour les 2 variantes (gateway Resend `lovc_`).
