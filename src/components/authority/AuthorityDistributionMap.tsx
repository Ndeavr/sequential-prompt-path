import { motion } from "framer-motion";
import { Globe, Linkedin, Youtube, MessageSquare, BookOpen, PenTool, Radio } from "lucide-react";

const PLATFORMS = [
  { name: "Website", icon: Globe, activity: 92, lastPost: "Aujourd'hui", color: "text-primary" },
  { name: "LinkedIn", icon: Linkedin, activity: 75, lastPost: "Il y a 2j", color: "text-[hsl(210,80%,55%)]" },
  { name: "YouTube", icon: Youtube, activity: 30, lastPost: "Il y a 2 sem.", color: "text-destructive" },
  { name: "Reddit", icon: MessageSquare, activity: 60, lastPost: "Il y a 3j", color: "text-warning" },
  { name: "Quora", icon: BookOpen, activity: 45, lastPost: "Il y a 5j", color: "text-accent" },
  { name: "Medium", icon: PenTool, activity: 20, lastPost: "Il y a 1 mois", color: "text-foreground" },
  { name: "Substack", icon: Radio, activity: 55, lastPost: "Il y a 4j", color: "text-secondary" },
];

interface Props { userId?: string; }

export default function AuthorityDistributionMap({ userId }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <h2 className="text-lg font-bold text-foreground font-display mb-4">
        Distribution Network
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {PLATFORMS.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.06 }}
            className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 text-center hover:shadow-[var(--shadow-glow)] transition-all group cursor-pointer"
          >
            {/* Activity glow */}
            {p.activity > 70 && (
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: `inset 0 0 20px hsl(var(--primary) / 0.1)` }}
              />
            )}

            <p.icon className={`h-6 w-6 mx-auto mb-2 ${p.color}`} />
            <div className="text-xs font-semibold text-foreground">{p.name}</div>

            {/* Activity bar */}
            <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${p.activity}%` }}
                transition={{ delay: 0.9 + i * 0.06, duration: 0.8 }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">{p.lastPost}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
