/**
 * IntentChipsGrid — 8 popular intent chips. Tap routes message to Alex
 * or navigates (contractor / upload).
 */
import { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Calculator, FileSearch, ShieldCheck,
  UserSearch, Camera, Briefcase, HelpCircle,
} from "lucide-react";
import { useAlexUIBridge } from "@/features/alex/hooks/useAlexUIBridge";

type Intent = {
  key: string;
  label: string;
  icon: typeof Search;
  message?: string;
  navigate?: string;
  action?: "upload";
};

const INTENTS: Intent[] = [
  { key: "analyze",   label: "Analyser un problème",          icon: Search,       message: "Je veux analyser un problème dans ma maison." },
  { key: "estimate",  label: "Estimer un projet",             icon: Calculator,   message: "Je veux estimer un projet de rénovation." },
  { key: "compare",   label: "Comparer 3 soumissions",        icon: FileSearch,   message: "J'aimerais comparer 3 soumissions que j'ai reçues." },
  { key: "verify",    label: "Vérifier un entrepreneur",      icon: ShieldCheck,  message: "Je veux vérifier un entrepreneur." },
  { key: "find",      label: "Trouver le bon pro",            icon: UserSearch,   message: "Aide-moi à trouver le bon professionnel." },
  { key: "photo",     label: "Téléverser une photo",          icon: Camera,       action: "upload" },
  { key: "pro",       label: "Je suis entrepreneur",          icon: Briefcase,    navigate: "/join" },
  { key: "lost",      label: "Je ne sais pas par où commencer", icon: HelpCircle, message: "Je ne sais pas par où commencer." },
];

export default function IntentChipsGrid() {
  const navigate = useNavigate();
  const { onTextSubmit, onFileUpload } = useAlexUIBridge();
  const uploadRef = useRef<HTMLInputElement>(null);

  const handle = async (intent: Intent) => {
    if (intent.navigate) { navigate(intent.navigate); return; }
    if (intent.action === "upload") { onFileUpload(); uploadRef.current?.click(); return; }
    if (intent.message) { await onTextSubmit(intent.message); }
  };

  return (
    <section className="px-5 py-4">
      <h2 className="text-base font-semibold text-foreground mb-3">
        Que souhaitez-vous faire aujourd'hui ?
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {INTENTS.map((intent, i) => {
          const Icon = intent.icon;
          return (
            <motion.button
              key={intent.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25 }}
              onClick={() => handle(intent)}
              className="group flex items-start gap-2.5 p-3 rounded-2xl
                bg-card/60 backdrop-blur-md border border-border/40
                hover:border-primary/40 hover:bg-primary/5
                active:scale-[0.98] transition-all duration-200 text-left"
            >
              <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium text-foreground leading-snug">
                {intent.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={() => onFileUpload()}
      />
    </section>
  );
}
