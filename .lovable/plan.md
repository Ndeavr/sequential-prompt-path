
## Objectif

Transformer `src/pages/QrGeneratorPage.tsx` (route `/qr`) d'un outil de tracking à une expérience de partage humain, premium et émotionnelle. Aucun changement de logique métier (referral/tracking/Supabase reste intact en arrière-plan).

## Modifications — `src/pages/QrGeneratorPage.tsx`

### 1. En-tête
- Titre : « Partager UNPRO »
- Sous-texte : « Invitez quelqu'un à découvrir UNPRO. »
- `<title>` Helmet : « Partager UNPRO »

### 2. Cartes (`QR_TYPES`) — renommer label + description

| id | label | description |
|---|---|---|
| `contractor_booking` | Trouver un pro | Aider quelqu'un à démarrer un projet. |
| `home_passport_gold` | Passeport Maison | Créer la fiche intelligente d'une maison. |
| `diagnostic_photo` | Diagnostic IA | Analyser un problème avec une photo. |
| `quote_analyzer` | Analyser une soumission | Comparer ou comprendre une soumission. |
| `contractor_profile` | Inviter un entrepreneur | Faire découvrir UNPRO à un professionnel. |
| `affiliate` | Partager UNPRO | Inviter quelqu'un à découvrir UNPRO. |

- Retirer le libellé section « Type de QR » (ou le remplacer par rien — cartes parlent d'elles-mêmes).

### 3. Bouton
- « Générer mon QR » → « Créer mon QR »
- État chargement : « Création… »

### 4. Carte post-génération (premium)
Quand `activeQrSvg` est affiché :
- Titre : « Scannez pour découvrir UNPRO »
- Sous-texte dynamique selon `selectedType` via un map :
  - `contractor_booking` → « Décrivez votre projet et trouvez le bon professionnel. »
  - `contractor_profile` → « Créez votre profil et développez votre visibilité. »
  - `home_passport_gold` → « Centralisez l'intelligence de votre propriété. »
  - `diagnostic_photo` → « Analysez un problème avec une simple photo. »
  - `quote_analyzer` → « Comparez et comprenez vos soumissions. »
  - `affiliate` → « Découvrez UNPRO — l'intelligence résidentielle. »
- Masquer l'URL `trackingBase/short` brute (jargon technique). Conserver Copier / PNG / Partager.
- Style premium : centrage, padding généreux, rounded-2xl, texte hiérarchisé.

### 5. Section « Mes QR »
- Renommer en « Mes partages »
- Empty state : « Vos partages apparaîtront ici. »
- Retirer l'URL `/r/...` visible (remplacer par le label humain seul). Garder Copier / Toggle silencieusement.
- Retirer l'affichage `scans` + libellé (mécanique de tracking visible). La donnée reste loggée côté DB mais invisible.

## Hors scope
- Aucune modification SQL, hooks, services referral, ou logique de génération.
- Aucune modification de `PageAdminQrCodes` (admin garde ses métriques).
