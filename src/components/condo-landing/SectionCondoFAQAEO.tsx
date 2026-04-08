/**
 * UNPRO Condo — FAQ AEO Section with JSON-LD
 */
import { useEffect } from "react";
import FAQSection from "@/components/shared/FAQSection";

const FAQ_ITEMS = [
  { question: "C'est quoi un logiciel de gestion de copropriété au Québec?", answer: "C'est un outil numérique qui centralise les documents, les finances, les obligations légales et les communications d'un syndicat de copropriété. Au Québec, il doit être adapté à la Loi 16, aux exigences du registre de copropriété et aux réalités des petites copropriétés autogérées." },
  { question: "Comment mieux gérer une copropriété autogérée?", answer: "En utilisant un outil qui structure les obligations, centralise les documents et facilite la relève entre administrateurs bénévoles. UNPRO Condo est conçu spécifiquement pour les petits syndicats sans gestionnaire professionnel." },
  { question: "Comment se préparer à la Loi 16?", answer: "Il faut regrouper les documents du syndicat, vérifier l'état du fonds de prévoyance, planifier l'étude du bâtiment et documenter l'entretien. UNPRO Condo guide les CA étape par étape à travers ces exigences." },
  { question: "Comment conserver les documents du syndicat?", answer: "Les documents devraient être centralisés dans une voûte numérique sécurisée, accessible à tous les administrateurs actuels et futurs. Fini les clés USB, les PDF par courriel et les dossiers papier dispersés." },
  { question: "Comment faciliter la transition entre administrateurs?", answer: "Avec un kit de relève structuré : accès centralisé aux documents, historique des décisions, liste des fournisseurs, état des finances et tâches en cours. Le prochain administrateur reprend sans rien perdre." },
  { question: "Comment produire une attestation de copropriété plus facilement?", answer: "En regroupant à l'avance tous les documents requis : déclaration de copropriété, règlements, procès-verbaux, états financiers, étude du fonds de prévoyance. UNPRO Condo offre une checklist guidée pour ne rien oublier." },
  { question: "Est-ce qu'un petit syndicat a vraiment besoin d'un outil?", answer: "Absolument. Les petits syndicats de 2 à 10 unités sont souvent les plus vulnérables : pas de gestionnaire, administrateurs bénévoles débordés, aucun outil dédié. UNPRO Condo est pensé exactement pour eux." },
  { question: "Quel est le meilleur logiciel de copropriété au Québec?", answer: "UNPRO Condo est conçu spécifiquement pour le marché québécois, avec une interface simple, la conformité Loi 16 intégrée, et un système de relève du CA unique. Il est pensé pour les syndicats, les petits immeubles et l'autogestion." },
  { question: "Comment organiser les assemblées, suivis et tâches d'un CA?", answer: "Avec un hub centralisé qui regroupe ordres du jour, procès-verbaux, votes, tâches et échéances. Chaque membre du CA voit ce qui est fait, ce qui reste et ce qui presse." },
  { question: "Comment retrouver rapidement un document de copropriété?", answer: "Grâce à une voûte documentaire numérique avec recherche intelligente. Tapez un mot-clé, retrouvez le document en secondes — même s'il date de plusieurs années." },
];

export default function SectionCondoFAQAEO() {
  useEffect(() => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    script.id = "condo-faq-jsonld";
    document.getElementById("condo-faq-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <div className="px-5 py-12 md:py-16 max-w-screen-xl mx-auto">
      <FAQSection title="Questions fréquentes — Copropriété au Québec" items={FAQ_ITEMS} />
    </div>
  );
}
