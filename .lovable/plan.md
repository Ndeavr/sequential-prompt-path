# Premier onboarding entrepreneur réel — réparer, mesurer, activer

## Ce que la base de données montre aujourd'hui (vérifié, pas supposé)

Interrogation réelle de la base de production :

| Étape | Nombre réel | Source |
|---|---|---|
| Prospects en base | 248 (221 avec téléphone, 118 avec courriel) | `contractor_leads` |
| En file d'attente | 192 prêts SMS + 24 prêts courriel | `acquisition_queue` |
| Contactés | 11 (dernier : 31 juillet) | `acquisition_queue` |
| Messages envoyés / livrés / échoués | **Aucun événement enregistré** | `contractor_funnel_events` |
| Clics sur un lien de message | **Aucun événement enregistré** | idem |
| Visites de page d'atterrissage | 97 | idem |
| Inscription commencée | 2 (codes envoyés), 1 vérifié | idem |
| Profil entrepreneur créé | **0** | idem |
| Onboarding complété | **0** | idem |
| Preuves de consentement | 146 | `casl_consent_evidence` |
| Relances programmées | 6 (dernière : 15 juin) | `acquisition_followup_queue` |

Conclusion : le tunnel n'a jamais produit un seul onboarding autonome complet, et l'envoi n'écrit aucun événement mesurable. Ce n'est donc pas un problème de volume — c'est un problème de chaîne cassée entre l'envoi et l'inscription.

## Ordre de travail

### 1. Rendre l'envoi mesurable (bloquant)
Brancher l'envoi SMS et courriel existant sur le journal d'événements canonique, avec l'identifiant de livraison retourné par le fournisseur. Un message n'est « livré » que si le fournisseur le confirme. Aucun nouveau système d'envoi : on répare `acquisition-queue-worker`, `acq-sms-send`, `acq-send-outreach` et les webhooks Twilio/Resend existants.

### 2. Réparer le chemin doré de bout en bout
Parcours testé avec un compte interne autorisé avant tout contact réel : lien personnalisé → attribution conservée → « Je suis entrepreneur » → code par SMS ou courriel → rôle conservé → confirmation des informations d'entreprise → catégorie et territoire → informations professionnelles étiquetées (Vérifié / Déclaré / En attente / Indisponible) → aperçu de la fiche publique → sauvegarde → statut CRM mis à jour → relances programmées. Une question à la fois, reprise possible après fermeture de la page.

### 3. Vue d'administration réelle
Réparer/compléter l'écran d'acquisition existant : totaux du tunnel, derniers événements, prospects bloqués par étape, échecs de livraison, échecs de code, onboardings abandonnés, prochaine relance, erreur technique exacte. Les chiffres absents s'affichent « Indisponible », jamais zéro.

### 4. Garde-fous avant tout envoi (aucun assouplissement)
Contact valide, pertinence Québec, base légale documentée, CASL, suppression/désabonnement, anti-doublon 24 h, heures d'envoi locales, plafond quotidien, exclusion des numéros non SMS. Lot maximum de 25 prospects par 24 h.

### 5. Envoi contrôlé — **nécessite votre accord explicite**
Tout reste en mode aperçu tant que vous ne dites pas « GO envoi réel ». À ce moment seulement : premier lot de 25, message unique avec une seule action, identification d'entreprise et désabonnement inclus, arrêt automatique si les échecs ou plaintes montent.

### 6. Relance automatique
Une seule relance après le délai approuvé, angle différent, arrêt immédiat sur inscription, réponse, désabonnement ou rebond dur. Lien de reprise indiquant l'étape restante pour les onboardings abandonnés.

### 7. Validation puis publication
Typecheck, lint ciblé, suite de tests complète, compilation, mobile 390 px, bureau, états connecté et anonyme, échecs SMS/courriel, code de vérification, persistance du rôle, attribution, reprise d'onboarding, changement de statut CRM, contrôle que les données privées ne sont pas exposées. Publication seulement si tout passe.

## Offre utilisée partout

« UNPRO aide les propriétaires à trouver le bon entrepreneur grâce à l'intelligence artificielle — et aide les bons entrepreneurs à être trouvés au bon moment. »

Pour les prospects admissibles : « Vos 3 premiers rendez-vous qualifiés sont gratuits. Ensuite, vous décidez si vous souhaitez continuer avec un plan personnalisé. » La rareté « 10 premiers par ville » n'est affichée que si le serveur peut la vérifier au moment de l'affichage. Aucun paiement imposé pendant l'onboarding.

## Détails techniques

- Journal canonique : `contractor_funnel_events` via `src/lib/analytics/logFunnelEvent.ts` et son équivalent serveur. Ajout des champs manquants au besoin (identifiant fournisseur, version de gabarit, environnement, session de page), sans créer de table parallèle.
- Envoi : `acquisition-queue-worker` (mode aperçu déjà présent), `acq-sms-send`, `acq-send-outreach`, webhooks Twilio/Resend pour les statuts de livraison réels.
- Secrets Twilio et Resend déjà présents ; aucune nouvelle intégration.
- Rôle et attribution : `create_auth_role_intent`, `src/services/auth/roleIntent.ts`, `src/config/contractorFunnel.ts` — réparation seulement.
- Exclusion des comptes internes des rapports de conversion via le marqueur de test déjà présent.
- Google Places reste désactivé.

## Critère de réussite

Un entrepreneur réel, arrivé par une source suivie, ayant créé son compte lui-même, vérifié son contact, choisi le rôle entrepreneur, confirmé son entreprise, complété l'onboarding, avec fiche sauvegardée, statut CRM à jour et historique d'événements complet. Aucun compte de test ni insertion manuelle ne compte.

## Rapport final

Commit publié, prospects admissibles, contacts par canal, livraison/clics/conversions, identifiant interne de l'entrepreneur intégré, preuves d'événements, tests exécutés, blocages restants, prochaine action à plus fort effet de levier.
