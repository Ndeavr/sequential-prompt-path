# Plan — Réparer la création de leads (queue + enrichissement)

Deux problèmes distincts identifiés à partir de tes captures :

## Problème 1 — `/admin/outbound/leads-queue` reste bloqué sur « Chargement… »

**Cause** : `PageOutboundLeadsQueue.tsx` lance 4 requêtes Supabase en `Promise.all`, sans `try/catch`. Si **une seule** échoue (RLS, table indisponible, requête lente), la promesse rejette et `setLoading(false)` n'est **jamais appelé** → spinner permanent.

Vérifié : `outbound_leads` contient bien 60 lignes avec une policy admin. Donc soit l'utilisateur n'est pas reconnu comme admin (la requête revient vide mais autre requête échoue), soit une autre table renvoie une erreur silencieuse.

**Correctifs** dans `src/pages/admin/outbound/PageOutboundLeadsQueue.tsx` :
1. Envelopper `load()` dans un `try/catch/finally` qui force toujours `setLoading(false)`.
2. Utiliser `Promise.allSettled` au lieu de `Promise.all` pour ne pas bloquer la page si une table secondaire échoue.
3. Logger les erreurs réelles avec `console.error` + toast pour diagnostic.
4. Ajouter un état d'erreur visible (carte rouge avec « Réessayer ») pour ne plus avoir de page muette.
5. Ajouter un timeout de sécurité (8s) qui bascule sur l'écran d'erreur si les requêtes traînent.

## Problème 2 — Étape « 2. Enrichissement » : *Failed to send a request to the Edge Function* (15021 ms)

**Cause** : la fonction `acq-enrich-contractor` :
- Appelle Firecrawl en `fetch` **sans timeout** → si le site cible est lent/HS, le fetch peut excéder la limite réseau du navigateur (15 s) avant que la fonction ne réponde, ce qui produit l'erreur côté client `supabase.functions.invoke`.
- N'inclut **pas** `x-supabase-api-version` ni `apikey` complets dans `Access-Control-Allow-Headers`, ce qui peut faire échouer le preflight de la nouvelle version du client supabase-js.
- Continue ensuite avec des `insert` sur `acq_contractors`, `acq_contractor_services`, `acq_contractor_media`, `acq_aipp_pages`, `acq_invites` **sans gérer les erreurs RLS/contraintes** → un échec silencieux remonte un message peu utile.

**Correctifs** dans `supabase/functions/acq-enrich-contractor/index.ts` :
1. Ajouter un wrapper `withTimeout(promise, ms)` autour du `fetch` Firecrawl (10 s max), retourne `null` si timeout au lieu de planter.
2. Élargir `Access-Control-Allow-Headers` :
   `authorization, x-client-info, apikey, content-type, x-supabase-api-version`.
3. Utiliser `EdgeRuntime.waitUntil` (background task) pour les étapes lourdes (score, page, invite) → renvoie `contractor_id` au client en < 5 s, le reste s'exécute en arrière-plan.
4. Capturer chaque insert/update et renvoyer un payload `{ success, contractor_id, warnings: [...] }` détaillé au lieu d'un 500 monolithique.
5. Logger explicitement chaque étape (`console.log("[enrich] step=...")`) pour pouvoir tracer dans les Edge Logs.

**Correctif côté client** dans `src/pages/admin/outbound/PageOutboundTestCenter.tsx` :
- Augmenter la tolérance d'attente : afficher un état « En cours… » + ne marquer en erreur qu'après ~30 s.
- Afficher le message d'erreur exact retourné par la fonction (pas seulement le message générique du SDK).

## Fichiers touchés

```
src/pages/admin/outbound/PageOutboundLeadsQueue.tsx        (réparation chargement)
src/pages/admin/outbound/PageOutboundTestCenter.tsx        (meilleur diagnostic)
supabase/functions/acq-enrich-contractor/index.ts          (timeout, CORS, background)
```

## Garanties anti-régression

- Aucune modification de schéma DB, aucune RLS modifiée.
- Le pipeline existant (`execute-prospect-pipeline`, `acq-generate-score`, `acq-send-invite`) **n'est pas touché**.
- Les composants visuels et la navigation restent identiques.
- Le contrat de retour de `acq-enrich-contractor` (`contractor_id`, `slug`, `page_slug`, `score`) reste inchangé pour ne pas casser le Test Center.

## Critères de succès

- `/admin/outbound/leads-queue` affiche les 60 leads existants en < 3 s ou montre une erreur claire.
- L'étape « 2. Enrichissement » du Test Center termine en < 10 s ou retourne un message d'erreur explicite.
- Les Edge Logs montrent des traces `[enrich] step=...` exploitables pour la suite.
