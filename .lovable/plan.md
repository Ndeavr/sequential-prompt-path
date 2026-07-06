## Objectif unique

Obtenir **1 entrepreneur qui paie 1 $ aujourd'hui**. Tout le reste est du bruit.

Cible : **25 entrepreneurs isolation QC** (mobile + 20+ avis + site/FB actif), routés vers une landing dédiée avec paiement en moins de 60 secondes.

---

## 1. Landing dédiée `/isolation-qc` (nouvelle)

Fichier : `src/pages/pro/PageProIsolationQC.tsx` + route dans `routesConfig.ts`.

Contenu ultra-minimal (règle des 3 secondes) :
- **H1** : « Recevez des rendez-vous exclusifs en isolation. Pas des leads partagés. »
- **Sub** : « Essai 7 jours — 1 $. Payez seulement pour activer votre profil. »
- **1 bouton** : « Activer pour 1 $ » → checkout direct
- **3 preuves** courtes sous le bouton : demandes actives cette semaine dans la ville trackée (UTM), vérification RBQ, annulation en 1 clic

Retirés : score IA, dashboard preview, % complétion, jargon, plans multiples, comparateurs.

Params UTM lus : `?src=sms&camp=A|B|C|D|E&city=&company=` → pré-remplit checkout metadata pour attribution.

---

## 2. Checkout 60 secondes

Réutiliser `create-activation-checkout` existant, mais :
- Bouton unique déclenche `supabase.functions.invoke("create-activation-checkout", { body: { slug, source: "isolation-qc", utm } })`
- Redirection immédiate (pas de formulaire intermédiaire — email collecté par Stripe Checkout)
- Success URL → `/pro/activate/success?cs={CHECKOUT_SESSION_ID}` qui déclenche activation instantanée + envoie SMS/email de bienvenue

Vérifier que l'edge function tag bien `campaign_variant` dans metadata Stripe pour rapport de conversion.

---

## 3. Les 5 variantes SMS (test simultané, 5×5)

Créer dans `src/lib/outbound/isolationSprintCopy.ts` les 5 templates (A Revenue, B Fear, C Social Proof, D Demand, E Curiosity) — exactement le texte du prompt utilisateur.

Chaque SMS pointe vers `unpro.ca/isolation-qc?src=sms&camp=X&city={{city}}&company={{company}}`.

---

## 4. Sélection de 25 cibles

Query SQL dans `/admin/sniper` (existe déjà) ou nouvelle vue admin `/admin/first-dollar-sprint` :

```sql
select * from prospects
where category ilike '%isolation%'
  and province = 'QC'
  and mobile_phone is not null
  and reviews_count >= 20
  and (website is not null or facebook_url is not null)
  and status = 'active'
  and last_contact_at is null
order by reviews_count desc
limit 25;
```

Assignation manuelle des 25 aux 5 variantes (5 par variante).

---

## 5. Funnel tracking obligatoire

Table `first_dollar_sprint_events` (une seule) :
- `sms_sent` / `sms_delivered` / `link_clicked` / `landing_viewed` / `checkout_opened` / `checkout_paid` / `activated`
- Colonnes : `prospect_id`, `campaign_variant`, `city`, `category`, `event`, `timestamp`, `session_id`

Dashboard `/admin/first-dollar-sprint` affiche l'entonnoir en direct (25 → clics → paiements) avec le drop-off le plus élevé mis en évidence.

---

## 6. Follow-up 15 min si abandon paiement

Cron `*/5 * * * *` → edge function `sprint-abandonment-followup` :
- Si `checkout_opened` sans `checkout_paid` après 15 min → SMS unique : « Une question sur l'activation 1 $ ? Répondez ici, un humain répond. »
- Un seul follow-up. Pas de séquence.

---

## 7. Règle d'arrêt

Après les 25 SMS envoyés :
- **1+ paiement** → cloner exactement cette variante × ville × catégorie pour toiture, fondation, moisissure, thermopompe (25 chacun).
- **0 paiement mais clics** → le blocage est la landing ou le checkout, pas le SMS. Corriger avant de renvoyer.
- **0 clic** → le blocage est le SMS (copie ou ciblage). Ne pas envoyer les 500 suivants.

---

## Livrables techniques

**Nouveaux fichiers**
- `src/pages/pro/PageProIsolationQC.tsx`
- `src/lib/outbound/isolationSprintCopy.ts`
- `src/pages/admin/PageFirstDollarSprint.tsx`
- `supabase/functions/sprint-abandonment-followup/index.ts`

**Migrations**
- Table `first_dollar_sprint_events` (avec GRANT + RLS admin-only)
- Cron `sprint-abandonment-followup` toutes les 5 min

**Modifications**
- `src/config/routesConfig.ts` : ajouter `/isolation-qc` + `/admin/first-dollar-sprint`
- `supabase/functions/create-activation-checkout/index.ts` : accepter `source` + `utm` dans metadata

**Explicitement hors scope** (à ne PAS toucher aujourd'hui) :
- Refonte du wizard scan-ia
- Plans (Pro/Premium/Élite/Signature)
- Score AIPP
- Onboarding entrepreneur global
- Autres pages publiques

---

## Succès

Un entrepreneur isolation QC paie 1 $ dans les 24 h et son profil est activé automatiquement. On enregistre : source SMS, variante, ville, temps clic→paiement. C'est le patron zéro à cloner.
