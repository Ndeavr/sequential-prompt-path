
## Contexte — ce qui existe déjà

Une grande partie du système demandé est **déjà en place**. Je vais m'appuyer dessus au lieu de dupliquer :

- Table `alex_brand_phonetic_lock` (brand_key, language_code, speech_text, context_type, priority, is_forced, is_active) — source de vérité DB.
- Table `alex_pronunciation_rules` (source_text, replacement_text, phonetic_override, locale, rule_type=brand/product/...).
- Service `applyBrandPhoneticLock(text, lang)` + version `Sync` (fallback hardcodé) + logging vers `alex_phonetic_events`.
- Pipeline `prepareAlexSpeechText` branché dans `alex-voice`, `elevenlabs-tts`, `alex-respond`, `alexResponseEngine`.
- Admin `/admin/voice-pronunciation` avec CRUD règles + `PanelBrandPhoneticLock`.
- Component `BrandPronunciation` (variantes card/inline/footer) déjà exposé sur `/ai` avec schema.org.
- Fallbacks hardcodés : FR "Un Pro", EN "Heun Pro" (le brief demande "Hun-pro").

Le vrai delta à livrer : **normaliser l'EN à "Hun-pro"**, exposer un helper canonique `getSpeechText`, auditer chaque surface TTS/vidéo pour s'assurer qu'aucune ne bypasse le lock, ajouter une page admin dédiée `/admin/brand-pronunciation` (préview one-click), et compléter les scripts vidéo + métadonnées SEO.

---

## Plan

### 1. Aligner la prononciation EN sur "Hun-pro"

- Migration : `UPDATE alex_brand_phonetic_lock SET speech_text='Hun-pro' WHERE brand_key='unpro' AND language_code='en'` + upsert de la règle EN dans `alex_pronunciation_rules`.
- Mettre à jour les fallbacks hardcodés :
  - `src/services/alex/brandPhoneticLock.ts` : `FALLBACK_SPEECH.en = "Hun-pro"`.
  - `src/services/alexPronunciationNormalizer.ts` : ligne EN → "Hun-pro" (garder "Euhnpro" pour FR côté TTS FR uniquement).
  - `src/lib/prepareAlexSpeechText.ts` si constante EN présente.
- Mettre à jour `BrandPronunciation.tsx` : afficher « Hun Pro » (EN) au lieu de « Heun Pro ».

### 2. Helper canonique `getSpeechText(text, language)`

- Nouveau fichier `src/lib/brand/getSpeechText.ts` : thin wrapper autour de `applyBrandPhoneticLockSync` (path synchrone) + variante async `getSpeechTextAsync` qui appelle `applyBrandPhoneticLock`.
- Équivalent côté edge : `supabase/functions/_shared/getSpeechText.ts` (déjà en partie dans `_shared/voice-gateway.ts` et `_shared/alex-french-voice.ts` — réexporter sous un nom unifié).
- Signature :
  ```ts
  getSpeechText(text: string, language: "fr-CA" | "en" | string): { displayText, speechText, brandDetected }
  ```

### 3. Audit et branchement de toutes les surfaces TTS / IA / export

Passer chaque appelant de TTS et confirmer qu'il traverse `getSpeechText` avant l'envoi au provider. Corriger ceux qui manquent :

- `supabase/functions/alex-voice/index.ts` ✅ (déjà branché — vérifier)
- `supabase/functions/elevenlabs-tts/index.ts` ✅ (vérifier)
- `supabase/functions/alex-respond/index.ts` ✅ (vérifier)
- `supabase/functions/alex-voice-sales/index.ts` — ajouter la sanitation avant `elevenlabsService`
- `src/features/alex/services/elevenlabsService.ts` — garantir passage par `getSpeechText`
- Toute edge de génération vidéo / podcast / SMS voice (rechercher `text-to-speech`, `tts`, `elevenlabs` dans `supabase/functions/`).
- Ajouter test unitaire (`src/lib/__tests__/brandSpeechText.test.ts`) qui couvre : "UNPRO", "U N Pro", "You-en-pro", "Un-PRO", "Une Pro" → doivent tous devenir "Un Pro" (FR) ou "Hun-pro" (EN).

### 4. Table de compatibilité `brand_pronunciations` (VIEW)

Plutôt que dupliquer les données, créer une **vue** :

```sql
CREATE VIEW public.brand_pronunciations AS
SELECT brand_key AS brand, language_code AS language,
       'UNPRO' AS display_text, speech_text,
       null::text AS phonetic, notes, is_active AS enabled
FROM alex_brand_phonetic_lock;
```

Grants + RLS INVOKER (lecture publique, écriture admin) — l'admin continue de gérer via les tables existantes.

### 5. Admin `/admin/brand-pronunciation` (page focalisée)

Nouvelle page `src/pages/admin/PageAdminBrandPronunciation.tsx` — simplifiée, marque-centrique :

- Header : nom affiché « UNPRO » + description.
- Deux blocs : FR-CA et EN, chacun avec :
  - Display Name (readonly = "UNPRO")
  - Speech version (édition → update `alex_brand_phonetic_lock`)
  - Bouton **▶ Écouter FR** / **▶ Écouter EN** (appelle `elevenlabs-tts` avec `getSpeechText`)
  - Notes / à ne jamais utiliser
- Bouton "Ajouter une langue" (préparation multi-langue).
- Ajouter la route dans `src/app/router.tsx` et l'entrée dans `adminToolsRegistry`.
- Garder `/admin/voice-pronunciation` comme cockpit avancé (règles multiples, contexte, priorité).

### 6. Génération vidéo / scripts

Éditer les générateurs de scripts existants (rechercher les edges `*video*`, `*script*`) pour émettre systématiquement les deux champs :

```json
{ "display_text": "...UNPRO...", "speech_text": "...Un Pro..." }
```

En pratique : appliquer `getSpeechText` au champ narrateur juste avant écriture DB / envoi provider.

### 7. SEO / Métadonnées IA

- Ajouter dans `index.html` un `<meta name="brand:pronunciation:fr" content="Un Pro">` et `en` → "Hun-pro".
- Étendre le JSON-LD Organization existant avec `alternateName` FR/EN (déjà partiellement fait dans `BrandPronunciation`).
- Ajouter section « Prononciation » dans `/llms.txt` et `PageAICrawlerLanding`.

### 8. Extensibilité future (préparé, pas construit)

Le helper `getSpeechText` accepte n'importe quelle `brand_key`. La vue `brand_pronunciations` permettra plus tard d'ajouter noms de villes, rues, partenaires — via les tables existantes ou une nouvelle `brand_key`.

---

## Détails techniques

- Migration DB : 1 seule migration (UPDATE + UPSERT + VIEW + GRANT + RLS).
- Fallback hardcodés = filet de sécurité : le DB reste source de vérité.
- Aucun changement à l'UI publique (affichage reste "UNPRO" partout).
- Test smoke : lancer preview FR + EN sur `/admin/brand-pronunciation` avant clôture.

---

## Critères de succès

- Écouter FR sur `/admin/brand-pronunciation` → "Un Pro".
- Écouter EN → "Hun-pro" (pas "you-en-pro", pas d'épellation).
- Alex vocal FR sur homepage ne dit jamais U-N-P-R-O.
- `alex_phonetic_events` s'incrémente à chaque interaction Alex.
- Toutes les edges TTS passent par `getSpeechText`.
- Bench de prononciation admin passe FR et EN.
