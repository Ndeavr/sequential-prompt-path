import { Link } from "react-router-dom";
import { Building2, TreePine, Hammer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Navigation only: a request never establishes professional eligibility. */
export default function ServiceUniverseLinks({ lang, onClose }: { lang: "fr" | "en"; onClose?: () => void }) {
  const fr = lang === "fr";
  const entries = [
    { label: fr ? "Immobilier et services professionnels" : "Real estate and professional services", universe: "professional", Icon: Building2 },
    { label: fr ? "Entretien et services" : "Property care and services", universe: "maintenance", Icon: TreePine },
    { label: fr ? "Rénovation et réparations" : "Renovation and repairs", universe: "renovation", Icon: Hammer },
  ];
  return <nav aria-label={fr ? "Univers de services" : "Service universes"} className="grid w-full gap-2 sm:grid-cols-3">
    {entries.map(({ label, universe, Icon }) => <Button key={label} asChild variant="outline" className="h-auto min-h-12 justify-start gap-2 whitespace-normal px-3 py-3 text-left text-sm">
      <Link to={`/owner-universe?universe=${universe}`} onClick={onClose}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1">{label}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
    </Button>)}
  </nav>;
}