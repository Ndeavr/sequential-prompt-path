# Issue #45 — transport cron découverte : opération NON EXÉCUTÉE

## Résultat et périmètre

Code actif d’authentification et de découverte inchangé. Aucun accès hébergé,
secret récupéré, SQL exécuté, job modifié, envoi ou déploiement dans cette intervention.
Le travail trois univers est conservé. La PR #39 n’est pas touchée.

Les observations du propriétaire (job 282 actif, 401, absence de Bearer,
verrous fermés et file historique) constituent le point de départ, **pas une
nouvelle vérification de production par cette intervention**.

## Inspection locale vérifiée

- `supabase/functions/_shared/requireAdminCaller.ts` exige un Bearer exact
  service ou un utilisateur authentifié avec rôle admin contrôlé côté serveur.
  `apikey` seul et `caller=cron` ne constituent aucune identité.
- Le handler appelle cette garde avant lecture du corps puis applique
  DISCOVERY_ENABLED et les deux verrous recrutement avant découverte/import.
- La migration historique `20260910095146_24eaf08c-b18a-4581-9205-3bb8b6b8d410.sql`
  reprend des headers d’un autre job, sans lookup Vault dédié. Sa référence
  `cron.job.headers` doit être vérifiée contre le schéma hébergé : ne pas rejouer
  cette migration ancienne et ne pas supposer qu’elle décrit le job actuel.
- La migration `20260323233830_email_infra.sql` documente un précédent Vault
  pour l’infrastructure email. Elle indique explicitement que les étapes
  secrètes/cron sont réalisées hors migration. **Ce précédent n’établit pas
  qu’un secret utilisable existe actuellement pour ce job.** Ne pas emprunter
  le secret email ni changer ses droits.
- Aucun bloc spécifique acquisition-discovery-cycle trouvé dans config.toml;
  le comportement hébergé du vérificateur plateforme reste non revalidé.
- La garde existante peut écrire un journal d’accès même sur refus. « Zéro
  effet » signifie ici zéro découverte, import, enqueue métier ou fournisseur,
  et non absence absolue de journal d’accès. Tous ces journaux sont mockés en QA.

## STOP : prérequis avant toute opération de production

Approbation propriétaire **distincte** obligatoire. Un opérateur autorisé doit
revalider destination/environnement, job 282 et nom exact, schedule et état,
schéma pg_cron/pg_net, configuration hébergée de l’endpoint et verrous fermés.
Préserver une sauvegarde privée restaurable de la commande et de l’état initiaux;
ne jamais afficher cette commande brute si elle contient un secret.

Vérifier uniquement les métadonnées du mécanisme de secrets approuvé : existence,
unicité et droits du secret serveur correspondant à l’identité réellement acceptée
par la garde. Ne pas exporter ni journaliser sa valeur, ni la placer dans Git.
Si Vault/droits/secret ne sont pas démontrés, **STOP** : aucune commande exécutable
ni valeur substitutive proposée ici. Provisionnement éventuel par le mécanisme
sécurisé existant uniquement, après approbation séparée; aucune permission élargie.

## Changement exact à approuver (spécification, pas SQL à exécuter)

1. Modifier seulement la `command` du job 282 existant via `cron.alter_job`;
   conserver nom, schedule `7 */6 * * *`, état initial et identifiant.
   Ne pas unschedule/schedule, ne pas ajouter de fonction SQL ou second job.
2. Garder la destination exacte existante après validation de l’environnement.
   Construire les headers à l’exécution : Content-Type JSON et Authorization
   Bearer depuis le lookup du secret approuvé. Garder l’apikey existant si la
   plateforme le requiert; il ne remplace pas Authorization.
3. Le lookup doit fournir exactement une valeur non vide sans l’exposer.
   Absence, doublon ou erreur => aucune requête HTTP; pas de fallback anonyme.
   Ne pas copier les headers d’un autre job.
4. Corps : conserver les limites existantes (`max_searches=3`), transmettre
   `trigger_source=cron` et le moment programmé. Cet indice n’est accepté comme
   provenance que **après** authentification service par la garde existante.
5. Ne modifier aucun drapeau, score, consentement, file, permission ou handler.
   Avec les verrous fermés, une authentification corrigée doit encore bloquer
   la découverte. Le transport ne constitue aucune autorisation commerciale.

Ce document reste volontairement non exécutable : la source sécurisée hébergée
n’est pas vérifiée. Un patch opérationnel final exige ces prérequis et l’accord
du propriétaire; il reste hors des migrations auto-appliquées.

## Diagnostic sans seconde planification ni poller

`scripts/audit/discovery-cron-response.mjs` est une fonction pure hors ligne.
Elle ne consulte rien, ne lance pas de HTTP, ne planifie et ne relance rien.
Elle classe uniquement un instantané déjà obtenu de façon autorisée.

Le `request_id` retourné par `net.http_post` prouve seulement la mise en file
HTTP. Le statut SQL `job_run_details=succeeded` ne prouve pas la réponse HTTP.
Corréler le request_id exact à l’id de la réponse pg_net existante, puis lire
statut/timeout et résultat applicatif minimaux et assainis (pas headers/secrets).
Sans identifiant conservé dans les traces existantes, ou après rétention expirée,
le rapprochement reste **non vérifié** : ne pas deviner à partir de l’heure.

401/403/5xx sont des échecs même si le SQL a réussi. 2xx avec blocked ou
recruitment_locked reste bloqué. 2xx sans corps vérifiable reste non vérifié.
Même `http_acknowledged` n’établit ni découverte, ni import, ni envoi.
Ne pas transformer ce diagnostic en poller actif.

## Retour arrière à approuver

Restaurer uniquement la commande privée sauvegardée et l’état initial du même
job via `cron.alter_job`, sans nouvelle planification. Garder les gates fermées.
Ne supprimer aucun secret partagé et ne modifier aucune autorisation.
Au premier écart d’identité ou erreur SQL : arrêter, ne pas rejouer et ne pas
affaiblir la garde. Aucun rollback n’a été exécuté ici.

## QA locale et limites

- 33/33 tests, zéro échec : 13 gardes existantes + 6 tests du véritable handler
  avec véritable garde et IO synthétiques + 14 classifications HTTP hors ligne.
- Auth anonyme/apikey seul simulé rejeté; non-admin rejeté; verrous global OFF,
  enqueue OFF ou lecture échouée : zéro appel externe, zéro import/enqueue métier.
- Node syntax check et git diff check réussis. Premier essai Deno avec
  `--cached-only` refusé par la version installée (option inexistante).
- Compilation automatique : build OK. Contrôle TypeScript global séparé non
  exécuté. `deno check --no-remote --no-lock` du helper recruitmentLocks réussi;
  le contrôle du handler entier est bloqué par son import distant esm.sh, interdit
  par `--no-remote`. Aucun accès réseau effectué pour contourner cette limite.
- Aucune validation hébergée, aucun test du socket/secret ou SQL opérationnel,
  aucune mise en production. La fonctionnalité reste fail-closed.