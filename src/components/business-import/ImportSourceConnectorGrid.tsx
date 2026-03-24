import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search, Edit3, ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface ImportSourceConnectorGridProps {
  onSelectSource: (source: "google" | "website" | "manual") => void;
}

const SOURCES = [
  {
    id: "google" as const,
    icon: Search,
    title: "Google Business",
    desc: "Importez automatiquement depuis votre fiche Google.",
    badge: "Recommandé",
    highlight: true,
  },
  {
    id: "website" as const,
    icon: Globe,
    title: "Site web",
    desc: "On analyse votre site pour préremplir votre profil.",
    badge: null,
    highlight: false,
  },
  {
    id: "manual" as const,
    icon: Edit3,
    title: "Saisie manuelle",
    desc: "Entrez vos informations directement.",
    badge: null,
    highlight: false,
  },
];

export default function ImportSourceConnectorGrid({ onSelectSource }: ImportSourceConnectorGridProps) {
  return (
    <div className="space-y-3">
      {SOURCES.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card
            className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
              s.highlight ? "border-primary/30 ring-1 ring-primary/10" : ""
            }`}
            onClick={() => onSelectSource(s.id)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`rounded-xl p-3 ${s.highlight ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <s.icon className="h-5 w-5" />
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
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
