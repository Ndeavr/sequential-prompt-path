# Diagnostic sécurité — painting-photos et règles « ouvertes à tous »

## Accès base de données
- Base inaccessible ce matin (« Database is possibly not accessible ») : psql et lecture directe ont échoué.
- Ce qui suit vient du **dernier scan enregistré (12:55 UTC)** et des **migrations du dépôt**. L'état réel des règles, le statut public/privé du dossier et le nombre de fichiers ne sont **pas revérifiés en base**.

## Alerte 1 — « A rule lets anyone download files in painting-photos » (critique)
- Règle : `Public can read guest painting photos` sur `storage.objects`, SELECT, rôle `anon`.
- USING : `bucket_id = 'painting-photos' AND (storage.foldername(name))[1] = 'guest'`.
- Effet : tout visiteur non connecté peut lister et lire **toutes** les photos invitées (dossier partagé `guest/`), y compris celles d'autres visiteurs. Bucket déclaré **privé** dans la migration (`public = false`), donc le risque vient de la règle, pas du bucket.
- Liée (avertissement) : `Public can upload painting photos to guest folder`, INSERT, `anon, authenticated`; WITH CHECK : connecté → dossier `auth.uid()`; anonyme → dossier `guest`. L'envoi anonyme n'est lié à personne.
- Autres règles (correctes) : `Owners can read their painting photos` et `Owners can delete their painting photos` (authenticated, dossier = `auth.uid()` ou admin).

### Parcours légitime touché
`/painting` (calculateur peinture) → `PaintingCalculatorPage.handlePhotoUpload` → `uploadPaintingPhoto(file, user?.id ?? "guest")` → envoi, puis `createSignedUrl` 7 jours → `analyze-painting-photo` reçoit l'URL signée.
Pour un invité, la création de l'URL signée dépend justement de la lecture `anon` sur `guest/`. La supprimer seule casserait l'analyse photo des invités.

### Correction minimale proposée
1. Migration (après accord, pas en prod sans autorisation) :
```sql
DROP POLICY "Public can read guest painting photos" ON storage.objects;
```
   L'envoi invité reste permis; aucune lecture anonyme.
2. `src/features/paintingCalculator/services.ts` : invité → envoi sous `guest/<uuid aléatoire>/<fichier>`, pas d'URL signée côté navigateur; renvoyer `storagePath`. Connecté → URL signée réduite à 1 h.
3. `supabase/functions/analyze-painting-photo/index.ts` : accepter `storage_path` (en plus de `image_url` pour compatibilité); valider le préfixe `painting-photos` (`guest/` ou `auth.uid()` de l'appelant), créer côté serveur une URL signée de 10 min avec le rôle service, analyser. Ne jamais renvoyer l'URL.
4. `PaintingCalculatorPage.tsx` : l'aperçu invité garde l'image locale (`URL.createObjectURL`), plus l'URL distante.
- Note : la fonction est en zone active, donc une modification se déploie automatiquement. Je la préparerai d'abord hors du dossier actif, sauf si tu m'autorises à la modifier directement.

### Validations synthétiques (fichier fictif, aperçu/test seulement)
- Anonyme : envoi `guest/` OK; liste/lecture/URL signée de `guest/…` → refusées.
- Propriétaire A : envoi dans `A/` OK, lecture/suppression propres OK.
- Autre compte B : lecture/suppression de `A/…` et `guest/…` → refusées.
- Admin : lecture/suppression OK.
- Fonction d'analyse : chemin `guest/` valide OK; chemin `A/` demandé par B ou par un anonyme → 403.

## Alerte 2 — « Some access rules let everyone through » (critique, regroupée)
- Le scan compte **55 constats critiques** de type `USING (true)` / `WITH CHECK (true)` (même famille que les 55–58 suivis). Exemples exacts : `capacity_snapshots` « Public read capacity snapshots »; `aipp_audit_recommendations` « Anyone can view… » + « Service role can insert… » (WITH CHECK true); `homeowner_project_diagnoses` « Insert/Read homeowner diagnoses »; `verification_runs` auth_insert/auth_select; `entrepreneur_scores` anyone_can_insert/read; `role_permissions` « Authenticated users can read permissions »; `voice_session_errors`, `onboarding_objectives`, `outbound_autopilot_recommendations`, etc.
- Selon la règle du projet, on les resserre seulement table par table : une table prouvée vide et non utilisée passe en lecture admin; une table de catalogue ou utilisée attend ta décision. Hors de ce correctif.

## Autres éléments
- Avertissement infrastructure : fonctions SECURITY DEFINER sans `search_path` fixé (`move_to_dlq`, `read_email_batch`, `enqueue_email`…). Correctif : `ALTER FUNCTION … SET search_path = ''`, à valider séparément.
- Constat ignoré : non modifié. Rien n'a été ignoré ni marqué corrigé.

## Garanties
Aucune permission modifiée, aucune publication, aucun déploiement, aucun outreach, aucun service payant.
