# Écran OTP « Vérifiez votre téléphone » — clarté mobile et validation manuelle

## Constat (vérifié dans le code actuel)

Un seul composant OTP canonique existe : `src/components/auth/PhoneOtpForm.tsx`. Il est réutilisé par `Login`, `LoginPageUnpro`, `Signup`, `StartPage`, `AuthOverlayPremium` et le flux affilié. Il appelle les edge functions existantes `send-otp` et `verify-otp` (Twilio Verify), puis `supabase.auth.setSession`. Aucune nouvelle route, table, fonction ou logique SMS ne sera créée : tout le travail est fait dans ce composant.

Défauts confirmés dans l'étape « code » actuelle :
- Les 6 cases sont peu contrastées (bordure `hsl(228 18% 18%)` sur fond sombre) et rien ne distingue visuellement la première case active.
- Il y a **trois** chemins de soumission automatique : `handleCodeChange` (150 ms après le 6e chiffre), `handleCodePaste` (collage) et l'autofill SMS dans la cellule 0. Cela contredit l'exigence de validation manuelle.
- Aucune action « Coller le code » : l'utilisateur qui revient de son app Messages n'a aucun point d'entrée évident.
- Le CTA « Vérifier le code » est en poids `font-medium`, visuellement au même niveau que le reste, et l'état désactivé n'est pas explicite.
- Les cases font `w-11` + `gap-2` : sur un très petit viewport (320 px) avec le padding de carte, la rangée est à la limite du débordement.

## Ce qui sera fait

### 1. Cases OTP lisibles
- Bordure visible à l'état vide, bordure + léger glow bleu UNPRO sur la case focalisée, état rempli nettement distinct (fond plus clair, chiffre en gras).
- Autofocus immédiat sur la case 1 à l'arrivée sur l'étape code, avec curseur visible.
- Avance automatique à la saisie, retour arrière sur Backspace (inchangé), plus flèches gauche/droite.
- Largeur fluide (`flex-1` avec largeur min/max) pour tenir de 320 px à desktop sans débordement horizontal.
- `inputMode="numeric"`, `autocomplete="one-time-code"` sur la première case, `pattern` numérique.

### 2. Action « Coller le code reçu par texto »
- Bouton secondaire premium pleine largeur directement sous les cases : icône presse-papiers, texte lisible, bordure et texte bleu UNPRO, hauteur tactile 48 px.
- Au clic : lecture du presse-papiers si l'API est disponible, extraction des chiffres, détection d'une séquence de 6 chiffres (ex. « Votre code UNPRO est 483921 » → `483921`), remplissage des 6 cases.
- Si l'API est refusée ou absente : message doux (« Collez le code directement dans les cases »), focus rendu à la première case, aucune erreur technique.
- Le collage natif dans les cases reste supporté.
- Ce bouton est visuellement supérieur à « Changer de numéro », « Renvoyer le code » et « Retour », qui deviennent des liens discrets.

### 3. Suppression totale de la validation automatique
- Retrait des trois `setTimeout(handleVerifyOtp)` (saisie, collage, autofill SMS).
- Remplir les 6 chiffres ne fait qu'activer le CTA. L'autofill natif iOS/Android remplit aussi sans soumettre.

### 4. CTA principal
- Désactivé et visiblement atténué tant que les 6 chiffres ne sont pas là ; actif en bleu UNPRO plein contraste ensuite, hauteur 52 px, pleine largeur.
- Au clic : verrou anti-double-clic, spinner, puis traitement succès/erreur avec le flux existant (`verify-otp` → `setSession` → `onSuccess`).

### 5. Hiérarchie de l'écran
Titre « Vérifiez votre téléphone » → numéro → consigne → cases → bouton Coller → CTA Vérifier → liens secondaires → mention « Connexion sécurisée ».

### 6. Erreurs
- Code invalide : bandeau d'erreur humain inline (au lieu du seul toast), cases conservées mais sélectionnables pour correction immédiate, focus sur la première case.
- Code expiré : message dédié avec action « Renvoyer un nouveau code » directement dans le bandeau.
- Erreur presse-papiers : jamais bloquante.

### 7. Journalisation
Les événements existants (`sms_sent`, `sms_success`, `authDebug`) sont conservés ; ajout uniquement de `otp_verify_attempt` et `otp_resend`. Ni le code OTP ni le contenu du presse-papiers ne sont jamais journalisés.

### 8. Mobile
Ajustement des espacements pour petits viewports, aucune déformation de carte avec clavier ouvert, pas de débordement horizontal, pas de saut de layout.

## Détails techniques

- Fichier modifié : `src/components/auth/PhoneOtpForm.tsx` (uniquement). Aucun changement backend, aucune migration, aucun déploiement de fonction.
- `handleCodeChange`, `handleCodePaste` et le handler d'autofill sont refactorisés en un seul utilitaire `applyCode(digits: string)` qui remplit l'état sans jamais soumettre.
- Nouvel état local `inlineError: { message, kind: "invalid" | "expired" | null }` pour les erreurs affichées dans la carte.
- Presse-papiers : `navigator.clipboard.readText()` protégé par try/catch et vérification de `isSecureContext`.
- Couleurs prises des tokens existants (`primary`, `destructive`, palette dark de la carte auth) — pas de nouvelles valeurs codées en dur hors du style local déjà utilisé par ce composant.

## Vérification

1. Typecheck + build.
2. QA Playwright sur viewport 384 px : étape téléphone → étape code simulée, vérifier autofocus, contraste, remplissage par collage, CTA désactivé→actif, et surtout qu'aucune requête `verify-otp` ne part avant le clic.
3. Test réel bout en bout avec un vrai numéro : réception SMS, collage, vérification manuelle, mauvais code, renvoi, changement de numéro.
