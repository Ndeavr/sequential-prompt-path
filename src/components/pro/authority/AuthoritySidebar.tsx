/**
 * Premium dark sidebar for Authority Score
 */
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Zap, Eye, Brain, CalendarCheck, User, ShieldCheck, Settings, X,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Zap, Eye, Brain, CalendarCheck, User, ShieldCheck, Settings,
};

const navItems = [
  { label: "Vue d'ensemble", icon: "LayoutDashboard", href: "/pro" },
  { label: "Authority Score", icon: "Zap", href: "/pro/authority-score" },
  { label: "Visibilité", icon: "Eye", href: "/pro/aipp" },
  { label: "Recommandations Alex", icon: "Brain", href: "#" },
  { label: "Rendez-vous", icon: "CalendarCheck", href: "/pro/appointments" },
  { label: "Profil public", icon: "User", href: "/pro/profile" },
  { label: "Crédibilité", icon: "ShieldCheck", href: "/pro/reviews" },
  { label: "Paramètres", icon: "Settings", href: "/pro/account" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthoritySidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const content = (
    <div className="flex flex-col h-full bg-[hsl(228_30%_5%)] border-r border-border/30">
      {/* Logo */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-foreground tracking-tight">UNPRO</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Entrepreneur Dashboard</p>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = location.pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => { navigate(item.href); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom card */}
      <div className="p-4">
        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Niveau actuel</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold font-display text-foreground">Actif</p>
              <p className="text-[10px] text-muted-foreground">Potentiel : Autorité locale</p>
            </div>
            {/* Mini ring */}
            <div className="relative w-10 h-10">
              <svg width={40} height={40} className="-rotate-90">
                <circle cx={20} cy={20} r={16} fill="none" stroke="hsl(228 20% 12%)" strokeWidth={3} />
                <circle
                  cx={20} cy={20} r={16} fill="none"
                  stroke="hsl(222 100% 65%)" strokeWidth={3}
                  strokeDasharray={`${2 * Math.PI * 16 * 0.4} ${2 * Math.PI * 16 * 0.6}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">400</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block w-60 shrink-0 h-screen sticky top-0">
        {content}
      </div>

      {/* Mobile overlay */}
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed left-0 top-0 bottom-0 w-60 z-50 lg:hidden"
          >
            {content}
          </motion.div>
        </>
      )}
    </>
  );
}
