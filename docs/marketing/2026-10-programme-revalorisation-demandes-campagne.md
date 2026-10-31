# UNPRO — Campagne « UNPRO rachète vos leads! » — v2
**31 octobre 2026 · Dossier de production éditoriale · NON PUBLIÉ · aucun SMS, courriel ou achat média envoyé · programme d'échange non encore vérifié opérationnel.**


## Réalisation technique — 31 octobre 2026
**SUR BRANCHE GITHUB, NON PUBLIÉ / NON DÉPLOYÉ.** Le projet Lovable lié n'a pas de crédits disponibles au moment de la tentative de modification; implémentation faite directement dans une branche du dépôt existant sans consommer Lovable. Cette section décrit du code soumis à revue, pas un site en production vérifié.

- Page SEO / formulaire FR-QC : src/pages/marketing/PageRachatLeads.tsx ; route /rachat-leads-entrepreneurs.
- Enregistrement OTP : passage via le login existant en mode téléphone et retour à la campagne, rôle entrepreneur vérifié côté RLS.
- Formulaire : entreprise, coordonnées client, service, ville, besoin, origine, coût, motif, provenance du consentement; dépôt PDF/images privé. Pas de transfert à d'autres professionnels ni de notification client automatisée.
- DB : supabase/migrations/20261031154000_lead_repurchase_intake.sql ; tables de soumissions, documents et consentements d'offres + bucket privé et RLS.
- Espace entrepreneur : statut réel de ses dossiers, offres préférées SMS/courriel sur consentement distinct. Les préférences n'entraînent aucun envoi automatique avant intégration réelle.
- Crédit : valeur déclarée saisie, mais statut initial pending et zéro crédit accordé; approbation administrateur requise. Pas encore de moteur d'utilisation des crédits/garantie de rendez-vous.
- Tests : src/test/rachat-leads-privacy.test.ts ; tests de contrat statiques. **La migration, les tests de connexion réel OTP, l'upload en stockage et l'E2E ne sont pas exécutés sur le backend.** Publication interdite tant qu'ils n'ont pas passé.
- Contenu SMS (DRAFT, non envoyé) : « UNPRO rachète vos leads! Trop loin? Hors service? Ce n'était pas pour vous? On trouve le bon pro pour votre client. Crédit équivalent à la valeur du lead. https://unpro.ca/rachat-leads-entrepreneurs STOP »
- Avant activation publique : déployer et tester migration+page, vérifier téléphone OTP, droits RLS, documents, suppression/rectification de données, conditions finales et barème exact des crédits, vérifier licence avant offre réelle; ne pas activer d'envoi sans audience consentie et système d'opt-out.

## RÈGLE ÉDITORIALE PRIORITAIRE
L'accroche publique est **« UNPRO rachète vos leads! »**, sans guillemets de prudence ni mention « pas en argent » dans le texte publicitaire.

Messages à garder constants :
1. « Ce n'était pas pour vous? On trouve le bon entrepreneur pour ce client. »
2. « Vous obtenez un crédit équivalent à la valeur du lead. »
3. « Échangez vos crédits contre des rendez-vous qualifiés, exclusifs, adaptés à vos services, à votre territoire et à vos disponibilités. »

Les **conditions du programme**, distinctes des créations publicitaires, expliquent la nature non monétaire du crédit, la méthode de détermination de valeur, les consentements, les validations, les modalités d'utilisation et la disponibilité. Les conditions doivent être faciles à consulter **avant la participation**, pas dissimulées. Ne pas rendre la promesse publique tant que la mécanique de crédits, l'attribution et la rédemption ne sont pas fonctionnelles, financées et vérifiées.

## 1. MESSAGE MAÎTRE

**UNPRO rachète vos leads!**

Combien de fois avez-vous répondu à un client :
« On fait pas ça. »
« C'est trop loin. »
« On est complets. »

Vous avez peut-être même accepté une rencontre avant de réaliser que le projet ne correspondait pas à votre entreprise.

**Et le pire? Vous aviez payé pour obtenir ce lead.**

**Ce n'était pas pour vous? On trouve le bon entrepreneur pour ce client.**

**Vous obtenez un crédit équivalent à la valeur du lead.**

Utilisez vos crédits pour obtenir des rendez-vous qualifiés et exclusifs qui correspondent à **VOS services, VOTRE territoire et VOS disponibilités**.

**UNPRO — Les bons projets. Aux bons professionnels.**

**CTA : « Échanger mes leads »**

## 2. SMS (après preuve du droit de contact)
« UNPRO rachète vos leads! Trop loin? Hors service? Ce n'était pas pour vous? On trouve le bon pro pour votre client. Crédit équivalent à la valeur du lead. [LIEN] STOP »

Version de rappel autorisé (pas d'envoi dupliqué) :
« Payé pour un lead qui n'était pas pour vous? UNPRO rachète vos leads. Transformez-les en crédits pour des RDV exclusifs adaptés à votre entreprise. [LIEN] STOP »

Le domaine du lien et la page de destination doivent identifier l'expéditeur, afficher les coordonnées obligatoires et permettre un désabonnement fonctionnel. Ne pas envoyer si preuve CASL insuffisante; utiliser les contrôles existants, avec plages horaires, suppression/déduplication et limite de volume.

## 3. COURRIEL
**Objet :** UNPRO rachète vos leads!
**Pré-en-tête :** Ce client n'était pas pour vous? On trouve le bon entrepreneur.

Bonjour [Prénom],

Combien de fois avez-vous reçu une demande pour finalement répondre :

« On fait pas ça. »
« C'est trop loin. »
« On est complets. »

Parfois, vous aviez même payé pour recevoir ce lead.

**UNPRO rachète vos leads!**

**Ce n'était pas pour vous? On trouve le bon entrepreneur pour ce client.**

En échange, **vous obtenez un crédit équivalent à la valeur du lead**.

Et vous pouvez utiliser vos crédits pour des rendez-vous qualifiés, exclusifs et adaptés à vos services, à votre territoire et à vos disponibilités.

Au lieu de perdre une demande qui ne vous convient pas, transformez-la en occasion d'affaires.

**[Échanger mes leads]** → [LIEN]

UNPRO — Les bons projets. Aux bons professionnels.

[Identité et coordonnées commerciales conformes de l'expéditeur] · [Lien de désabonnement actif]

## 4. FACEBOOK / INSTAGRAM ADS
**Texte principal :**
« On fait pas ça. »
« C'est trop loin. »
« On est complets. »

Combien de fois avez-vous payé pour recevoir un lead… qui n'était finalement PAS POUR VOUS?

🔥 **UNPRO rachète vos leads!**

Ce n'était pas pour vous? **On trouve le bon entrepreneur pour ce client.**

**Vous obtenez un crédit équivalent à la valeur du lead.**

Échangez vos crédits contre des rendez-vous qualifiés et exclusifs, compatibles avec **VOS services, VOTRE territoire et VOTRE horaire.**

**Titre :** UNPRO rachète vos leads!
**Description :** Transformez vos demandes non retenues en crédits UNPRO.
**CTA :** En savoir plus.

**Direction artistique :** cadrage premium, capture stylisée d'un entrepreneur devant 3 cartes « Hors territoire », « Pas notre spécialité », « Horaire complet »; transition vers « UNPRO rachète vos leads! » puis « Crédit équivalent à la valeur du lead »; pas de chiffres fictifs, faux avis, logo modifié ni indice de crédit déjà accordé. Utiliser l'authentique logo UNPRO.

**Vidéo 15 secondes (script)** :
0–4 s : « Trop loin… on fait pas ça… on est complets! »
4–7 s : « Vous avez payé pour ces leads? »
7–11 s : « UNPRO rachète vos leads! »
11–15 s : « Crédit équivalent à leur valeur. De meilleurs rendez-vous, selon vos critères. UNPRO.CA. »

## 5. PAGE WEB SEO
**Route suggérée :** `/rachat-leads-entrepreneurs` (valider collisions / canoniques dans la base existante).
**Title SEO :** UNPRO rachète vos leads | Échangez vos demandes non retenues
**Meta description :** Un lead hors territoire, hors service ou incompatible? UNPRO rachète vos leads. Obtenez un crédit équivalent à leur valeur et accédez à des rendez-vous qualifiés et exclusifs.
**H1 :** UNPRO rachète vos leads!
**Sous-titre :** Ce n'était pas pour vous? On trouve le bon entrepreneur pour ce client.
**Bandeau fort :** Vous obtenez un crédit équivalent à la valeur du lead.
**Corps :**
« Vous payez pour recevoir des demandes provenant de différentes sources : Google, Facebook, votre site Web, des partenaires ou des plateformes spécialisées. Pourtant, vous ne pouvez pas répondre à chacune d'elles. Certaines ne sont pas dans votre secteur. D'autres concernent un service que vous n'offrez pas. Et parfois, votre calendrier est déjà plein.

Ce lead n'était pas pour vous. Mais il peut être le bon projet pour un autre professionnel.

UNPRO rachète vos leads. Votre client poursuit son projet avec Clara, qui recherche un entrepreneur compatible avec ses besoins. Vous recevez un crédit équivalent à la valeur du lead, utilisable pour accéder à des rendez-vous qualifiés et exclusifs selon vos critères. »

**H2 :** Des rendez-vous qui correspondent à VOTRE entreprise
« Vous choisissez les services, le territoire et les horaires qui vous conviennent. Clara tient compte de vos priorités pour rechercher des rendez-vous pertinents. »

**H2 :** Comment échanger mes leads?
« 1. Je propose une demande qui ne correspond pas à mon entreprise. 2. Mon client accepte de poursuivre sa démarche avec UNPRO. 3. UNPRO qualifie le besoin et cherche le bon professionnel. 4. Je reçois mon crédit après validation. 5. J'utilise mes crédits pour les rendez-vous admissibles qui me conviennent. »

**CTA primaire :** Échanger mes leads
**CTA secondaire :** Découvrir UNPRO pour mon entreprise

**Lien visible en pied de page / près du CTA :** « Conditions du programme de rachat de leads » (lien vers conditions complètes).

**FAQ indexable :**
- **UNPRO rachète quels leads?** Les demandes authentiques, récentes et admissibles qui ne correspondent pas à vos services, zones ou disponibilités.
- **Comment est calculée la valeur de mon lead?** Selon les règles de valorisation et les justificatifs décrits dans les conditions du programme.
- **Quels rendez-vous puis-je obtenir?** Des rendez-vous exclusifs et qualifiés, dans la mesure où ils sont disponibles et compatibles avec vos critères.
- **Mon client doit-il donner son accord?** Oui. Le propriétaire choisit librement de poursuivre avec UNPRO avant toute transmission de ses renseignements.

**SEO technique** : une page FR-Québec canonique, aucune multiplication de pages villes similaires, JSON-LD de FAQ seulement conforme au contenu visible, OpenGraph/partage, chargement mobile, liens internes depuis pages entrepreneurs, consentements et conditions liés. FR/EN seulement si vraies traductions.

## 6. CONDITIONS DU PROGRAMME — RÉDIGÉES SÉPARÉMENT DES PUBLICITÉS

**Ces conditions sont une proposition de politique, à faire valider avant publication.**

**Nature du rachat.** « Rachat » signifie l'attribution de crédits de services UNPRO, et non un versement en argent, un rachat de fichier de coordonnées ou l'acquisition automatique de droits sur les données d'un propriétaire.

**Valeur équivalente.** Pour un lead acheté à prix unitaire, la valeur du crédit correspond au **prix unitaire d'acquisition justifié**, en dollars canadiens, hors taxes récupérables. Pour une campagne publicitaire à coût variable, la valeur correspond au coût d'acquisition démontrable par lead unique attribué à cette campagne (dépenses éligibles documentées divisées par nombre de leads uniques effectivement acquis). Pour une demande organique, référée ou sans preuve de coût, la valeur doit être déterminée selon un barème publié avant son acceptation; sans barème accepté, le système ne doit pas annoncer ni accorder une valeur fictive.

**1 $ de crédit = 1 $ CA de valeur d'achat de services de rendez-vous admissibles**, sans remboursement en argent. N'inclut pas automatiquement l'activation professionnelle de base à 350 $ + taxes, qui est un droit distinct; toute exception requiert une offre explicitement affichée et autorisée.

**Éligibilité / preuve.** Demande réelle et unique, dans une catégorie et un secteur pris en charge, propriétaire effectivement intéressé, absence de doublon, droits contractuels de proposer cette réorientation, justificatif de coût le cas échéant. Les demandes de tests, fausses, sans consentement, revendues sans droit ou déjà créditées sont exclues.

**Consentement.** Le professionnel remet un lien d'invitation au propriétaire; le propriétaire choisit directement de fournir à UNPRO ses renseignements et son autorisation éclairée pour leur usage et transmission éventuelle. Aucune transmission de coordonnées, photos, devis, adresses ou données personnelles par l'apporteur sans droit et autorisation nécessaires. Les consentements de service et de marketing sont séparés. L'acceptation de recevoir l'aide de Clara n'entraîne pas l'accord de recevoir des publicités.

**Condition d'abonnement obligatoire pour bénéficier des crédits.** Le professionnel doit posséder un **abonnement payé, actif, non expiré et valide au service Rendez-vous UNPRO**, avec droit effectif aux rendez-vous, au moment où un crédit est accordé **et à chaque tentative d'utilisation**. La création du compte, une simple inscription, un essai non payé, un plan de présence IA sans rendez-vous ou l'activation unique à 350 $ ne satisfont pas cette condition. Un professionnel peut soumettre ses demandes avant de s'abonner; ses dossiers restent en attente et aucun crédit n'est accordé avant confirmation d'un abonnement admissible. La résiliation, l'expiration, le remboursement ou la suspension de son abonnement bloque l'utilisation des crédits jusqu'au rétablissement d'un abonnement valide. La valeur déjà confirmée n'est pas automatiquement supprimée, sous réserve des autres conditions contractuelles du programme. Les préférences d'offres peuvent être enregistrées, mais le droit de recevoir et d'utiliser des offres de rendez-vous reste conditionnel à cet abonnement et aux consentements nécessaires.

**Émission du crédit.** En attente jusqu'aux contrôles d'identité, unicité, droits, consentement et qualification; attribution serveur unique, registre horodaté, piste d'audit, possibilité de contrepassation en cas d'erreur ou de fraude; aucun crédit dès la simple soumission non vérifiée.

**Utilisation.** Les crédits servent seulement à régler les rendez-vous exclusifs admissibles, à valeur et conditions affichées avant confirmation. Ils ne garantissent ni disponibilité, ni réservation, ni contrat signé. Définir avant lancement : date d'expiration, transférabilité éventuelle, remboursement, litiges, annulation et traitement fiscal. Pas de conditions rétroactives défavorables sur les crédits déjà accordés sans base contractuelle valable.

**Exclusivité / vérifications.** La demande ne doit pas être simultanément vendue à plusieurs entrepreneurs; l'orientation dépend de la compatibilité, des disponibilités, de la vérification des qualifications/licences exigées et du choix du propriétaire.

**Conformité et sécurité.** Appliquer les règles québécoises de protection des renseignements personnels et les règles canadiennes anti-pourriel, RLS, permissions côté serveur, historique infalsifiable par les usagers, idempotence, anti-abus, limites de débit et suppression des données inutiles.

**Clause importante :** Ne PAS faire la promesse publique d'un « crédit équivalent » avant de rendre vérifiables et contractuels le calcul, l'émission et l'utilisation. Les conditions ne peuvent pas corriger une offre inexécutable.

## 7. IMPLÉMENTATION MINIMALE SUR LE PROJET EXISTANT
- Conserver le parcours d'activation existant, Clara, profil et Stripe; ne pas mélanger crédits de leads et paiements d'activation.
- Réutiliser composants de pages SEO, Auth, formulaires/analytics, tables, registres et automatisations existants après inspection; nouveau schéma seulement si les registres actuels ne peuvent pas assurer une traçabilité et une rédemption correctes.
- Validation serveur du prix de lead et de la preuve, déduplication foyer/projet, statut pending/granted/redeemed/reversed, RLS par entreprise et administrateur, événements d'audit et journal de consentement.
- Expérience d'invitation propriétaire sans PII dans l'URL; Clara une question à la fois; après accord, recherche de compatibilité et disponibilité réelle.
- États mobile : formulaire incomplet, preuve manquante, demande en attente, rejet motivé, pas de pro correspondant, erreur de versement, crédit utilisé.
- E2E synthétique : 1 lead avec preuve et consentement → valeur exacte créditée, 1 duplicata rejeté, 1 consentement refusé, 1 lead hors zone rejeté, 1 échange conditionné par disponibilité, 1 révocation auditée. Aucune charge live.
- Avant lancement : validation du barème, des conditions et du financement par le fondateur. **Pas de diffusion/publication sans autorisation.**

## 8. MESURE
UTM sms/email/facebook/seo et campagne `rachat-leads-2026`. Entonnoir : clic → entreprise inscrite → lead soumis → consentement propriétaire → lead admissible → crédit émis → crédit utilisé → rendez-vous exclusif terminé → activation payée vérifiée → revenu HT. Comptabiliser comme revenu uniquement les activations Stripe LIVE confirmées et vérifiées, hors remboursements et doublons. Aucun chiffre de ventes confirmé par ce document.

**Dossier de campagne uniquement. Ne constitue ni fonctionnalité vérifiée ni campagne lancée.**
