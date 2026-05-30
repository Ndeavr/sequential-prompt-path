## Objectif
Transformer "Analyse de soumissions" en levier d'upgrade vers Passeport Maison, sans afficher de limite cheap dans le hero.

## Changements

### 1. Hero (`HeroSectionAnalyseTroisSoumissions.tsx`)
- Titre : **"Comparez vos soumissions en 30 secondes"**
- Sous-texte : *"Notre IA analyse les prix, exclusions, garanties et risques pour recommander la meilleure option."*
- CTA primaire : **"Analyser mes soumissions"** (retirer "jusqu'à 3")
- Retirer mention "3" du titre — le chiffre vit uniquement dans la zone upload
- CTA secondaire inchangé ("Voir un exemple")

### 2. Zone upload (`PanelDropzoneSoumissionComparative.tsx`)
- Garder les 3 slots actifs (plan Gratuit)
- Sous les 3 slots, ajouter 2 rangées "teaser" verrouillées :
  - **"Ajouter une 4e/5e soumission"** + badge `🔒 Passeport Maison (5 max)` → clic ouvre modal upsell
  - **"Jusqu'à 10 soumissions"** + badge `⭐ Passeport Maison Gold` → clic ouvre modal upsell
- Style locked : opacité 50%, bordure dashed, icône cadenas, hover subtil
- Bouton principal : **"Analyser mes soumissions"** (sans chiffre figé) — compteur dynamique reste dans un petit label au-dessus ("2 soumissions prêtes")

### 3. Modal upsell (`ModalUpsellPasseportMaison.tsx` — nouveau)
- Déclenché au clic sur une rangée verrouillée
- 2 cartes côte à côte : **Passeport Maison** vs **Passeport Maison Gold**
- Liste features par plan (selon structure fournie) :
  - **Gratuit** : 3 analyses, résumé IA, détection risques majeurs
  - **Passeport Maison** : 5 soumissions, historique projets, stockage docs, comparaison détaillée, score confiance entrepreneur
  - **Gold** : 10 soumissions, clauses/exclusions avancées, historique complet, factures+garanties, prép vente/notaire/assurance, IA proactive
- CTA : "Activer Passeport Maison" / "Passer à Gold" → route vers checkout existant (placeholder `/passeport-maison` si route absente)
- Lien discret "Continuer avec 3 gratuites"

### 4. Landing (`PageAnalyseTroisSoumissions.tsx`)
- Mettre à jour le bloc "L'IA analyse pour vous" : retirer mention "3" hardcodée des slots wireframe — afficher 3 slots + 2 slots verrouillés en aperçu (cohérent avec la nouvelle zone upload)
- Titre/meta SEO : remplacer "3 soumissions" par "soumissions" (garder "3 gratuites" dans la description si pertinent)

## Hors scope
- Pas de changement backend (`analyze-quote-comparative` reste limité à 3 fichiers côté edge function pour V1)
- Pas de logique de plan réelle (modal upsell = présentation + redirection, gating réel viendra avec l'intégration `useFeatureAccess`)
- Pas de modification du flow résultats ni de l'auth gate

## Fichiers
- **Modifiés** : `HeroSectionAnalyseTroisSoumissions.tsx`, `PanelDropzoneSoumissionComparative.tsx`, `PageAnalyseTroisSoumissions.tsx`
- **Créés** : `ModalUpsellPasseportMaison.tsx`, `SlotUploadVerrouille.tsx` (rangée locked réutilisable)
- **Export** : `src/features/quoteAnalyzer/index.ts`
