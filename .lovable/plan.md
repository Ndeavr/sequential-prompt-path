## Objectif

Remplacer les 8 images de métiers tournant derrière l'orb d'Alex (`src/assets/trades/*.jpg`) par des visuels plus **sombres**, **cinématiques** et fidèles à la **réalité Québec** (saisons, équipement, environnements typiques), dans l'esprit des photos de référence fournies.

## Approche

Régénérer les 8 fichiers via le modèle image Nano Banana Pro (`google/gemini-3-pro-image-preview`) avec un style commun :
- Photographie réelle, ambiance sombre / low-key, contraste élevé
- Lumière directionnelle naturelle (matin gris, fin de journée, lampe de travail)
- Travailleur québécois en action (jamais posé), équipement réaliste
- Couleurs désaturées avec un point chaud pour rester lisible derrière l'orb
- Format carré 1024×1024, sans texte ni logo

## Livrables (écrasement direct)

Chaque image écrasée dans `src/assets/trades/` (mêmes noms → aucun changement d'import) :

1. `renovation.jpg` — chantier intérieur sous-sol, charpente apparente, bois et poussière, lumière lampe de travail jaune
2. `ceramic.jpg` — pose de céramique salle de bain, mains gantées avec truelle crantée, mortier gris, éclairage rasant
3. `painting.jpg` — peintre sur escabeau dans pièce vide, ruban bleu, bâche au sol (proche de l'image de référence)
4. `excavation.jpg` — pelle mécanique creusant fondation maison résidentielle Québec, terre brune, ciel couvert
5. `notary.jpg` — mains signant acte notarié sur bureau bois sombre, stylo plume, ambiance feutrée (proche image référence)
6. `plumbing.jpg` — plombier sous évier de cuisine avec lampe frontale, tuyaux en P, clé à molette (proche image référence)
7. `electrical.jpg` — électricien casque blanc + lunettes jaunes manipulant fils dans panneau électrique (proche image référence)
8. `carpentry.jpg` — menuisier à la scie à ruban dans atelier, copeaux de bois, chemise carreautée

Aucun autre fichier modifié — `AlexTradesAura.tsx` continue d'importer les mêmes chemins, donc le crossfade et l'ordre des labels restent identiques.

## Détails techniques

- Script Python temporaire dans `/tmp/gen_trades.py` qui boucle sur les 8 prompts, appelle `https://ai.gateway.lovable.dev/v1/chat/completions` avec `LOVABLE_API_KEY`, décode le base64 et écrit dans `src/assets/trades/<slug>.jpg`
- QA visuelle obligatoire : lister les 8 fichiers et inspecter chacun via `code--view` après génération ; régénérer ceux qui ne respectent pas le brief (trop clairs, sujet hors-Québec, texte parasite)
- Pas de migration DB, pas d'edge function, pas de changement de composant React
