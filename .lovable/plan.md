## Diagnostic

Scan immédiat des tables clés (`contractor_prospects`, `contractors`) → **0 ligne mojibake**. Les caractères cassés (`TÃ©lÃ©phone`, `MontrÃ©al`, `Ã contacter`) provenaient du CSV collé (Windows-1252 lu en UTF-8), pas de la base. Mais aucun garde-fou n'existe pour les **prochains imports** (CSV RBQ, scrapers, exports). On installe la couche défensive globale.

## Livrables

### 1. Utilitaire partagé `src/lib/textNormalization.ts`

Trois fonctions pures, zéro dépendance, testées :

- `repairMojibake(input)` — détecte et corrige les patterns Latin-1↔UTF-8 doubles (`Ã©→é`, `Ã¨→è`, `Ã ` (avec espace) `→à`, `Ã€→À`, `Ã‡→Ç`, `Ã"→Ô`, `â€"→–`, `â€™→'`, `Â `→`espace insécable`, etc.). Table de mapping exhaustive ~60 entrées.
- `normalizeText(input, opts?)` — Unicode NFC, trim, normalise apostrophes typographiques (`'` `'` → `'`), tirets (`–` `—`), guillemets, supprime caractères de contrôle invisibles (zero-width, BOM).
- `sanitizeImportedText(input)` — pipeline `repairMojibake → normalizeText`, retourne `{ value, repaired: boolean, confidence: 'high'|'low' }`. Si confidence basse → `repaired=false` et préserve l'original.

Garde-fou : **ne touche jamais** aux champs `phone`, `email`, `website_url`, `rbq`, `neq`, `postal_code` (regex de détection : si la chaîne matche un pattern téléphone/email/URL/RBQ, retourne telle quelle).

### 2. Pipeline d'import durci

- `src/pages/admin/AdminProspectImport.tsx` : passe **chaque cellule texte** (Entreprise, Secteur, Région, Statut, Notes, Adresse, Ville) via `sanitizeImportedText` avant l'`upsert`. Les colonnes phone/email/url/rbq sont ignorées par la sanitisation.
- Bonus : **détection auto de l'encodage CSV** côté navigateur. Si le fichier contient un BOM UTF-8 → lu en UTF-8. Sinon, on tente UTF-8 strict ; si erreur ou si > 5 % de séquences invalides → fallback `windows-1252` via `TextDecoder('windows-1252')`. Élimine la cause racine.
- `supabase/functions/scrape-rbq-leads/index.ts` : applique `sanitizeImportedText` côté serveur sur tous les champs texte avant insert.

### 3. Migration de réparation one-shot

Fonction Postgres `public.repair_mojibake_text(text)` (immutable, SQL pur) qui applique les ~60 substitutions principales via `replace()` chaînés. Puis :

```sql
UPDATE contractor_prospects
SET business_name = repair_mojibake_text(business_name),
    city          = repair_mojibake_text(city),
    region        = repair_mojibake_text(region),
    address       = repair_mojibake_text(address),
    -- jamais : phone, email, website_url, rbq, neq, postal_code
    needs_review  = (business_name ~ 'Ã' OR city ~ 'Ã' OR region ~ 'Ã')
WHERE business_name ~ 'Ã' OR city ~ 'Ã' OR region ~ 'Ã' OR address ~ 'Ã';
```

Idem pour `contractors` (champs : `business_name`, `city`, `region`, `description`).

Ajout d'une colonne `needs_review boolean default false` sur `contractor_prospects` pour flagger les rangées où la réparation n'a pas pu garantir un résultat propre (présence résiduelle de `Ã` après repair).

Aujourd'hui le scan donne **0 ligne** → la migration tournera sans rien changer. Elle reste utile pour les prochains imports.

### 4. Vue admin "rangées suspectes"

Petit panneau dans `/admin/prospects/import` (en bas de la page existante) :

```
Rangées flaggées pour révision manuelle : N
[ Lister ]  [ Réessayer la réparation ]
```

Liste les rows `WHERE needs_review = true`, permet d'éditer inline le `business_name`/`city`/`notes`. Pas de nouveau page, pas de refonte UI.

### 5. Tests unitaires

`src/lib/__tests__/textNormalization.test.ts` couvre :
- Tous les exemples du brief (TÃ©lÃ©phone, MontrÃ©al, Ã contacter, BÃ©ton, PavÃ©, franÃ§ais, ExtÃ©rieures, DÃ©neigement, expÃ©rience, â, Ã )
- Préservation des accents valides (é è ê ë à â ç î ï ô ù û ü)
- Préservation intacte de phones (`514-503-9606`), emails (`info@x.ca`), URLs (`excavationsicard.ca`), RBQ (`5836-5529-01`)
- Idempotence (`repair(repair(x)) === repair(x)`)
- Chaînes déjà propres → inchangées

## Hors scope

- Aucune refonte UI, aucun changement business
- PDF/email rendering : déjà UTF-8 (templates Resend + fonts PDF actuelles le supportent) — pas de changement
- Aucune modification de logique Alex / scoring / matching
- Pas de nouvelle dépendance npm

## Vérification

1. `bun run test` → tous les cas du brief passent
2. Importer un CSV Windows-1252 contenant "MontrÃ©al" → DB contient "Montréal"
3. Importer un CSV UTF-8 propre → aucun changement
4. Re-scan : `SELECT count(*) FROM contractor_prospects WHERE business_name ~ 'Ã'` → 0
5. Aucune régression sur phones/emails/URLs/RBQ (test unitaire)