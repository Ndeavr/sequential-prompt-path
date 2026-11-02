# Audit images et langues du blog — 2 nov. 2026

- Articles publiés : 69 (FR 68, EN 1). Colonne `language` + `translation_slug` ajoutées (migration 0041) ; backfill déterministe : seul `is-r60-really-necessary-attic-insulation-savings` est EN, jumelé à `r-60-vraiment-necessaire-economies-isolation-entretoit`.
- Images vérifiées : 69. Brisées : 3 (404 `/og/...` : passeport, score confiance, vendre plus cher). Hors sujet avec texte dessiné sur carton/chantier : 11.
- Remplacées : 14, par 4 visuels sans texte (`public/blog-images/`) :
  - entretoit soufflé : R-60 FR/EN (même image)
  - entrepreneur sur tablette : 3 soumissions, multiplier chances, IA remplacer/ne remplacera pas, IA attirer clients, mauvais lead
  - inspection et preuves : ChatGPT sans licence, maison prévoir, score confiance
  - dossier rénovations : subventions, valeur historique, passeport maison
- Conservées : 55 (pertinentes, sans texte visible). Restant à remplacer : 0.
- Générateur : brief sémantique (`brief.ts`), plus de titre cité ni d'isolant rose imposé ; reste limité à 3 articles sans image par appel, non déclenché.
