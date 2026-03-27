

# Plan: Landing Page Recrutement UNPRO — "/carriere"

## Headline principal
**"Des clients grâce à l'intelligence artificielle?"**

## Résumé
Page de recrutement premium pour attirer étudiants et candidats (job d'été, temps partiel, remote ou en personne) au rôle de représentant terrain UNPRO. Angle: l'IA transforme la vente — pas de cold call, rendez-vous fournis, revenus récurrents.

## Database (1 migration, 3 tables)
- **recruitment_leads**: id, name, phone, email, city, experience_level, availability (summer/part_time/full_time), work_mode (remote/in_person/hybrid), motivation, source, status (default 'new'), created_at
- **recruitment_events**: id, lead_id (FK), event_type, metadata (jsonb), created_at  
- **recruitment_scores**: id, lead_id (FK), score (int), reasoning (text), created_at
- RLS: public insert on leads+events; authenticated select/update for admin

## Routes
- `/carriere` → PageRecruitmentCloser
- `/carriere/merci` → PageRecruitmentThankYou

## Page Structure

### 1. Hero
- **Titre**: "Des clients grâce à l'intelligence artificielle?"
- **Sous-titre**: "Tu rencontres des entrepreneurs dans un café ou sur leur chantier. Tu crées leur profil UNPRO avec l'IA, en direct. Tu encaisses des commissions récurrentes."
- Pills: 🎓 Étudiants bienvenus · ☀️ Job d'été · ⏰ Temps partiel · 🏠 Remote ou en personne
- CTA: "Voir combien tu peux gagner" + "Postuler maintenant"

### 2. Ce que tu fais concrètement (4 steps visuels)
1. On remplit ton agenda de rendez-vous qualifiés
2. Tu rencontres l'entrepreneur (café, chantier, bureau)
3. Tu crées son profil IA en direct avec lui
4. Tu l'aides à choisir le forfait selon ses objectifs → commission à vie

### 3. Ce qu'on offre (grille 6 cards)
- 📅 Rendez-vous déjà dans ton agenda
- 🎯 Clients qualifiés et prêts à écouter
- 💰 Bonus à chaque rencontre
- 🔁 Commission récurrente (revenus passifs)
- 🚀 Produit ultra actuel (IA)
- ❌ Pas de leads partagés, pas de clics, pas de SEO inutile

### 4. Comparaison Ancien modèle vs UNPRO
| Ancien modèle | UNPRO |
|---|---|
| Cold calls | Rendez-vous fournis |
| Leads froids partagés avec 3-4 compétiteurs | Entrepreneurs qualifiés, exclusifs |
| Vendre des clics Google, SEO, Facebook Ads | Des vrais rendez-vous dans leur agenda |
| Vente one-shot | Revenus récurrents |

### 5. Simulateur de revenus (IncomeSimulatorWidget)
- Sliders: rencontres/semaine, taux conversion, commission moyenne
- Outputs animés: revenu mensuel, annuel, récurrent projeté

### 6. Profil recherché (cards)
- À l'aise en rencontre 1 à 1
- Bon communicateur (simple, direct, humain)
- Autonome et structuré
- Comprend les besoins des entrepreneurs
- Expérience en vente = un plus (pas obligatoire)

### 7. FAQ / Objections (accordion)
- "Dois-je prospecter?" → Non
- "Dois-je être expert?" → Non, l'IA fait le travail
- "C'est quoi le produit exactement?" → Des rendez-vous qualifiés, pas des leads
- "Job d'été seulement?" → Été, partiel ou permanent

### 8. Formulaire (FormApplicationCloser)
- Prénom, téléphone (auto-format), email, ville, expérience (dropdown), disponibilité (été/partiel/plein), mode (remote/personne/hybride), motivation (optionnel)
- Bouton: "Recevoir mes premiers rendez-vous"
- Submit → insert recruitment_leads → redirect /carriere/merci

### 9. CTA Sticky mobile
Fixed bottom bar: "Postuler maintenant"

## Thank You Page (/carriere/merci)
Checkmark animation, confirmation, prochaines étapes (contact sous 48h).

## Components (src/components/recruitment/)
HeroSectionCloser, HowItWorksSection, OfferGridSection, ComparisonSection, IncomeSimulatorWidget, ProfileSection, ObjectionSection, FormApplicationCloser, CTAStickyApply

## Design
- Dark hero (gray-950) + UNPRO blue/primary accents
- Framer Motion scroll animations
- Mobile-first (384px viewport)
- Animated number counters in simulator
- Premium Linear/Stripe aesthetic

## Technical Details
- Direct Supabase insert (no edge function needed initially)
- react-hook-form + zod validation
- Phone auto-format (xxx) xxx-xxxx
- SEO Helmet meta tags
- No auth required for submission

