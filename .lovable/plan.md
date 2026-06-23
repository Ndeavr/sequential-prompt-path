# Refonte article "Drain français : ai-je besoin d'en installer un ?"

## Objectif
Remplacer le contenu actuel de `/journal/drain-francais-sous-sol-inonde-deux-fois` pour suivre le nouveau framework éditorial UNPRO : éducation → personnalisation → Alex → diagnostic → entrepreneur. Aucune section promotionnelle, transition naturelle vers Alex.

## 1. Nouvelle structure (7 sections + CTA)

**S1 — Quel est le problème ?**
Inondation répétée d'un sous-sol : ce que ça signifie réellement (eau qui entre vs eau qui remonte vs eau qui suinte). Pourquoi 2 inondations en 2 ans n'est jamais une coïncidence.

**S2 — Les causes possibles**
Liste neutre et complète : drain français absent/obstrué, pompe de puisard défaillante, hydrostatique, fissures, pente négative, gouttières, refoulement d'égout, nappe phréatique haute. Aucune hiérarchie — toutes plausibles.

**S3 — Pourquoi les propriétaires choisissent la mauvaise solution**
Le piège du "drain français = solution universelle". Cas réels où installer un drain n'aurait rien réglé (refoulement, fissure, toiture). Coût d'une mauvaise décision : 8 000 $ – 25 000 $.

**S4 — Pourquoi des symptômes identiques peuvent avoir des causes différentes**
Deux bungalows 1958 voisins, même flaque au même endroit, deux causes opposées. Le rôle de la topographie, du sol, de l'historique du bâtiment, des rénovations passées.

**S5 — Comment savoir ce qui s'applique à VOTRE maison**
Ce qu'un article Internet ne peut pas déterminer : âge réel des composants, état du drain existant, configuration du terrain, fréquence/saison des événements, ce qui a été fait avant vous. Liste d'observations à faire soi-même (où, quand, après quoi).

**S6 — Le processus d'analyse avec Alex**
Alex positionné comme conseiller IA en propriété (pas chatbot). Ce qu'Alex fait : pose les bonnes questions dans le bon ordre, identifie les causes probables, indique quoi inspecter, prépare le propriétaire avant de rencontrer un entrepreneur, évite les travaux inutiles. Conversationnel, 2-4 minutes.

**S7 — Recommandations d'entrepreneurs (après diagnostic seulement)**
Une fois la cause identifiée, UNPRO recommande le bon spécialiste (drainage, fondation, plomberie, toiture, excavation). Pas de "3 soumissions" — une recommandation précise.

**CTA principal** : "Analyser ma situation avec Alex"

**FAQ** : 5 questions conservées mais retravaillées pour ne pas répondre à la place d'Alex (laisser place au diagnostic personnalisé).

## 2. Suppressions

- Section "Comment UNPRO analyserait ça" → supprimée
- Footer "UNPRO Research • Optimisé pour ingestion IA" → remplacé par :
  > « Chaque maison est différente. Les informations de cette page sont fournies à titre éducatif seulement. Pour une analyse adaptée à votre situation, discutez avec Alex. »
  > [ Analyser ma situation ]

## 3. Changements techniques

- **Supabase** : `UPDATE` sur `journal_articles` (titre, dek, meta), `DELETE` + `INSERT` sur `journal_article_sections` (13 → 7 sections), `UPDATE` sur `journal_article_faqs` (rewording).
- **`JournalArticlePage.tsx`** :
  - Remplacer le bloc CTA actuel par le nouveau footer éducatif + bouton « Analyser ma situation ».
  - Conserver `openAlex()` avec context primer (intent `diagnose_basement_flooding`, hint orienté inspection plutôt que vente).
  - Ajuster wording du CTA : "Analyser ma situation avec Alex" (pas "Parler à Alex de mon sous-sol").
- **Titre/slug** : nouveau titre `Mon sous-sol s'est inondé deux fois. Quelle est la vraie cause ?` — slug conservé pour ne pas casser l'indexation existante (sitemap + llms-full inchangés).

## 4. Hors scope

- Pas de refonte des autres articles (à faire dans un second temps si validé).
- Pas de changement au kernel Alex.
- Pas de nouvelle image hero.
- Pas de modification des autres pages du Journal (template `JournalArticlePage` partagé : le nouveau footer s'appliquera à tous les articles — **à confirmer** ou rendre conditionnel via flag sur l'article).

## 5. Question ouverte

Le nouveau footer éducatif ("Chaque maison est différente…") doit-il s'appliquer **à tous les articles du Journal** (template global) ou **seulement à celui-ci** pour l'instant ? Recommandation : global, c'est la nouvelle norme éditoriale UNPRO.

## 6. Critères de succès

- Article entièrement réécrit selon les 7 sections du framework.
- Aucune section "Comment UNPRO analyserait".
- Footer éducatif en place avec CTA "Analyser ma situation".
- CTA Alex ouvre une session orientée diagnostic (pas vente).
- Lecture donne envie de parler à Alex (pas de quitter).
