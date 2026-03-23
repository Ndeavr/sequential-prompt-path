

# Fix: Emails du popup contact vers dde@unpro.ca

## Problème
Le popup "Comment pouvons-nous vous aider?" utilise `mailto:` pour envoyer les commentaires. Ça ouvre le client email de l'utilisateur au lieu d'envoyer directement — sur mobile ça ne fonctionne pratiquement jamais.

## Solution
Créer une edge function `send-contact-email` qui reçoit le commentaire et l'envoie à `dde@unpro.ca` via l'infrastructure email Lovable.

## Prérequis
Aucun domaine email n'est configuré. Il faut d'abord en configurer un via Cloud → Emails, puis mettre en place l'infrastructure email transactionnelle.

## Étapes

### Step 1 — Configurer le domaine email
Ouvrir le dialogue de configuration email pour que l'utilisateur configure son domaine d'envoi (ex: `unpro.ca`).

### Step 2 — Mettre en place l'infrastructure email
Appeler `setup_email_infra` puis `scaffold_transactional_email` pour créer les edge functions et tables nécessaires.

### Step 3 — Créer le template "contact-comment"
Template React Email simple : "Nouveau commentaire depuis unpro.ca" avec le contenu du message. Destinataire fixe : `dde@unpro.ca`.

### Step 4 — Mettre à jour HelpPopup.tsx
Remplacer le `window.open(mailto)` par un appel `supabase.functions.invoke('send-transactional-email', ...)` avec le template `contact-comment` et `recipientEmail: "dde@unpro.ca"`.

### Step 5 — Sauvegarder aussi en base (optionnel mais recommandé)
Créer une table `contact_messages` pour garder un historique des messages reçus (comment, date, statut).

## Résultat
Les commentaires du popup sont envoyés directement par email à `dde@unpro.ca` sans dépendre du client email de l'utilisateur.

