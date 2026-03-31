import { motion } from "framer-motion";
import { User, Users, ArrowRight } from "lucide-react";
import type { ImportMode } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  mode: ImportMode;
  onSelect: (mode: ImportMode) => void;
}

const PATHS: { mode: ImportMode; icon: any; title: string; desc: string }[] = [
  {
    mode: "self_import",
    icon: User,
    title: "J'importe mon profil",
    desc: "Importez votre profil entrepreneur en 1 minute à partir de votre site, fiche Google ou nom d'entreprise.",
  },
  {
    mode: "representative_import",
    icon: Users,
    title: "Importer pour un entrepreneur",
    desc: "Mode représentant UNPRO. Importez le profil d'un entrepreneur devant lui ou pour lui.",
  },
];

export default function StepPathSelector({ mode, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
          Importez un profil entrepreneur en 1 minute
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Nous analysons la présence actuelle, les signaux de confiance et les informations publiques pour générer un Profil AIPP UNPRO.
        </p>
      </div>

      <div className="space-y-3">
        {PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <motion.button
              key={path.mode}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(path.mode)}
              className="w-full text-left rounded-2xl border border-border/40 bg-card p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{path.title}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{path.desc}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
