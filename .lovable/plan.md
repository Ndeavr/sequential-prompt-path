# UNPRO Conversion Engine — Pilote Exterra (Google Ads)

Objectif : prouver la boucle **Google Ads Exterra → landing co-brandée UNPRO → qualification Alex → compatibilité → rendez-vous exclusif Exterra → résultat (soumission/contrat/valeur)**. Exterra garde la propriété de son trafic payant : aucun lead Exterra n'est redistribué sans consentement explicite du propriétaire.

## État vérifié de la production

- Fiche Exterra existante : `contractors.id = d0896dbc-dac4-4746-bb35-a4abce298f90` (« Fissure drain exterra », 514-742-3665). Profil de compatibilité **complété** (pack `excavation_fondation`, 75 %, `contractor_compatibility_profiles` + `contractor_matching_rules`).
- Réutilisable tel quel : qualification Alex (`alex_qualification_sessions`, `scoringEngine`, `categoryDecisionTrees`), rendez-vous (`appointment_slots`, `booking_requests`, `/book/:slug`), consentements (`lead_consent_logs`), attribution UTM (`src/lib/forms/utm.ts` — sessionStorage), événements funnel (`contractor_funnel_events`, `acquisition_events`), visites (`landing_visits`).
- Manquant (à construire, sans dupliquer) : aucune landing « contractor-owned », aucun `gclid`/`gbraid`/`wbraid`, aucune colonne de propriété exclusive sur `projects`, aucune infra Google Ads offline conversions, aucune vue admin de funnel par campagne.

## Ce qui sera construit

### 1. Couche campagne (réutilisable, pas codée en dur pour Exterra)
- Table `contractor_campaigns` : `contractor_id`, `slug` (ex. `fissure-fondation`), `service_intent`, `acquisition_mode = 'contractor_owned'`, `exclusive_routing = true`, `fallback_mode = 'consent_required'`, `status` (active/paused), config hero/CTA par intention (jsonb). Seed : 5 intentions Exterra (fissure, drain français, infiltration, imperméabilisation, excavation).
- Table `campaign_attributions` : `session_id`, `campaign_id`, `gclid`, `gbraid`, `wbraid`, UTM complets, `referrer`, `landing_path`, `device`, `first_touch_at`. Extension de `utm.ts` pour capter gclid/gbraid/wbraid et persister au-delà du changement de page.
- Table `campaign_leads` (ou extension de `projects` via colonnes `owner_contractor_id`, `acquisition_mode`, `campaign_id`, `fallback_consent_at`) : verrou exclusif Exterra ; `matching_status` reste hors matching partagé tant que le verrou est actif.
- Table `campaign_outcomes` : `estimate_created`, `contract_won/lost`, `contract_value_cents` (privé, jamais public), saisie admin/entrepreneur.

### 2. Landing co-brandée — route `/c/:contractorSlug/:intentSlug`
- Une seule architecture réutilisable ; le pilote Exterra n'est qu'une ligne de config. Alias convivial `/exterra/fissure-fondation` → même composant.
- Hero co-brandé : identité Exterra proéminente + « Qualification propulsée par UNPRO ». Aucune allégation inventée (labels Verified / Declared / Public source / Inferred / Pending).
- Contenu par intention de recherche (headline + choix immédiats + CTA « Évaluer mon problème »), thème clair rapide, mobile-first, JS minimal, pas de popup.
- Edge function publique `campaign-landing-resolve` : retourne uniquement les champs publics (nom, slug, config hero, statut) — jamais les préférences privées.

### 3. Qualification Alex conversationnelle (une question à la fois)
- Réutilise `alex_qualification_sessions` + arbre `excavation_fondation` : problème → localisation → ancienneté → eau active → type de fondation → sous-sol fini → photos (1-3, caméra mobile, storage sécurisé existant) → adresse → échéancier → coordonnées.
- Inconnu ≠ incompatible : états KNOWN / UNKNOWN / DECLARED / INFERRED ; Alex repose une question si elle lève l'incertitude.
- Évaluation compatibilité via `contractor_matching_rules` Exterra : HIGH / POSSIBLE (info requise) / NOT COMPATIBLE — pas de score numérique arbitraire affiché.

### 4. Rendez-vous exclusif + fallback consenti
- Si compatible : créneaux réels `appointment_slots` d'Exterra → `booking_requests` → confirmation SMS/courriel via l'infra existante. Jamais « Exterra vous contactera ».
- Si incompatible : message neutre + boutons « Oui, trouver un entrepreneur » / « Non merci ». Consentement horodaté dans `lead_consent_logs` ; seul le « Oui » déverrouille le matching UNPRO normal. Refus = arrêt, aucune redistribution.

### 5. Événements funnel (infra existante étendue)
`landing_view → qualification_started → qualification_question_answered → photo_uploaded → contact_captured → project_qualified/disqualified → fallback_requested → appointment_slots_viewed → appointment_booked → appointment_completed → estimate_created → contract_won/lost → contract_value_recorded`. Aucun événement fabriqué. Niveaux de conversion Google (micro/qualifiée/haute valeur/résultat) modélisés pour un futur import offline — aucun envoi à Google Ads dans cette phase.

### 6. Admin — « Exterra — Conversion Engine »
- Nouvelle vue sous Acquisition : entonnoir Trafic → Qualification → Contacts → Qualifiés → RDV → RDV complétés → Soumissions → Contrats → Revenus, taux dérivés, revenu/lead qualifié, revenu/RDV ; performance par intention (fissure, drain, infiltration, etc.).
- Checklist de readiness : LANDING READY / ATTRIBUTION READY / QUALIFICATION READY / APPOINTMENT READY / CONVERSION TRACKING READY → READY FOR GOOGLE ADS TRAFFIC.
- Bouton « Copier l'URL Google Ads » (`https://unpro.ca/exterra/fissure-fondation`) + URL de test avec paramètres factices. Statut campagne ACTIVE/PAUSED.
- A/B testing de CTA préparé via `conversion_variant_assignments` existant, optimisé vers RDV/contrat (pas vers clics).

### 7. Sécurité / RLS
- GRANT + RLS sur toutes les nouvelles tables ; landing publique via edge function service-role ne retournant que des champs publics ; photos en storage privé ; le token/query ne peut pas changer le propriétaire du lead ; actions admin protégées ; Exterra ne voit que ses données.

## Approche d'exécution
1. **Phase 1 — golden path** : `/exterra/fissure-fondation` complet de bout en bout (landing → Alex → photos → adresse → compatibilité → RDV → confirmation → attribution → admin funnel).
2. **Phase 2** : réplication par config des 4 autres intentions (aucune nouvelle architecture).
3. Aucune modification des campagnes Google Ads d'Exterra ; la bascule est manuelle après checklist verte.

## Tests
- E2E style production : URL avec UTM/gclid de test → landing → attribution persistée → Alex → photo → adresse → compatibilité → RDV test-safe → admin funnel mis à jour → résultat enregistré.
- Cas incompatible : aucun reroutage automatique ; refus = stop ; acceptation = matching UNPRO.
- Mobile 390 px, logged-out, build/typecheck propres, vérification RLS (aucune donnée privée Exterra exposée publiquement).

## Livrable
Première ligne : `EXTERRA GOOGLE ADS PILOT URL: https://unpro.ca/exterra/fissure-fondation`, puis l'état point par point (fiche, questionnaire, landing, Alex, attribution, RDV, routing exclusif, consentement fallback, admin funnel, mobile, sécurité, readiness Google Ads, bloqueurs).
