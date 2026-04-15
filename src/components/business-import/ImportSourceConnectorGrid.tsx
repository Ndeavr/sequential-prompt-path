import { Card, CardContent } from "@/components/ui/card";
import { Globe, Search, CreditCard, Shield, Building2, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export type ImportSource = "business_card" | "website" | "gmb" | "rbq" | "neq" | "phone";

interface ImportSourceConnectorGridProps {
  onSelectSource: (source: ImportSource) => void;
}

const SOURCES: {
  id: ImportSource;
  icon: typeof Search;
  title: string;
  desc: string;
  badge: string | null;
  highlight: boolean;
}[] = [
  {
    id: "business_card",
    icon: CreditCard,
    title: "Carte d'affaires",
    desc: "Prenez une photo — on extrait tout automatiquement.",
    badge: "Rapide",
    highlight: true,
  },
  {
    id: "gmb",
    icon: Search,
    title: "Google Business",
    desc: "Trouvez votre fiche Google Maps en tapant votre nom.",
    badge: "Recommandé",
    highlight: true,
  },
  {
    id: "website",
    icon: Globe,
    title: "Site web",
    desc: "On analyse votre site pour préremplir votre profil.",
    badge: null,
    highlight: false,
  },
  {
    id: "rbq",
    icon: Shield,
    title: "Numéro RBQ",
    desc: "Importez via votre licence RBQ officielle.",
    badge: null,
    highlight: false,
  },
  {
    id: "neq",
    icon: Building2,
    title: "Numéro NEQ",
    desc: "Importez via votre numéro d'entreprise au Québec.",
    badge: null,
    highlight: false,
  },
  {
    id: "phone",
    icon: Phone,
    title: "Téléphone",
    desc: "On retrouve votre entreprise par votre numéro.",
    badge: null,
    highlight: false,
  },
];

export default function ImportSourceConnectorGrid({ onSelectSource }: ImportSourceConnectorGridProps) {
  return (
    <div className="space-y-2.5">
      {SOURCES.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card
            className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
              s.highlight ? "border-primary/30 ring-1 ring-primary/10" : ""
            }`}
            onClick={() => onSelectSource(s.id)}
          >
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${s.highlight ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm">{s.title}</h3>
                  {s.badge && (
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {s.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
