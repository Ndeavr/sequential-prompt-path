# UNPRO — Correctifs de sécurité du 12 novembre 2026

**Périmètre :** projet Lovable existant `ba1eabf3-fd1c-40fe-9856-3812a70f9869`, Supabase intégré. **Aucune publication ni déploiement du site ou d'Edge Function autorisé à cette étape.** La branche `security/guest-painting-upload-20261112` n'est pas la branche de production.

## 1. Correctifs RLS déjà appliqués dans la base LIVE (ne pas exécuter une deuxième fois sans examen)

L'exécution de ces correctifs a été autorisée et contrôlée le 12 novembre :

- `activation_pipeline_runs` : politiques `Public can read activation run progress` et `Anyone can create activation run` retirées. Politiques propriétaires/admin conservées. La vue `activation_pipeline_runs_public` est une **vue publique à projection expurgée** : `security_invoker=false`, `security_barrier=true`, condition `user_id IS NULL OR user_id = auth.uid() OR has_role(auth.uid(),'admin')`; `signals` et `extraction` exposés comme objets JSON vides. Aucun droit SELECT direct anon sur les colonnes de la table, y compris les identifiants Stripe. La fonction serveur `activation-pipeline-start` utilise service_role.
- `alex_homeowner_events` : `Read homeowner events` remplacée par `Admins read homeowner events safely` (SELECT admin uniquement). INSERT anonyme nécessaire au parcours conservé.
- `owner_match_inputs` : `Anyone can read match inputs` remplacée par `Admins read match inputs safely` ; INSERT du formulaire conservé.
- `cta_links` : `Anyone resolves cta` remplacée par `Admins read CTA links safely`. Aucun usage direct client identifié dans le code; les opérations serveur restent en service_role.
- `design_votes` : `Anyone can read votes` et `Anyone can insert votes via edge function` retirées; `Read votes on shared projects` restreinte aux propriétaires des projets et aux admins ; `Anyone can vote on shared projects` (INSERT avec EXISTS sur `design_shares`) conservée.

Vérifications SQL sous rôles `anon` et `authenticated` : 2 lignes de progression anonymes toujours visibles dans la vue, `signals` et `extraction` expurgés, 0 accès non autorisé à la table interne; 2 lignes de base conservées. `painting-photos` = 0 objet au moment de l'audit. Autres tables ciblées = 0 enregistrement à l'audit, donc les tests de non-divulgation doivent être repris avec comptes synthétiques isolés avant publication. Les tests admin avec compte réel n'ont pas été exécutés. **Ce correctif ne clôt pas les autres avertissements de sécurité recensés dans le fichier 20261030.**

## 2. Incident restant — compartiment privé `painting-photos`

Ancien calculateur PUBLIC : le visiteur sans session utilise `guest/` et a besoin de `INSERT` direct + `SELECT` pour créer une URL signée. Couper l'une de ces règles avant de publier le nouveau code casserait l'envoi des photos anonymes. Les anciennes règles restent donc actives jusqu'à validation de la bascule; **ne pas annoncer leur correction comme réalisée**.

Le correctif préparé sur cette branche remplace l'envoi guest direct par `painting-guest-upload` (fonction serveur) : limite de 5 MiB, JPEG/PNG/WebP vérifiés par magic bytes, stockage sous `guest/<UUID aléatoire>`, URL signée 7 jours, aucune clé service_role côté navigateur, CORS restreint, limite de 12 demandes/heure par empreinte IP HMAC, échec fermé si secret ou quota manquant. L'utilisateur authentifié garde l'upload propriétaire existant. Le HMAC IP est un limiteur *best-effort* : vérifier en production la fiabilité des en-têtes d'adresse IP du proxy; CORS n'est pas une authentification. Si les en-têtes sont falsifiables, ajouter une protection serveur anti-bot avant ouverture.

### 2A. À appliquer seulement au moment du déploiement approuvé, avant d'activer la fonction

Créer le secret **hors Git** `PAINTING_UPLOAD_RATE_SECRET` (>= 32 caractères aléatoires). Définir `PAINTING_UPLOAD_ALLOWED_ORIGINS` avec les origines de prévisualisation si nécessaire; jamais `*`. Exécuter ce SQL de quota, dans une transaction et après sauvegarde/vérification des noms et grants :

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS public.painting_guest_upload_window (
  fingerprint text NOT NULL,
  window_started_at timestamptz NOT NULL,
  upload_count integer NOT NULL CHECK (upload_count > 0),
  PRIMARY KEY (fingerprint, window_started_at)
);
ALTER TABLE public.painting_guest_upload_window ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.painting_guest_upload_window FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.try_painting_guest_upload(p_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE accepted_count integer;
BEGIN
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.painting_guest_upload_window AS w
    (fingerprint, window_started_at, upload_count)
  VALUES (p_fingerprint, date_trunc('hour', now()), 1)
  ON CONFLICT (fingerprint, window_started_at) DO UPDATE
    SET upload_count = w.upload_count + 1 WHERE w.upload_count < 12
  RETURNING upload_count INTO accepted_count;
  RETURN accepted_count IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.try_painting_guest_upload(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_painting_guest_upload(text)
  TO service_role;
COMMIT;
```

**Important :** contrôler le plan de rétention de la table de quota (suppression de fenêtres anciennes par opération administrative autorisée) et la robustesse du proxy avant exposition publique. Cette table et cette fonction n'ont **PAS** été créées en production à ce stade.

### 2B. Ordre de la bascule — requiert validation explicite de la publication

1. Vérifier `npm test -- src/__tests__/paintingGuestUploadSecurity.test.ts`, `npm run typecheck` et la compilation. Contrôler les secrets, le domaine et les politiques, sans test de charge contre un service live.
2. Une fois autorisé, installer le quota SQL + secrets et **déployer la nouvelle Edge Function seulement**. Tester avec données synthétiques : visiteur guest JPG/PNG/WebP; MIME non concordant; fichier 0/ > 5 MiB; limite 429; URL signée privée; erreur 503 sans quota/secret; autorisation de domaine; propriétaire authentifié. Confirmer aucune extraction de service_role.
3. Obtenir l'accord explicite pour publier le code frontend et vérifier en production que l'appel `painting-guest-upload` remplace l'upload guest direct.
4. **Seulement alors**, dans une opération rapide et surveillée, retirer les policies anonymes historiques et les remplacer par l'INSERT propriétaire ci-dessous. Tester immédiatement guest et signed-in. Si échec, réparer la fonction/codage sans restaurer des lectures anonymes générales.

```sql
BEGIN;
DROP POLICY IF EXISTS "Public can read guest painting photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload painting photos to guest folder" ON storage.objects;
CREATE POLICY "Authenticated upload own painting photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'painting-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
COMMIT;
```

Les policies existantes `Owners can read their painting photos` et `Owners can delete their painting photos` doivent rester intactes. Le bucket reste `public=false`. Éviter `UPDATE/DELETE` non autorisés et toute dépendance frontend à des URLs publiques permanentes.

### 2C. Contrôles finaux

- Le rôle anon ne peut plus lister ni signer/télécharger un objet arbitraire `painting-photos`; seul le service propriétaire signe l'objet uploadé.
- Le rôle authenticated peut créer et lire exclusivement ses propres objets; un autre compte reçoit un refus.
- Les photos guest reviennent au calculateur et à l'analyse IA; un échec réseau affiche un état d'erreur sans faux succès.
- Comparer nombre de policies, lignes et objets avant/après; **pas d'envoi, paiement, automatisation ou publication non autorisée**.
- Refaire le Security Review Lovable et documenter les alertes restantes plutôt que prétendre que les 83 problèmes anciens ont tous disparu.

## 3. État au moment de la rédaction

**APPLIQUÉ ET CONTRÔLÉ :** restrictions RLS de cinq tables, vue progressive expurgée, tests SQL d'accès anon/authenticated. **PRÉPARÉ DANS BRANCHE SEULEMENT :** client guest, Edge Function, configuration et tests unitaires. **NON APPLIQUÉ / NON TESTÉ E2E :** SQL du quota, secret, déploiement Edge, nouvelle interface publiée, retrait des politiques guest, chemin guest réel. **BLOQUEUR :** workspace Lovable sans crédits; modifications faites dans GitHub, sans publication.
