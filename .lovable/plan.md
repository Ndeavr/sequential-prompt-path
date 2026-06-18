# Note du fondateur + Consentement philosophie UNPRO

## Emplacement
La homepage active = `src/pages/PageHomeSimple.tsx` → `HeroOrbMockup`. Il n'existe pas encore de section "Comment ça fonctionne" séparée ; tout ce qui suit le bloc orb+greeting (tagline, quick actions, feature strip) jouera le rôle de "sections suivantes" à bloquer tant que l'utilisateur n'a pas choisi.

Insertion : juste après le bloc Orb/Greeting et **avant** `tagline + quickActions + feature strip` dans `HeroOrbMockup.tsx`.

## Nouveau composant
`src/components/home-orb/FounderNoteConsent.tsx`

Contenu visuel :
- Fond transparent, aucun cadre / carte / bordure.
- Largeur desktop 900px, mobile 90%, centré, rotation `-0.6deg`.
- Police manuscrite élégante via Google Fonts `Caveat` (chargée dans `index.html`) — fallback `cursive`.
- Texte (exact) :
  > Nous n'avons qu'une seule vie à vivre.
  > Nous croyons que les propriétaires méritent de meilleurs conseils.
  > Nous croyons que les bons entrepreneurs méritent d'être reconnus.
  > C'est pourquoi nous avons créé UNPRO.
- Signature « — L'équipe UNPRO » à 70% opacité, taille réduite.
- Tailles : desktop 32–40px, mobile 20–24px, signature ~70% de cette taille.
- Animation d'apparition "écriture" : reveal ligne par ligne via `framer-motion` (mask-clip ou opacity+y), durée totale ~2s, déclenchée une seule fois par visite (sentinel `sessionStorage["unpro_founder_note_played"]`). `prefers-reduced-motion` → apparition simple.

Bloc de choix sous la note (visible uniquement si non encore accepté) :
- Deux gros boutons radio tactiles (min 56px) côte à côte sur desktop, empilés sur mobile :
  - « Je suis d'accord avec cette philosophie »
  - « Je n'adhère pas à cette philosophie »
- Ton doux, sans alerte. Si l'utilisateur tente de scroller/cliquer plus bas sans choisir, afficher sous les boutons un message subtil : « Veuillez choisir une option pour continuer. »

Comportement :
- Accepter → `localStorage.setItem("unpro_philosophy_accepted", "true")` + déclenche un `window.dispatchEvent(new Event("unpro:philosophy-accepted"))` + masque le bloc de choix avec fondu, garde la note visible. Les sections suivantes apparaissent (fondu doux). Plus jamais redemandé tant que le flag est en localStorage.
- Refuser → `window.location.replace("https://www.google.com")`.

Universel : aucune mention de leads/marketing/SEO/pub/algorithmes. Même affichage pour homeowner et contractor (pas de branche sur `activeRole`).

## Gating dans HeroOrbMockup
- Nouvel état `accepted` lu depuis `localStorage` au mount + écoute de l'event `unpro:philosophy-accepted`.
- `<FounderNoteConsent />` inséré après le bloc Orb.
- Les blocs suivants (`tagline`, `quickActions`, `feature strip`) wrappés dans un conteneur :
  - Si `!accepted` : `aria-hidden`, `pointer-events-none`, `opacity-0`, `max-h-0 overflow-hidden`, `inert`.
  - Si `accepted` : fade-in 400ms.
- Bloque uniquement la portion homepage ; ne bloque pas la navigation header/routes (par contrainte UX raisonnable, sinon l'utilisateur ne peut plus aller nulle part).

## Fichiers
- Créer : `src/components/home-orb/FounderNoteConsent.tsx`
- Modifier : `src/components/home-orb/HeroOrbMockup.tsx` (insertion + gating)
- Modifier : `index.html` (preconnect + lien Google Fonts `Caveat` 500/700)

## Hors scope
- Pas de backend, pas de tracking Supabase de la décision (localStorage uniquement, conformément à la spec).
- Pas de modification des autres pages ni du header global.
- Pas de popup / modal.

## Critères de succès
- Visiteur ne peut pas scroller/cliquer les CTA d'en bas du hero sans avoir choisi.
- « Je suis d'accord » → débloque immédiatement + persistant entre visites.
- « Je n'adhère pas » → redirection `google.com`.
- Animation d'écriture jouée une seule fois par session.
- Mobile-first, cibles tactiles ≥ 56px, aucun ton agressif.
