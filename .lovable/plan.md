# SMS outreach + aperçu de lien « La fin des 3 soumissions »

## Constat actuel (vérifié en production)

- `https://unpro.ca/` sert encore l'ancien Open Graph : `og:title` = « UNPRO — L'intelligence artificielle pour votre maison », `og:image` = `/og/unpro-og-v4.jpg`. Le nouveau contenu OG existe dans le code mais **n'est pas publié**.
- `https://unpro.ca/og/unpro-og-v5.jpg` retourne **404** (image présente localement seulement). L'image v5 utilise le vrai logo UNPRO, 1200×630, message « LA FIN DES 3 SOUMISSIONS. » + sous-titre — lisible en petite preview.
- `/unpro/activate/:token` retourne le même `index.html` (donc les mêmes balises OG que la home) — un aperçu s'affichera avec l'identité UNPRO sans page dédiée.
- Les SMS partent déjà avec un vrai lien HTTPS sur le domaine UNPRO, aucun shortener :
  - `send-verified-batch` (first touch) : lien `https://unpro.ca/unpro/activate/<token>` collé en fin de phrase.
  - `second-touch-outreach` (second touch + click recovery) : lien en milieu de phrase, suivi de la ligne STOP.
- Les garde-fous existent déjà et ne seront pas touchés : duplicate guard 24 h (`acq_sms_logs`), `sms_opt_outs`, `relance_kind` unique par prospect, `dry_run: true` par défaut, StatusCallback Twilio, journaux `acq_sms_logs` + pipeline events.

## Ce qui sera fait

### 1. Publier les métadonnées OG (bloquant, priorité 1)
Publier la version actuelle pour que `index.html` (v5) et le fichier `og/unpro-og-v5.jpg` soient réellement servis, puis vérifier en production : HTTP 200, `Content-Type: image/jpeg`, aucune auth, aucun redirect. Renommer l'image en `og-unpro-fin-3-soumissions-v2.jpg` (nom demandé) pour casser tout cache d'aperçu, et pointer `og:image` / `twitter:image` en URL absolue HTTPS vers ce nouveau nom.

Le titre OG sera exactement « UNPRO — La fin des 3 soumissions » et la description « L'IA trouve le bon entrepreneur pour vos travaux. » (aujourd'hui la description est plus longue).

### 2. Mise en forme des liens SMS (sans nouveau système)
Modification uniquement des fonctions de composition de message existantes (`send-verified-batch`, `second-touch-outreach`) :

- Le lien est placé **seul sur sa propre ligne**, séparé du texte, pour maximiser la détection d'aperçu par Android/iOS.
- Aucun shortener, aucun redirecteur : uniquement le domaine `unpro.ca`.
- Ajout d'UTM sur le domaine UNPRO sans casser l'OG : `?utm_source=sms&utm_medium=outreach&utm_campaign=contractor_activation` (+ `ref=` quand une attribution affilié/agent existe déjà sur le prospect).
- Le lien reste le **lien d'activation personnalisé** `https://unpro.ca/unpro/activate/<token>` : il porte le profil pré-construit, la conversion 1 $ et l'attribution. Un repli sur `https://unpro.ca` (avec UTM) est utilisé seulement quand aucun token n'existe.
- La ligne STOP est conservée telle quelle.

Textes proposés (FR, courts, non-spam) :

```text
First touch
Bonjour, savez-vous comment l'IA comprend actuellement {company_name}?
UNPRO a préparé son profil. Vous pouvez le voir et l'activer pour 1 $.

https://unpro.ca/unpro/activate/<token>?utm_source=sms&utm_medium=outreach&utm_campaign=contractor_activation
Répondez STOP pour ne plus recevoir de messages.

Second touch
Je vous renvoie simplement le lien pour voir comment votre entreprise peut
être comprise et recommandée par l'IA. Aucun engagement, activation 1 $.

https://unpro.ca/unpro/activate/<token>?utm_source=sms&utm_medium=outreach&utm_campaign=second_touch
Répondez STOP pour ne plus recevoir de messages.
```

### 3. Attribution et tracking préservés
`utm_*` et `ref` sont lus côté client par le tracking existant ; le token reste la clé d'attribution serveur. Aucun changement aux tables, aux vues Conversion Lab, ni aux événements de funnel. La home renvoie toujours les mêmes métadonnées OG quels que soient les paramètres.

### 4. Règle « aperçu non garanti »
L'absence d'aperçu OG ne doit jamais marquer un SMS comme `failed` : le statut reste celui rapporté par Twilio. Vérification que rien dans le pipeline n'infère un échec depuis l'aperçu (aucun code de ce type détecté aujourd'hui ; ce sera confirmé).

### 5. Vérification et test réel
1. Vérification serveur : `curl` sur `https://unpro.ca/` (HTML brut, avant JS) pour confirmer `og:type`, `og:url`, `og:title`, `og:description`, `og:image` absolu, `twitter:card`, `twitter:*` ; et sur l'image (200 + type + pas de redirect).
2. Vérification que l'ancienne image v4 n'est plus référencée nulle part dans le code servi.
3. Dry-run des deux fonctions d'envoi pour valider le rendu exact des messages, sans envoi.
4. Un SMS test réel vers un numéro que vous fournissez (Android/Google Messages, iPhone si disponible) : lien cliquable, destination correcte, UTM conservés, aperçu affiché avec la nouvelle image et le nouveau titre.

## Détails techniques

- Fichiers touchés : `index.html` (og/twitter), `public/og/og-unpro-fin-3-soumissions-v2.jpg` (renommage de v5), `src/seo/ogImage.ts`, `supabase/functions/send-verified-batch/index.ts` (constante `SMS_TEMPLATE`), `supabase/functions/second-touch-outreach/index.ts` (`buildMessage` + `BASE`), plus un petit helper partagé de construction d'URL (UTM/ref) dans `supabase/functions/_shared/`.
- Aucune nouvelle table, route, cron, campagne ou fonction d'envoi.
- Déploiement des deux edge functions modifiées, puis publication du frontend.

## Critères de complétion

1. `https://unpro.ca/` sert en HTML brut le titre « UNPRO — La fin des 3 soumissions » et l'image OG absolue en 200.
2. L'image OG utilise le vrai logo UNPRO et est lisible en petite preview.
3. Les SMS first/second touch contiennent un lien HTTPS UNPRO isolé sur sa ligne, sans shortener.
4. CASL, opt-out, duplicate guard 24 h, `relance_kind`, audit logs et attribution intacts.
5. Un SMS test réel a été envoyé, le clic mène à la bonne page avec UTM/ref conservés.
6. Aucune régression dans le pipeline d'outreach (dry-runs + logs vérifiés).
