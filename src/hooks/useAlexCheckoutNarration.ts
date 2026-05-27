/**
 * useAlexCheckoutNarration — Returns the current Alex narration message for the
 * active funnel stage. Rotates messages every ~5s (no strict loop).
 * Text-only by default. Voice stays event-driven (user must tap orb).
 */
import { useEffect, useMemo, useState } from "react";
import { useAlexCheckoutState, type AlexFunnelStage } from "@/stores/alexCheckoutState";

type MessageMap = Record<AlexFunnelStage, string[]>;

const MESSAGES: MessageMap = {
  idle: ["Je suis ici si vous avez besoin."],
  importing: [
    "Je détecte votre entreprise…",
    "Je valide votre identité légale…",
    "Je localise votre territoire principal…",
  ],
  analyzing: [
    "J'analyse votre présence en ligne…",
    "Je compare votre visibilité locale…",
    "J'examine vos preuves sociales…",
    "Je vérifie votre visibilité IA.",
  ],
  scoring: [
    "Je compile votre score de performance…",
    "J'identifie vos opportunités d'amélioration…",
    "Votre profil a du potentiel dans votre région.",
  ],
  recommending: [
    "Je recommande un volume que votre équipe peut absorber.",
    "Le plan Croissance stable semble le mieux adapté à votre profil.",
    "Vous pourrez ajuster votre capacité plus tard.",
  ],
  hesitating: [
    "Vous pouvez commencer avec l'essai à 1 $.",
    "Aucun engagement long terme requis.",
    "Le plan recommandé peut être ajusté plus tard.",
  ],
  trial_offer: [
    "Essayez UNPRO 7 jours pour 1 $.",
    "Activation immédiate, annulable en tout temps.",
  ],
  checkout: [
    "Votre profil sera activé immédiatement.",
    "Je vais optimiser votre visibilité IA automatiquement.",
    "Vous pourrez connecter votre agenda après activation.",
  ],
  payment_processing: [
    "Paiement en cours…",
    "Je prépare votre activation.",
  ],
  activation_success: [
    "Activation en cours…",
    "UNPRO commence déjà à travailler pour vous.",
    "Je prépare vos premières opportunités.",
  ],
};

export function useAlexCheckoutNarration(): { message: string; stage: AlexFunnelStage } {
  const stage = useAlexCheckoutState((s) => s.stage);
  const pool = useMemo(() => MESSAGES[stage] ?? MESSAGES.idle, [stage]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    if (pool.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % pool.length);
    }, 5200);
    return () => clearInterval(id);
  }, [pool]);

  return { message: pool[idx] ?? pool[0] ?? "", stage };
}
