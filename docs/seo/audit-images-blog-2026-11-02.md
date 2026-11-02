# Audit images et langues du blog — 2 nov. 2026

- Articles publiés : 69 (FR 68, EN 1). Colonnes `language` + `translation_slug` (migration 0041) ; backfill déterministe : seul `is-r60-really-necessary-attic-insulation-savings` est EN, jumelé à `r-60-vraiment-necessaire-economies-isolation-entretoit`.
- Images revues : 69. Brisées : 3 (404 `/og/...` : passeport, score confiance, vendre plus cher). Hors sujet avec texte dessiné (carton/chantier) : 11. Total à corriger : 14.
- Corrigées : 14, avec 5 visuels finaux fournis (WebP 1600×900, assets CDN durables, URL absolue unpro.ca, mêmes visuels FR/EN) :
  - attic : R-60 FR/EN
  - ai : 3 soumissions, multiplier chances, IA remplacer, IA ne remplacera pas, IA attirer clients
  - leads : transformer un mauvais lead
  - passport : passeport maison, vendre plus cher, subventions
  - trust : score confiance, ChatGPT sans licence, maison prévoir
- Conservées : 55 (pertinentes, sans texte). Restant à remplacer/générer : 0.
- Composant partagé `BlogImage` (cartes + hero, 16:9, lazy sauf hero, alt localisé, fallback unique passport). OG utilise la même URL absolue.
- Générateur : brief sémantique (`brief.ts`), titre non cité, plus d'isolant rose imposé ; aucune génération déclenchée.
