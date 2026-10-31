/** Deterministic localization of Clara's in-chat scripted messages, not user content. */
export const CLARA_SCRIPT_EN: Record<string,string> = {
  "Bien sûr. Décrivez-moi votre projet pour votre propriété en quelques mots.": "Of course. Tell me about your property project in a few words.",
  "Je vois — vous aimeriez obtenir de meilleurs contrats sans perdre de temps en soumissions inutiles.": "I see. You want better projects without wasting time on inquiries that aren't a good fit.",
  "Parfait. J’ai ce qu’il me faut pour commencer. Je vais vérifier ce qu’UNPRO comprend déjà de votre entreprise.": "Great. I have enough to get started. I'll look at what UNPRO already understands about your business.",
  "Je vois, vous aimeriez obtenir plus de contrats. Commençons par analyser votre entreprise…": "I see. You'd like more contracts. Let's start by looking at your business…",
  "Parfait. Quel est votre métier principal ?": "Great. What's your primary trade?",
  "Travaillez-vous surtout au résidentiel, au commercial, ou les deux ?": "Do you mainly work with residential clients, commercial clients, or both?",
  "Résidentiel": "Residential",
  "Commercial": "Commercial",
  "Les deux": "Both",
  "Dans quelle(s) ville(s) travaillez-vous surtout ?": "Which cities do you mainly serve?",
  "Qu’aimeriez-vous améliorer pour votre entreprise ?": "What would you most like to improve for your business?",
  "Être plus visible sur Google et les moteurs d’IA": "Be more visible on Google and AI search",
  "Obtenir plus de contrats": "Win more contracts",
  "Recevoir des demandes mieux adaptées à mes services": "Get inquiries that better match my services",
  "Réduire le temps consacré à trouver des clients": "Spend less time finding customers",
  "Quel est le nom de votre entreprise ou votre site Web ?": "What's your business name or website?",
  "Cette adresse concerne-t-elle votre entreprise ou votre propriété personnelle? Elle ne détermine pas vos villes desservies.": "Is this your business address or your personal property's address? It doesn't define the cities you serve.",
  "D'accord. Laquelle de ces situations décrit le mieux votre entreprise ? Vous pourrez continuer dans tous les cas; seuls les travaux réglementés exigent une licence RBQ valide.": "Okay. Which situation best describes your business? You can continue in every case; regulated work requires a valid RBQ licence.",
  "Merci, c'est noté comme déclaré. UNPRO le vérifiera; on continue votre inscription.": "Thank you. I've recorded that as a declaration. UNPRO will verify it; let's continue your registration.",
  "L'adresse reste dans votre dossier maison, séparée des territoires de votre entreprise. Dans quelles villes souhaitez-vous travailler?": "The address stays in your home record, separate from your business service areas. Which cities would you like to work in?",
  "J'ai une licence RBQ": "I have an RBQ licence",
  "Mon activité ne requiert pas de licence RBQ": "My work doesn't require an RBQ licence",
  "Ma licence est en cours d'obtention": "I'm applying for an RBQ licence",
  "Je ne sais pas si j'en ai besoin": "I'm not sure whether I need one",
  "Je travaille pour une entreprise titulaire d'une licence RBQ": "I work for an RBQ-licensed business",
  "Autre situation": "Another situation",
  "📷 Ajouter une photo": "📷 Add a photo",
  "Continuer sans photo": "Continue without a photo"
};
export function localizeClaraScript(text: string, lang: "fr" | "en"): string {
  return lang === "en" ? CLARA_SCRIPT_EN[text] ?? text : text;
}
