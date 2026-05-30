## Objectif

Transformer `/analyse-soumissions` d'une démo mock en un flux réel :
1. **Analyse réelle** des PDF/images uploadés via Lovable AI (Gemini)
2. **Animation de progression** (~6–10s) pendant l'analyse, pas de résultat instantané
3. **Gate d'authentification** (login ou création de compte) avant l'affichage des résultats

---

## 1. Analyse réelle des documents

**Nouvelle edge function** `analyze-quote-comparative` (Deno, esm.sh Supabase 2.49.1) :
- Input : `files: [{ name, mimeType, base64 }]` (1–3 fichiers PDF/JPG/PNG)
- Pour chaque fichier → appel **Lovable AI Gateway** (`google/gemini-2.5-flash`) avec image/PDF inline + prompt FR-CA structuré demandant : entrepreneur, prix total, garantie, inclusions, exclusions, risques, complétude.
- Retourne JSON normalisé `quotes[]` + calcule `score` (0–100) déterministe à partir des champs (garantie, complétude scope, prix vs médiane, mentions assurance/RBQ).
- Sélectionne `isBestValue` = meilleur ratio score/prix; produit `recommendation` + `confidenceScore`.
- Persiste dans nouvelle table `quote_analyses` (id, user_id, created_at, payload jsonb) pour retrouver le résultat post-login.

**Côté client** `PageImporterSoumissionComparative` :
- Convertit les `File` en base64, appelle la fonction via `supabase.functions.invoke`.
- Stocke l'`analysis_id` retourné dans `sessionStorage` + navigue vers résultats.

## 2. Animation de progression

Nouveau composant `OverlayAnalyseProgress` (modal plein écran, glassmorphism cohérent avec le thème) avec 4 étapes scénarisées :
1. « Lecture des documents… »
2. « Extraction des prix, garanties et exclusions… »
3. « Comparaison avec les standards du marché QC… »
4. « Préparation de votre recommandation… »

Durée minimum 6s (Promise.all entre l'appel API réel et un `setTimeout` plancher) pour éviter l'effet "instantané" même si l'IA répond vite. Barre de progression + ticks animés (framer-motion).

## 3. Paywall login/compte avant résultats

Sur `/analyse-soumissions/resultats` :
- Au mount : si l'utilisateur n'est pas authentifié, afficher `ModalAuthGateResultats` (bloquant, non dismissible) au-dessus d'un **aperçu floutté** des résultats (teaser : « 3 soumissions analysées · Recommandation prête »).
- Modal contient onglets **Connexion** / **Créer un compte** (email+password + Google via `lovable.auth.signInWithOAuth("google", …)`).
- L'`analysis_id` est conservé dans `sessionStorage` + transmis via `authIntent.returnPath = "/analyse-soumissions/resultats?id=…"` pour reprise après auth.
- Une fois authentifié : `useEffect` charge `quote_analyses` row par id → rend `SectionComparaisonIA` avec les vraies données.
- Si l'`analysis_id` n'appartient à personne encore, l'edge function `claim-quote-analysis` lie `user_id` au premier appel authentifié.

## Détails techniques

**Backend / Supabase**
- Migration : table `public.quote_analyses` (id uuid pk, user_id uuid null, payload jsonb, created_at timestamptz). GRANTS `authenticated` SELECT/INSERT/UPDATE sur ses propres lignes, `service_role` ALL. RLS : owner-only after claim, edge function utilise service role.
- Edge functions : `analyze-quote-comparative` (verify_jwt=false, anonymous upload OK), `claim-quote-analysis` (verify_jwt=true).
- Secret requis : `LOVABLE_API_KEY` (déjà présent dans projet).

**Frontend**
- Nouveaux fichiers :
  - `src/features/quoteAnalyzer/components/OverlayAnalyseProgress.tsx`
  - `src/features/quoteAnalyzer/components/ModalAuthGateResultats.tsx`
  - `src/features/quoteAnalyzer/components/TeaserResultatsFloutes.tsx`
  - `src/features/quoteAnalyzer/services/quoteAnalysisClient.ts` (upload + invoke + claim)
- Modifs :
  - `PageImporterSoumissionComparative.tsx` → vrai appel + overlay
  - `PageResultatAnalyseSoumissions.tsx` → fetch real data + auth gate
  - `src/features/quoteAnalyzer/index.ts` → exports

**UX**
- Conserve la nav existante, copy FR-CA, pas d'emoji.
- Durée plancher 6s, max 20s puis fallback message si AI échoue.
- Erreur AI → toast + bouton « Réessayer » (ne pas exposer détails techniques).

## Hors scope
- Pas de génération PDF du rapport (bouton "Télécharger" reste désactivé/à venir).
- Pas de modification du flux "dossier client".
- Pas de stockage des fichiers originaux (analyse en mémoire uniquement pour cette V1).
