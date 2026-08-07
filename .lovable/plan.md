# Débloquer l'approvisionnement : prospects réellement contactables

Le goulot n'est plus l'envoi. Il est en amont : la découverte et l'enrichissement ne produisent plus d'inventaire contactable. Ce plan répare la chaîne existante — aucun nouveau scraper, aucune nouvelle table de prospects, aucune modification des expéditeurs sécurisés (`send-verified-batch`, `second-touch-outreach`, garde anti-doublon 24 h, Stripe 1 $).

## Ce que l'inspection montre aujourd'hui (données de production)

- `verified_contractor_prospects` : 256 lignes, dont seulement **17 jamais contactées**. 219 sont en tier C, 31 en `needs_enrichment`. L'inventaire est simplement épuisé — plus personne de neuf à contacter.
- Numéros douteux : ils ne viennent pas de Google Places (178 lignes, aucune anomalie). Ils viennent de la normalisation : `normalizePhone` dans `acquisition-queue-worker` accepte **n'importe quelle chaîne commençant par `+`** sans valider le format nord-américain. Un `+10000000000` traverse donc jusqu'à Twilio Lookup et brûle une vérification pour rien.
- Barrière site web : `send-verified-batch` filtre avec `website_url IS NOT NULL`, et le code de rejet `missing_website_url` s'applique même quand une fiche Google Business publique existe. C'est exactement le défaut décrit : les petits entrepreneurs locaux sans site sont éliminés.
- Meilleure opportunité réelle calculée en production : **Laval × isolation** (offre = 0, score d'opportunité 44,8). Laval × thermopompe/HVAC n'a pas de signal de demande mesuré. La découverte visera donc Laval × isolation + Laval × thermopompe en second lot.

## Ce qui sera fait

### 1. Assainissement des numéros avant Twilio (cause racine)
Durcir `normalizePhone` dans `acquisition-queue-worker` : validation NANP stricte (indicatif régional 2-9, central 2-9, 10 chiffres), rejet des séquences répétées et des plages fictives, en plus du filtre `555` déjà présent. Tout rejet est compté avec la raison `phone_invalid_format` au lieu d'être envoyé à Lookup. Même règle appliquée au moment de la promotion vers `verified_contractor_prospects`.

### 2. Portillon de conformité fondé sur la provenance, pas sur le site web
La preuve d'entreprise publique devient : `website_url` **ou** `google_business_url` **ou** une preuve CASL enregistrée (`captureScrapeEvidenceForProfile` écrit déjà cette provenance pour chaque fiche Google Places). Modifications :
- `send-verified-batch` : remplacer `.not("website_url","is",null)` par le critère de provenance ci-dessus.
- Codes de rejet : `missing_website_url` devient `missing_public_provenance`, émis seulement si aucune des trois preuves n'existe.
- Aucun changement au reste de la logique d'envoi, aux quotas, ni à la garde 24 h.

### 3. Découverte contrôlée (25–50 entrepreneurs réels)
Exécution de la fonction canonique `acq-scrape-google-places` sur Laval × isolation puis Laval × thermopompe. Pour chaque prospect, persistance de la provenance déjà supportée par le code : nom, catégorie, ville, URL source publique, site web si disponible, téléphone brut, téléphone E.164, résultat/type de vérification, tier SMS, courriel public si disponible, horodatage d'enrichissement, statut de conformité et raison exacte de rejet. Aucune coordonnée inventée ou déduite.

Déduplication avant toute dépense d'enrichissement : `dedupeEngine` existant, plus contrôle contre `contractor_prospects`, `contractor_leads`, `verified_contractor_prospects`, `acq_sms_logs` (14 jours), opt-out, quarantaine et comptes payants.

### 4. Enrichissement par les fonctions canoniques
Passage par `acq-enrich-prospect` / `enrich-official-website` puis `twilio-lookup-phone`, uniquement sur les numéros ayant survécu à l'assainissement. Le trigger `compute_sms_eligibility_tier` attribue le tier (A/B/C/D) sans modification. Objectif : **au moins 5 prospects réellement contactables**, pas « 50 scrapés ».

### 5. Vue et panneau Supply Health
Nouvelle vue SQL `v_supply_health_funnel` comptant, pour aujourd'hui, chaque étape avec sa perte motivée :

```text
découverts → dédupliqués → source publique valide → preuve de contact publique
→ téléphone normalisé → téléphone vérifié → tier SMS ou courriel valide
→ éligible CASL → prêt au recrutement
```

Panneau proéminent en haut de `/admin/acquisition-pipeline`. Si éligible = 0, le panneau affiche explicitement le goulot courant (par exemple « 0 numéro mobile vérifié — source de découverte à élargir ») au lieu d'un état « sain ».

### 6. Test réel contrôlé
Un seul premier contact réel, réclamé par l'orchestrateur autonome existant (aucun appel direct à l'expéditeur). Vérification de l'acceptation et de la livraison Twilio, puis rejeu de la même requête d'orchestration pour prouver zéro doublon. Le recrutement horaire autonome reste actif ensuite, sous les quotas et protections existants.

## Détails techniques

Fichiers touchés :
- `supabase/functions/acquisition-queue-worker/index.ts` — validation NANP, comptage `phone_invalid_format`.
- `supabase/functions/send-verified-batch/index.ts` — critère de provenance (défaut d'intégration), nouveau code de rejet. Aucun changement à la garde 24 h ni à la logique d'envoi.
- Migration : vue `v_supply_health_funnel` (SECURITY INVOKER) + GRANT `authenticated`.
- `src/components/admin/acquisition/SupplyHealthPanel.tsx` (nouveau) + montage dans `PageAdminAcquisitionPipeline.tsx`.
- Aucune modification à `second-touch-outreach`, `recruitment-orchestrator`, Stripe, ou au First Dollar Tracker épinglé.

Le rapport final donnera les noms et comptes réels : découverts, dédupliqués, rejetés par raison, vérifiés, éligibles, candidat testé, SID Twilio, résultat de livraison, résultat du rejeu, et le blocage externe restant s'il y en a un.
