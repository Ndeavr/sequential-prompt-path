import { ArrowRight } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useCallback } from "react";

interface Props {
  title: string;
  slug: string;
  category?: string;
  className?: string;
}

export default function ButtonTalkToAlexArticle({ title, slug, category, className = "" }: Props) {
  const alexVoice = useAlexVoice();

  const handleClick = useCallback(() => {
    const context = [
      `L'utilisateur lit l'article "${title}".`,
      category ? `Catégorie: ${category}.` : "",
      `Slug: ${slug}.`,
      "Aide-le avec son problème en lien avec cet article.",
    ].filter(Boolean).join(" ");

    alexVoice.openAlex("article_context", context);
  }, [title, slug, category, alexVoice]);

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition ${className}`}
    >
      Parler à Alex <ArrowRight className="h-3 w-3" />
    </button>
  );
}
