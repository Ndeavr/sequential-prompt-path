# UNPRO — rapprochement commercial, 2–3 novembre 2026 (version publique sans données de contact)

**Objet :** conserver les enseignements opérationnels sans publier des coordonnées de prospects, identifiants de messages, compte personnel ou dossiers individuels de refus. **Ce fichier est un résumé non nominatif, et non le registre STOP, CRM, preuve LCAP/CASL ou système d'idempotence.**

## Éléments vérifiés à la date de l'audit initial

- **Huit courriels de prospection professionnels classés SENT le 2 novembre 2026**, distincts des brouillons. Le statut SENT prouve uniquement l'envoi depuis Gmail, jamais la livraison, le consentement, l'intérêt, une inscription ou une vente.
- **Cinq destinataires de ce lot** figuraient auparavant dans une liste de dix brouillons. Ne jamais relancer depuis l'ancienne liste sans rapprocher en privé les identités, l'historique multicanal et les preuves LCAP.
- **Six autres courriels à trois correspondants**, portant sur une demande de travaux et sa précision, n'appartiennent pas au lot de huit. Une opposition explicite a été identifiée : **STOP/exclusion absolue**, y compris pour l'offre de profil IA. Ne pas publier l'identité du correspondant dans le dépôt public. Le CRM privé doit conserver et faire respecter l'exclusion.
- Le contrôle Gmail du 3 novembre n'établissait aucun nouveau message de prospection UNPRO vers le lot surveillé ni aucune réponse positive identifiable. Ce constat est ponctuel et ne décrit pas l'état courant.
- Le compte Stripe LIVE inspecté à cette date n'exposait aucune charge réussie à **350 $ CA HT**; les charges réussies observées étaient des anciens paiements à **1 $**, exclus du KPI. **Cela ne prouve pas un total global de zéro entreprises activées**, faute de réconciliation entre Stripe, webhooks signés, entreprises uniques et droits effectifs.
- Le backend Supabase canonique était inaccessible au contrôle en lecture seule : aucune validation du registre central STOP, des entitlements ou des webhooks n'a été possible.

## Garde-fous impératifs

1. Les identités, coordonnées, Gmail message IDs, preuves de consentement, refus et déduplications doivent rester dans des systèmes privés à accès contrôlé, **jamais dans les fichiers d'un dépôt GitHub public**. Une ancienne version de ce document a pu être publiée dans l'historique Git : le présent caviardage **ne purge pas cet historique**.
2. Aucune prospection, réexpédition, relance ou consentement présumé sur la base de ce résumé. Vérifier manuellement la base légale LCAP/CASL, les oppositions STOP, le type de contact, les doublons et la fenêtre horaire avant toute action autorisée.
3. Séparer « envoyé », « livré », « répondu », « inscrit », « Checkout créé », « paiement Stripe LIVE réglé », « webhook signé et rapproché » et « droit de 12 mois actif ». Aucun de ces stades ne remplace le suivant.
4. Priorité commerciale : activation de base 350 $ + taxes applicables pour un profil UNPRO présent 12 mois, sans garantie de rendez-vous ni recommandation par des IA externes; objectif final 3 000 entreprises uniques payantes avant le 31 décembre 2026.
5. Les futures analyses quantitatives par canal doivent utiliser uniquement des agrégats minimisés, et le registre d'exclusion central doit rester l'autorité opérationnelle.

**Statut :** documentation seulement; aucune campagne, paiement, déploiement ou changement de production autorisé par ce fichier.
