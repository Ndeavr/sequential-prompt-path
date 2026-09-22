# Promesse « rendez-vous garantis » — une seule vérité, partout

## Ce qui ne va pas aujourd'hui

- La promesse est écrite différemment selon l'écran : cartes de forfaits, plan personnalisé, checkout, FAQ, offre d'entrée et scripts de vente calculent ou récrivent chacun leur version.
- Les volumes annoncés se contredisent : le moteur de recommandation de Clara promet 5 / 10 / 25 / 50 rendez-vous par mois, alors que le catalogue de vente actif en prévoit d'autres.
- Aucun écran n'exprime l'engagement réel : la garantie est annuelle (12 mois), mais tout est formulé comme un quota mensuel fixe.
- Clara n'a pas de réponse cadrée à l'objection « je peux acheter des leads à 35 $ », et les chiffres qu'elle cite sont écrits en dur dans ses instructions.

## Ce que je vais faire

1. **Une seule source de vérité pour la promesse.** Un module unique calcule, à partir des données réelles du forfait choisi : la cadence mensuelle indicative, la garantie annuelle (cadence × 12), le texte de saisonnalité et le texte d'objection prix. Aucun écran ne recalcule ni ne réécrit ces phrases.
2. **Formulation standardisée partout** : « Jusqu'à X rendez-vous par mois » + « Y rendez-vous qualifiés garantis sur 12 mois », suivi de : « La garantie est calculée sur une base annuelle. La distribution peut varier selon la saison, votre territoire et la demande réelle. » Plus aucune surface ne promet « X rendez-vous garantis chaque mois ».
3. **Checkout : l'engagement annuel d'abord.** « Y rendez-vous garantis / 12 mois » en principal, « cadence pouvant aller jusqu'à X/mois selon la demande » en secondaire. Chiffres issus du forfait réel, jamais dupliqués en dur.
4. **Alignement des volumes.** Le moteur de recommandation de Clara cesse d'utiliser sa propre liste de forfaits et lit le catalogue canonique. Les anciens codes de forfait sont résolus vers les codes actuels.
5. **Clara répond à l'objection prix.** Réponse canonique ajoutée aux instructions de Clara texte et voix : lead partagé vs rendez-vous exclusif préqualifié, puis rappel de la garantie annuelle avec les chiffres du forfait réellement affiché. Aucun chiffre en dur ; si le forfait n'est pas connu, Clara explique la différence sans citer de nombre.
6. **Aucune promesse inventée.** Si la donnée de garantie est absente ou incohérente, l'écran affiche un libellé neutre et l'anomalie est journalisée dans le mécanisme d'audit existant — jamais un chiffre inventé, jamais « ultra qualifié » sans preuve au dossier.
7. **Mobile.** Vérification que les libellés tiennent dans les cartes de forfaits, le checkout et le chat sans texte coupé.

## Vérification

Tests automatisés sur le calcul de la promesse (cadence, garantie annuelle, absence de donnée), sur l'absence de la formule « garantis par mois » dans les surfaces publiques, et sur l'alignement des volumes entre le moteur de Clara et le catalogue. Parcours réel en aperçu : audit IA entrepreneur → plan personnalisé → carte de prix → checkout, plus l'objection prix dans Clara texte, avec deux forfaits de cadences différentes, en 390 px et en bureau. Aucun vrai prospect contacté.

## Détails techniques

- Nouveau module unique `src/lib/pricing/appointmentGuarantee.ts` : `buildGuaranteePromise(plan)` → `{ monthlyCadence, annualGuarantee, cadenceLabel, guaranteeLabel, seasonalityNote, priceObjectionCopy, status: 'known' | 'unknown' }`. Entrée = données réelles du forfait (`plans.appointments_included` / devis personnalisé `guaranteed_appointments`).
- Consommateurs mis à jour (suppression des chaînes locales) : `CardPlanRegular`, `CardPlanFounders`, `PageContractorPersonalizedPlan`, `PageCheckoutStripe`, `AppointmentUpsellCard`, `PageActivationStart`, `PageCheckoutSuccess`, `SmartFAQ`/`faqs.ts`, `TrialActivationCard`/`offer350`, `PageProLandingNuclearClose` (`buildRecapScript`).
- `src/services/alexEntrepreneurGuidanceEngine.ts` : suppression de la constante `PLANS` codée en dur, lecture du catalogue canonique (`usePlanCatalog` / `plans`), résolution des codes legacy via `canonical_plan_code`.
- Clara : injection de la promesse et de la réponse objection dans `supabase/functions/alex-chat`, `_shared/alex-french-voice.ts` et `alex-voice-sales` à partir du même calcul serveur (`_shared/pricingModes.ts` + `plans`), en retirant les mentions « 5 rendez-vous » écrites en dur du prompt de vente.
- Anomalie de garantie → journalisation via le mécanisme d'audit existant, pas de nouveau canal de logs.
- Tests : nouveaux cas Vitest pour `appointmentGuarantee`, extension de `src/test/contractor-plan-catalog.test.ts` (cohérence moteur/catalogue), garde texte anti-« garantis par mois » ; puis `npm test` ciblé, `npm run typecheck`, `npm run lint:critical`, `npm run build`.
