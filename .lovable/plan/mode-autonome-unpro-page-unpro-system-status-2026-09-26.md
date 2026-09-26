# Mode autonome UNPRO + page « UNPRO System Status »

## Règle de fonctionnement (enregistrée en mémoire à l'approbation)
Je ne pose une question que dans ces cas : clé ou secret manquant, envoi réel de SMS ou de courriel à des clients, vrai paiement Stripe encaissé, décision légale ou comptable, ou choix qui peut casser le parcours revenu. Pour tout le reste : j'inspecte, je choisis, je documente l'hypothèse, j'implante, je teste et je corrige.
Les 45 réglages d'accès restent hors priorité, sauf s'ils bloquent le paiement, l'inscription, l'activation, les rendez-vous, l'admin ou l'envoi contrôlé.

## Livrable 1 : page interne « UNPRO System Status »
Emplacement : `/admin/system-status`, réservé aux admins, ajouté au menu admin existant. On réutilise les vérifications qui existent déjà (santé du pipeline d'acquisition, mode système, journal des résultats). Aucune nouvelle architecture.

11 lignes, chacune avec un état **OK / Problème / Non testé**, fondé uniquement sur une preuve réelle en base :

| Ligne | Preuve utilisée |
|---|---|
| Stripe | clé présente + dernier événement webhook reçu et traité |
| Twilio | identifiants présents + dernier rapport de livraison réel |
| Resend / courriel | envoi du projet activé ou non + dernier envoi réussi, sinon motif de l'échec |
| Paiement test | dernière session test payée avec abonnement actif |
| Activation entrepreneur | profil passé automatiquement en ligne après ce paiement (journal de publication) |
| SMS test interne | dernier SMS interne réellement livré |
| Courriel test interne | dernier courriel interne réellement livré |
| Rendez-vous créé | rendez-vous réel (hors archives de test) créé par le parcours |
| Rendez-vous visible admin | présent dans le tableau du pipeline admin |
| Clara propriétaire | dernier tour de qualification réussi avec dossier créé |
| Clara entrepreneur | dernière qualification entrepreneur menée jusqu'à l'audit |

Pour chaque problème, la carte affiche : cause probable, élément concerné, correction faite, test effectué et prochain blocage. Ces notes sont stockées et mises à jour à chaque passage de vérification. Un bouton « Revérifier » relance les contrôles. **« Non testé » s'affiche par défaut : aucun faux succès.**

## Livrable 2 : passage sur le chemin critique (dans l'ordre)
1. Paiement Stripe test : déjà validé (PASS). Revalidé par une lecture en base.
2. Activation : publication automatique déjà validée. Revalidée de la même façon.
3. Envoi contrôlé : courriels du projet désactivés, donc « Problème — envoi désactivé », prochaine étape = votre feu vert. SMS : la dernière livraison réelle interne est reprise des journaux, sans nouvel envoi.
4. Rendez-vous : mécanique des 3 boutons validée, mais aucun vrai rendez-vous propriétaire, donc « Non testé ». Je teste la création du dossier propriétaire avec une vraie session connectée de test, marquée QA et exclue des chiffres.
5. Tableaux admin : je vérifie que ces rendez-vous apparaissent au bon endroit et que les archives de test restent exclues.
6. Clara : j'exécute un tour réel pour le propriétaire et un pour l'entrepreneur, puis je consigne le résultat.

Toute correction nécessaire est faite dans ce même passage, sans vous consulter, sauf dans les 5 cas d'exception.

## Détails techniques
- Nouvelle table `system_status_checks` avec : check_key, status (ok, problem, untested), evidence jsonb, probable_cause, component, fix_applied, test_performed, next_blocker, checked_at. RLS : admin en lecture et service_role en écriture, avec les GRANT correspondants.
- Nouvelle fonction `system-status-check`, réservée aux admins : elle lit Stripe (`stripe_webhook_events` et abonnements), `sms_events_v2`, `email_send_log`, `contractor_publication_audit`, `appointments` (en excluant `archived_test` et `qa_test`) ainsi que les journaux Clara, puis écrit les résultats. Elle n'envoie jamais rien.
- La page réutilise `OperationHealthCard` et les jetons de design de l'admin sombre.
- Contraintes maintenues : aucun SMS ou courriel externe, aucun paiement réel, aucun ancien devis anonyme touché, aucune donnée fictive comptée comme succès.
