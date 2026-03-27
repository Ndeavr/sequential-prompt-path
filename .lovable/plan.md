

# Plan: Landing Page Recrutement UNPRO — Job d'été / Temps partiel

## Résumé
Page de recrutement premium pour attirer des étudiants et candidats à temps partiel/temporaire pour le rôle de représentant terrain UNPRO. Angle : job d'été, flexible, en personne dans les cafés/chantiers, créer des profils IA live, pas de cold call.

## Database (1 migration, 3 tables)

- **recruitment_leads**: id, name, phone, email, city, experience_level (text: 'none'/'beginner'/'advanced'), availability (text: 'summer'/'part_time'/'full_time'), work_mode (text: 'remote'/'in_person'/'hybrid'), motivation (text), source (text), status (text default 'new'), created_at
- **recruitment_events**: id, lead_id (FK), event_type (text), metadata (jsonb), created_at
- **recruitment_scores**: id, lead_id (FK), score (int), reasoning (text), created_at

RLS: public insert on leads+events (no auth). Authenticated select/update for admin.

## Routes (2 new)
- `/carriere` → PageRecruitmentCloser
- `/carriere/merci` → PageRecruitmentThankYou

## Page Structure: PageRecruitmentCloser

### 1. HeroSectionCloser
- Titre: **"Job d'été. Pas de bureau. Pas de cold call."**
- Sous-titre: "Rencontre des entrepreneurs dans un café. Crée leur profil IA en live. Encaisse des commissions récurrentes."
- Pills: 🎓 Étudiants bienvenus · ⏰ Temps partiel OK · ☕ En personne ou remote
- CTA: "Voir combien tu peux gagner" (scroll to simulator) + "Postuler" (scroll to form)

### 2. ProofSectionEarnings
3 cards animées:
- "10 rencontres = 1 500$ à 3 000$"
- "30 clients actifs = revenus mensuels récurrents"
- "Ton portefeuille te paie chaque mois"

### 3. HowItWorksSectionCloser
4 steps:
1. On remplit ton agenda de rendez-vous
2. Tu rencontres l'entrepreneur (café, chantier, bureau)
3. Tu crées son profil UNPRO avec l'IA, en direct
4. Tu l'aides à choisir le bon forfait → commission à vie

### 4. ComparisonSectionOldVsUNPRO
Table comparative:
| Ancien modèle | UNPRO |
| Cold calls | Rendez-vous fournis |
| Leads froids partagés | Entrepreneurs qualifiés, exclusifs |
| Vente de clics/SEO | Des vrais rendez-vous dans leur agenda |
| One-shot | Revenus récurrents |

### 5. IncomeSimulatorWidget
Sliders interactifs:
- Rencontres/semaine (1-15)
- Taux de conversion (20-80%)
- Commission moyenne (100-500$)
Outputs animés: revenu mensuel, annuel, récurrent projeté

### 6. ObjectionHandlingSection
FAQ accordion:
- "Dois-je prospecter?" → Non, les RDV sont dans ton agenda
- "Dois-je être expert en vente?" → Non, l'IA fait le gros du travail
- "C'est quoi exactement le produit?" → Des rendez-vous qualifiés, pas des leads ou de la pub
- "Job d'été seulement?" → Été, temps partiel, ou permanent — toi qui choisis

### 7. TestimonialsSectionCloser
Mock quotes (3 cards) avec focus revenus + flexibilité étudiante

### 8. FormApplicationCloser
Fields: prénom, téléphone (auto-format), email, ville, expérience (dropdown), disponibilité (été/partiel/plein), mode (remote/personne/hybride), motivation (optionnel)
Submit → insert recruitment_leads + track event → redirect /carriere/merci

### 9. CTAStickyApply
Fixed bottom bar mobile: "Postuler maintenant" → scroll to form

## Page: PageRecruitmentThankYou
Checkmark animation, message de confirmation, prochaines étapes (on te contacte sous 48h).

## Components (src/components/recruitment/)
- HeroSectionCloser
- ProofSectionEarnings
- HowItWorksSectionCloser
- ComparisonSectionOldVsUNPRO
- IncomeSimulatorWidget
- ObjectionHandlingSection
- TestimonialsSectionCloser
- FormApplicationCloser
- CTAStickyApply

## Design
- Dark hero (gray-950) + UNPRO blue accents
- Framer Motion fade-up on scroll per section
- Mobile-first, full-width cards
- Income simulator with animated number counters
- Phone input auto-format (xxx) xxx-xxxx

## Technical Details
- No edge function needed initially — direct Supabase insert from client
- Phone formatting reuses existing pattern
- react-hook-form + zod validation
- SEO: Helmet with "Carrière UNPRO — Job d'été représentant terrain"
- Event tracking via existing trackEvent service

