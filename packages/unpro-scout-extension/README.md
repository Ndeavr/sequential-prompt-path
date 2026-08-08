# UNPRO Scout — extension de découverte Facebook

Scout transforme votre navigation manuelle dans les groupes Facebook d'entrepreneurs
en source de découverte pour le pipeline d'acquisition UNPRO existant.

## Ce que Scout fait

- Lit **uniquement** le contenu déjà affiché à l'écran pendant que **vous** faites défiler.
- Extrait entreprise, contact, téléphone (E.164), courriel, site, RBQ, ville, métier.
- Calcule un **score d'intention** à partir de phrases réelles (« cherche contrats »,
  « disponible pour partenariat », « sous-traitance »…) et conserve la preuve textuelle.
- Capture une carte d'affaires en photo sur demande (bouton « 📇 Capturer cette carte »),
  analysée par la fonction vision `extract-business-card` déjà en production.
- Déduplique contre `verified_contractor_prospects` (téléphone → courriel → domaine → nom+ville).
  Un doublon **enrichit** le prospect existant, il n'en crée jamais un second.

## Ce que Scout ne fait pas

- Aucun défilement, clic, expansion de contenu ou connexion automatisés.
- Aucun envoi de message : la conformité CASL et l'envoi restent au pipeline existant.
- Aucune clé de service dans l'extension : seule votre propre session admin est utilisée.
- Aucun nouveau prospect « prêt à contacter » : tout atterrit en `needs_enrichment`.

## Installation

1. Ouvrir `https://unpro.ca/admin/scout` → **Copier le jeton d'extension**.
2. Ouvrir `chrome://extensions`, activer le **Mode développeur**.
3. **Charger l'extension non empaquetée** → choisir `packages/unpro-scout-extension/`.
4. Cliquer l'icône UNPRO Scout, coller le jeton, **Connecter**.

## Utilisation

1. Ouvrir un groupe Facebook d'entrepreneurs.
2. Popup → **Démarrer la capture**.
3. Faire défiler normalement. Les publications retenues sont surlignées
   (bleu = capturé, vert = haute intention).
4. **Terminer la session** en quittant. Les résultats apparaissent dans `/admin/scout`.

## Architecture

| Élément | Rôle |
| --- | --- |
| `content.js` | Lit le DOM visible, marque les captures, bouton image |
| `scoutParser.js` | Copie navigateur de `supabase/functions/_shared/scoutParser.ts` |
| `background.js` | Détient le jeton, appelle `scout-ingest`, tient les compteurs |
| `popup.html/js` | Session, statistiques temps réel, pause/arrêt |
| `scout-ingest` | Auth admin, parsing, vision, dédoublonnage, insertion |
| `/admin/scout` | Sessions, performance par groupe, provenance de chaque capture |

⚠️ `scoutParser.js` et `scoutParser.ts` doivent rester synchronisés — les tests
`src/__tests__/scoutParser.test.ts` valident la version TypeScript.
