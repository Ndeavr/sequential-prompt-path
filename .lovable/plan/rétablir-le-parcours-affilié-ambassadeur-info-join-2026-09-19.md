# Rétablir le parcours affilié (Ambassadeur → info → join)

## Diagnostic vérifié (lecture du code)

1. **Rôle « Ambassadeur » perdu** — `src/services/auth/roleIntent.ts` : `ROLE_MAP` envoie `ambassador` → `homeowner`. Un visiteur qui choisit Ambassadeur sur `/role` devient propriétaire et n'atteint jamais le programme affilié.
2. **`applyRoleIntent` sans branche affilié** — tout rôle autre que contractor/homeowner retourne `role_requires_server_approval`; l'intention n'est jamais appliquée ni effacée.
3. **Destination affiliée inexistante** — `destinationForRole("affiliate")` renvoie `/affilies/dashboard`, route qui n'existe pas dans `src/app/router.tsx` (le vrai espace est `/affiliate`, protégé ; l'entrée publique est `/affilies` → `/affilies/onboarding`).
4. **Sélecteur de rôle (menu profil + tiroir mobile)** — `ProfileMenu.tsx` envoie tout rôle non admin/contractor vers `/dashboard` (propriétaire). Partenaire et affilié aboutissent au mauvais tableau de bord.
5. Ce qui existe déjà et fonctionne : page d'information `/affilies` (PageAffiliesPublic, CTA « JE COMMENCE! »), onboarding 4 étapes `/affilies/onboarding` (activation via `affiliate-onboarding-activate`, brouillon local, OTP inline), alias `/affilie` et `/affilies/activer`, espace `/affiliate`. Aucune reconstruction : on reconnecte seulement.

## Corrections (front uniquement, aucune migration, aucune donnée)

### 1. `roleIntent.ts`
- `ROLE_MAP.ambassador` → `affiliate` (et `partenaire` reste `partner` : corriger `partner: "homeowner"` → `partner`).
- `applyRoleIntent` : branche `affiliate` — ne crée rien côté client; conserve l'attribution (`unpro_ref`), efface l'intention et renvoie la destination `/affilies/onboarding` (l'activation réelle reste faite par la fonction existante `affiliate-onboarding-activate` à la fin de l'onboarding). Branche `partner` → destination `/partenaire/devenir-partenaire` si pas encore partenaire (pas d'écriture rôle privilégié depuis le navigateur — règle existante préservée).
- `destinationForRole("affiliate")` → `/affilies/onboarding` si non activé, `/affiliate` si déjà affilié (décision côté appelant via contexte auth; à défaut `/affilies/onboarding`, qui redirige déjà les affiliés actifs).

### 2. `PreLoginRolePage.tsx` (/role)
- « Ambassadeur » : après `saveRoleIntent("ambassador")`, destination post-login `/affilies/onboarding` (l'attribution `ref`/`aff` déjà capturée est préservée par `saveRoleIntent`).

### 3. Sélecteur de rôle
- `ProfileMenu.tsx` et `MobileDrawer.tsx` : table de destination par rôle — admin → `/admin`, contractor → `/pro`, partner → `/partenaire/dashboard`, affiliate → `/affiliate`, homeowner → `/dashboard`. Ajouter le libellé « Affilié » s'il manque dans `roleLabels`.

### 4. Tests de régression
- `ambassador` → rôle canonique `affiliate`, jamais `homeowner`.
- `destinationForRole("affiliate")` ne renvoie plus une route inexistante.
- Le sélecteur de rôle envoie affilié → `/affiliate` et partenaire → `/partenaire/dashboard`.
- Attribution affiliée conservée à travers choix de rôle → login → onboarding.

## Vérification
- Tests ciblés + suite complète, typecheck, build.
- Playwright mobile (390 px) : `/role` → Ambassadeur → arrivée sur `/affilies/onboarding`; `/affilies` → « JE COMMENCE! » → onboarding; menu profil → « Passer à : Partenaire/Affilié » → bonne destination.

## Hors périmètre
Aucune migration SQL, aucune modification des fonctions edge, aucun envoi de SMS/courriel, aucune publication. La visibilité de l'entrée « Ambassadeur » sur la page d'accueil n'est pas modifiée.
