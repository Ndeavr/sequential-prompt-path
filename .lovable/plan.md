
# Ajout de leads par affilié — War Room

Objectif : permettre à un affilié (Lorraine) d'ajouter un prospect en < 30 s depuis son téléphone, via 4 canaux, avec extraction IA, validation humaine, détection de doublons et attribution automatique.

---

## 1. Entrée UI — War Room affilié

Emplacement : `src/pages/affiliate/PageAffiliateWarRoom.tsx` (ou équivalent existant).

- Bouton principal en haut : **+ Ajouter un prospect** (sticky sur mobile).
- **FAB caméra flottant** en bas à droite (mobile) → ouvre directement le mode Photo de carte.
- Au clic sur le bouton principal → `<AddLeadSheet>` (Drawer bottom sur mobile, Dialog desktop) avec 4 tuiles :
  1. Saisie rapide
  2. Photo de carte d'affaires
  3. Importer photo/fichier
  4. Depuis un site Web

---

## 2. Les 4 modes de capture

### Mode 1 — Saisie rapide
Composant : `<QuickEntryForm>`.
- Champs : entreprise, contact, téléphone, courriel, site, ville, catégorie, note, source du lead.
- Téléphone : `useNormalizedInput('phone')` (existant) — accepte tous formats, normalise en E.164.
- Courriel : `useNormalizedInput('email')`. Site : `useNormalizedInput('url')`. Ville : autocomplete `AutocompleteInput` (portal).
- Catégorie : select basé sur `activities_primary`.
- Boutons finaux : Enregistrer / Enregistrer + SMS perso / Enregistrer + Appeler.

### Mode 2 — Photo de carte d'affaires
Composant : `<BusinessCardCapture>`.
- Input `<input type="file" accept="image/*" capture="environment">` — mobile propose caméra + galerie.
- Upload direct vers bucket Storage `business-cards` (privé, RLS affilié).
- Appel edge `extract-business-card` (Gemini 2.5 Flash vision) → JSON structuré.
- Écran de validation `<ExtractedLeadReview>` : chaque champ éditable, badge de confiance par champ.
- Actions : Corriger / Ajouter le prospect.
- **Règle** : jamais de création silencieuse — validation humaine obligatoire.

### Mode 3 — Import fichier
Composant : `<FileImportFlow>`.
- Accepte : JPG, PNG, HEIC, PDF, CSV, XLSX.
- Détection type MIME :
  - Image/PDF → edge `extract-business-card` (batch si multi-pages).
  - CSV/XLSX → parse client avec PapaParse / SheetJS → mapping colonnes `<ColumnMapper>` (auto-détection heuristique).
- Rapport final : détectés / prêts / doublons / invalides. Écran de validation groupée avant insert.

### Mode 4 — Depuis un site Web
Composant : `<WebsiteEnrichment>`.
- Champ unique intelligent : accepte URL, nom d'entreprise, ou téléphone.
- Edge function `enrich-lead-from-web` :
  - Firecrawl scrape (formats `markdown`, `branding`, `links`).
  - Extraction Gemini : nom légal, tél, courriel, adresse, villes desservies, catégorie, services, réseaux sociaux, Google Business, RBQ, dirigeants.
  - Cross-check RBQ/NEQ via `verification-status-refresh` déjà en place.
- Écran de validation identique au mode 2.
- **Ne jamais écraser** les valeurs déjà saisies par l'affilié.

---

## 3. Détection de doublons (transverse)

Edge function `lead-dedupe-check` appelée avant tout INSERT :
- Match sur : téléphone E.164, email, domaine site, nom normalisé + ville, RBQ, NEQ.
- Retour : `{ match: contractor|null, similarity, existing_owner, last_contact_at, status }`.
- UI `<DuplicateWarning>` : Voir le prospect / Fusionner / Annuler.

---

## 4. Attribution & consentement

Tous les leads ajoutés en manuel → insert dans `contractor_leads` (existant) avec :
- `created_by_affiliate_id` = affilié courant
- `assigned_affiliate_id` = affilié courant
- `lead_source` = `affiliate_manual`
- `consent_channel` (obligatoire) : `business_card` | `in_person` | `referral` | `public_website` | `public_directory` | `event` | `existing_client` | `other`
- `consent_to_contact` : `yes` | `no` | `unknown` — pilote les actions disponibles (SMS bloqué si `no`).

---

## 5. Actions post-création

Modal succès `<LeadCreatedActions>` :
- SMS perso → `sms:` deep link avec message pré-rempli.
- Appeler → `tel:` deep link.
- Envoyer invitation UNPRO → edge existante `send-affiliate-invite`.
- Ajouter note / Programmer suivi.

---

## 6. Fiche lead

Extension `<LeadDetailDrawer>` déjà présent (Command Center) pour afficher :
photo originale carte, source, données extraites vs saisies, historique modifications, SMS préparés, appels, suivis, statut onboarding, plan suggéré, commission potentielle, propriétaire.

---

## Technique — récapitulatif

```text
Frontend
  src/pages/affiliate/PageAffiliateWarRoom.tsx          (bouton + FAB)
  src/features/affiliate/addLead/
    AddLeadSheet.tsx
    QuickEntryForm.tsx
    BusinessCardCapture.tsx
    FileImportFlow.tsx
    WebsiteEnrichment.tsx
    ExtractedLeadReview.tsx
    ColumnMapper.tsx
    DuplicateWarning.tsx
    LeadCreatedActions.tsx
    useAddLead.ts        (orchestrateur : dedupe → insert → outcome)

Edge functions (Supabase)
  extract-business-card    (Gemini vision, JPG/PNG/HEIC/PDF)
  enrich-lead-from-web     (Firecrawl + Gemini)
  lead-dedupe-check        (SQL similarity + RBQ/NEQ)
  (réutilise) verification-status-refresh, send-affiliate-invite

Storage
  business-cards/ (privé, RLS: affilié = owner)

DB (migration)
  ALTER TABLE contractor_leads ADD
    created_by_affiliate_id uuid,
    assigned_affiliate_id uuid,
    consent_channel text,
    consent_to_contact text,
    business_card_url text,
    extraction_raw jsonb,
    extraction_confidence jsonb;
  INDEX sur phone_e164, email, domain, rbq_number, neq
  RLS: affilié lit/écrit ses propres leads; admin full.
  GRANTs standards.

Reliability
  reportOutcome() sur chaque étape (extract, enrich, dedupe, insert)
  FailureCode: EXTRACTION_LOW_CONFIDENCE, DUPLICATE_FOUND, SOURCE_UNAVAILABLE
```

---

## Critères de succès

- Parcours photo → SMS envoyé < 30 s sur mobile.
- Aucune création silencieuse : écran de validation systématique quand extraction IA impliquée.
- Aucun doublon créé sans warning explicite.
- Attribution `affiliate_manual` visible dans `/admin/affiliates` + commission liée à l'affilié.
- Consentement journalisé; SMS bloqué si `consent_to_contact = no`.
- Téléphones acceptés dans tous formats, stockés en E.164, affichés `(514) 123-4567`.
- FAB caméra atteignable en 1 tap depuis la War Room.
