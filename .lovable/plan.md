## Objectif
Transformer `/verifier-entrepreneur` en une page unique, éditoriale et haute conversion, avec un parcours réel complet : intake → session d'analyse → vérification réelle → rapport verrouillé → OTP → rattachement automatique → rapport privé dans le passeport propriétaire. Aucune autre page du site ne doit être modifiée.

Portée strictement limitée à :
- `src/pages/VerifyLandingPage.tsx` (page publique `/verifier-entrepreneur`)
- `src/pages/proprietaire/PageVerificationReport.tsx` (nouveau, `/proprietaire/verifications/:reportId`)
- 1 edge function `verify-attach-anonymous`
- 1 migration SQL (colonnes de rattachement + événement passeport)

## 1. Direction artistique de la page
Refonte visuelle complète, pas un simple ré-habillage :

- **Hero éditorial asymétrique** : à gauche, headline en Instrument Serif sur fond `landing-warm` (#F7F6F0), sous-titre concis, formulaire d'entrée immédiat (pas un CTA qui scrolle). À droite, mockup animé d'un **rapport de vérification réel** (carte glassmorphism avec les 3 scores animés en compteur : Identité, Confiance, Adéquation licence, badge RBQ vérifié, timeline registres).
- **Bandeau de preuves réelles** : logos monochromes des registres consultés (RBQ, REQ/NEQ, CNESST, GCR, Registre foncier) — visuels vectoriels, pas génériques. Aucun chiffre inventé.
- **Comparatif visuel "avant / après"** : split screen animé — à gauche, capture floutée d'une recherche Google confuse ; à droite, la carte de rapport UNPRO structurée. Slider clip-path déclenché au scroll.
- **Section "Ce que nous vérifions vraiment"** : 6 cartes asymétriques (identité légale, licence RBQ, assurances, historique CNESST, plaintes OPC, cohérence adresse/site). Chaque carte contient une micro-visualisation (badge, jauge, checklist), pas juste une icône Lucide.
- **Démonstration animée React** : mini séquence en 3 étapes qui joue une vraie exécution factice (spinner → checks qui se cochent → score qui monte). Composant local, aucune donnée fictive présentée comme réelle.
- **FAQ éditoriale** en accordéon typographique fort.
- **Sticky bottom CTA mobile** unique.

Toutes les images sont générées via `imagegen` en `standard`/`premium` (mockup rapport, comparatif avant/après, textures). Aucun stock, aucun visuel dupliqué avec les autres pages.

Mobile : test à 384px — hero empilé, mockup passe en dessous, formulaire toujours au-dessus du fold.

## 2. Parcours réel de bout en bout

**Étape 1 — Intake (page publique, non authentifié)**
Le formulaire du hero accepte : nom d'entreprise, RBQ, NEQ, téléphone, site web, ville, upload optionnel (soumission/facture, PDF ou image). Au moins un champ identifiant requis. Client-side : validation Zod. Un `visitor_id` est stocké en `localStorage` pour permettre le rattachement post-OTP.

**Étape 2 — Création de session réelle**
Appel de l'edge function existante `verify-contractor` avec le payload. Elle crée déjà une ligne dans `contractor_verification_runs`. On étend l'insert pour stocker `visitor_id` (colonne nouvelle) et, si un fichier est joint, on l'upload dans le bucket privé `verification-uploads` (à créer via `storage_create_bucket`) et on écrit le chemin dans `raw_findings_json.uploaded_files`.

**Étape 3 — Exécution réelle**
`verify-contractor` fait déjà les appels registres et calcule les 3 scores. Aucun mock. Le run passe en `verdict` final.

**Étape 4 — Rapport verrouillé pour non-connecté**
Le hook du hero interroge la ligne par `id`. Si `auth.uid()` est null, on affiche un `CardReportLocked` : les 3 scores flous, un CTA unique "Voir le rapport complet — connexion en 30s". Aucun contenu sensible visible.

**Étape 5 — OTP (email ou SMS)**
Bouton ouvre une modale utilisant les composants d'auth existants (`supabase.auth.signInWithOtp`). `emailRedirectTo` = `${origin}/verifier-entrepreneur?resume=<runId>&vid=<visitor_id>`. Aucune nouvelle infra auth ; on réutilise ce qui existe.

**Étape 6 — Rattachement automatique post-OTP**
Au retour, la page détecte `?resume=` + session `getUser()`. Elle appelle la nouvelle edge function `verify-attach-anonymous` qui, en `service_role` :
1. Vérifie que la ligne `contractor_verification_runs.visitor_id` correspond au `vid` fourni (ou que `user_id` est déjà null et le `visitor_id` matche).
2. Set `user_id = auth.uid()` sur la ligne.
3. Crée un `homeowner_profiles` si absent.
4. Insère un événement `homeowner_memory_events` de type `contractor_verification_completed` avec `report_id`, `contractor_business_name`, `verdict`, `scores`.
5. Retourne `{ report_id, redirect: '/proprietaire/verifications/<id>' }`.

**Étape 7 — Redirection vers le rapport privé**
La page redirige automatiquement vers `/proprietaire/verifications/:reportId`. RLS : `SELECT` autorisé uniquement si `user_id = auth.uid()`. Le rapport reste accessible après refresh et reconnexion.

**Étape 8 — Isolation**
Un autre utilisateur qui tente `/proprietaire/verifications/:reportId` reçoit un 404 propre via RLS (`maybeSingle()` → null → composant "Rapport introuvable").

## 3. Livrables techniques

### Migration (une seule)
```sql
ALTER TABLE public.contractor_verification_runs
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS attached_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cvr_visitor_id
  ON public.contractor_verification_runs(visitor_id)
  WHERE user_id IS NULL;

-- Policies: SELECT/UPDATE réservées à user_id = auth.uid();
-- INSERT anonyme conservé (déjà présent via edge function service_role).
CREATE POLICY IF NOT EXISTS "Owners read their runs"
  ON public.contractor_verification_runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```
Grants déjà en place ; vérifier `GRANT SELECT ON ... TO authenticated`.

### Edge function `verify-attach-anonymous`
- Auth : requiert JWT du homeowner (validé en code).
- Body : `{ run_id, visitor_id }`.
- Actions : match run_id ↔ visitor_id, `user_id IS NULL`, set `user_id`, upsert `homeowner_profiles`, insert `homeowner_memory_events`.
- Retourne `{ report_id }` ou erreur explicite.

### Extension `verify-contractor` (minime)
- Accepte `visitor_id` dans le body.
- Accepte `uploaded_file_path` (chemin storage). Aucune logique nouvelle : simple pass-through vers `raw_findings_json`.

### Bucket storage
`verification-uploads` — privé. Policies : INSERT anonyme (visitor_id path prefix), SELECT réservé à `auth.uid()` + service_role.

### Page publique `/verifier-entrepreneur`
Réécriture complète de `VerifyLandingPage.tsx` selon la DA ci-dessus. Composants nouveaux dans `src/features/verifierEntrepreneur/` :
- `HeroIntakeForm.tsx` (formulaire + upload)
- `LiveReportMockup.tsx` (animation)
- `RegistriesProof.tsx`
- `BeforeAfterCompare.tsx`
- `WhatWeVerifyGrid.tsx`
- `LiveDemoSequence.tsx`
- `CardReportLocked.tsx`
- `ModalOtpUnlock.tsx`
- `FaqEditorial.tsx`

### Page privée `/proprietaire/verifications/:reportId`
Nouveau fichier `src/pages/proprietaire/PageVerificationReport.tsx` + route dans `router.tsx` sous `AuthGuard`. Affiche : identité résolue, 3 scores, timeline registres, next steps, fichiers uploadés (signed URL).

### Routes ajoutées à `router.tsx`
Une seule ligne — aucune autre route touchée.

## 4. Test E2E réel (obligatoire avant PASS)
Un script Playwright headless dans `/tmp/browser/verify-e2e/` exécute :
1. `POST /verifier-entrepreneur` avec un vrai RBQ de test.
2. Vérifie la session créée en DB.
3. Vérifie le statut d'analyse.
4. OTP simulé via `supabase.auth.admin` (dans la fonction de test uniquement).
5. Rattachement + redirection.
6. Assertion sur `/proprietaire/verifications/:id` accessible.
7. Assertion sur `homeowner_memory_events` créé.
8. Test isolation : deuxième user → 404.

Sortie affichée dans le chat :
```
URL testée          : …
run_id              : …
statut analyse      : …
user_id rattaché    : …
report_id           : …
événement créé      : contractor_verification_completed
redirection OTP     : /proprietaire/verifications/<id>
isolation autre user: PASS
verdict global      : PASS
```

## 5. Critères de réussite
- Formulaire visible et fonctionnel au premier scroll, mobile 384px et desktop 1440px.
- 1 run réel créé par soumission, aucun mock.
- Rapport verrouillé pour anonyme, débloqué post-OTP.
- Rattachement automatique fiable (aucun click supplémentaire).
- Rapport accessible après logout/login.
- Aucun autre utilisateur ne peut lire le rapport.
- Aucune modification visible ou fonctionnelle sur les autres pages.
- Aucun texte de travail, aucun placeholder, aucun chiffre inventé.
- E2E script imprime `PASS` sur toutes les assertions.

## 6. Fichiers touchés (liste finale)
- Modifiés : `src/pages/VerifyLandingPage.tsx`, `src/app/router.tsx` (une ligne), `supabase/functions/verify-contractor/index.ts` (pass-through visitor_id).
- Créés : 9 composants sous `src/features/verifierEntrepreneur/`, `src/pages/proprietaire/PageVerificationReport.tsx`, `supabase/functions/verify-attach-anonymous/index.ts`, 1 migration SQL, script Playwright E2E.
- Assets : 3-4 visuels `imagegen` sous `src/assets/verifier-entrepreneur/`.

Aucun autre fichier ne sera modifié.
