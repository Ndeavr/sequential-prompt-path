/**
 * UNPRO — Pre-Login Role Selection
 * Users pick their role BEFORE seeing the login form.
 * Emphasizes: Propriétaire, Entrepreneur, Gestionnaire de copropriétés
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Wrench, Building2, Briefcase, Users, Landmark, Globe, Factory, Star, ChevronDown, ArrowRight } from "lucide-react";
import logo from "@/assets/unpro-robot.png";

interface RoleOption {
  key: string;
  label: string;
  subtitle: string;
  icon: typeof Home;
  primary?: boolean;
}

const PRIMARY_ROLES: RoleOption[] = [
  { key: "homeowner", label: "Propriétaire", subtitle: "Maison, condo, projet", icon: Home, primary: true },
  { key: "contractor", label: "Entrepreneur", subtitle: "Visibilité, matchs, croissance", icon: Wrench, primary: true },
  { key: "condo_manager", label: "Gestionnaire de copropriétés", subtitle: "Immeubles, interventions, suivi", icon: Building2, primary: true },
];

const SECONDARY_ROLES: RoleOption[] = [
  { key: "professional", label: "Professionnel", subtitle: "Expertise, crédibilité, clients", icon: Briefcase },
  { key: "partner", label: "Partenaire", subtitle: "Services, intégration, collaboration", icon: Users },
  { key: "municipality", label: "Municipalité", subtitle: "Citoyens, orientation, terrain", icon: Landmark },
  { key: "public_org", label: "Organisation publique", subtitle: "Services, démarches, accompagnement", icon: Globe },
  { key: "enterprise", label: "Entreprise", subtitle: "Bâtiments, actifs, fournisseurs", icon: Factory },
  { key: "ambassador", label: "Ambassadeur", subtitle: "Références, commissions, croissance", icon: Star },
];

export default function PreLoginRolePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleContinue = () => {
    if (!selected) return;
    // Persist selected role for post-login assignment
    try { sessionStorage.setItem("unpro_prelogin_role", selected); } catch {}
    // Forward any state (like `from`) to the login page
    navigate("/login", { state: location.state });
  };

  const allSecondary = SECONDARY_ROLES;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(228 25% 10%) 0%, hsl(228 30% 8%) 100%)" }}
    >
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.08)" }} />
        <div className="absolute bottom-20 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(260 80% 60% / 0.06)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="UNPRO" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Quel est votre profil ?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez pour personnaliser votre expérience
          </p>
        </div>

        {/* Primary roles — big cards */}
        <div className="space-y-2.5 mb-3">
          {PRIMARY_ROLES.map((role, i) => {
            const Icon = role.icon;
            const isSelected = selected === role.key;
            return (
              <motion.button
                key={role.key}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(role.key)}
                className="w-full flex items-center gap-3.5 rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, hsl(222 100% 61% / 0.15), hsl(260 80% 60% / 0.08))"
                    : "hsl(228 20% 14% / 0.6)",
                  border: isSelected
                    ? "2px solid hsl(222 100% 61% / 0.5)"
                    : "1px solid hsl(228 18% 18%)",
                  boxShadow: isSelected ? "0 0 20px hsl(222 100% 61% / 0.1)" : "none",
                }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected ? "hsl(222 100% 61% / 0.2)" : "hsl(228 18% 18%)",
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: isSelected ? "hsl(222 100% 71%)" : "hsl(220 20% 65%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isSelected ? "hsl(220 20% 98%)" : "hsl(220 20% 88%)" }}>
                    {role.label}
                  </p>
                  <p className="text-xs" style={{ color: "hsl(220 15% 55%)" }}>{role.subtitle}</p>
                </div>
                {isSelected && (
                  <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(222 100% 61%)" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Show more toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
          style={{ color: "hsl(220 15% 55%)" }}
        >
          {showMore ? "Moins d'options" : "Plus de profils"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>

        {/* Secondary roles — compact */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pb-3">
                {allSecondary.map((role, i) => {
                  const Icon = role.icon;
                  const isSelected = selected === role.key;
                  return (
                    <motion.button
                      key={role.key}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(role.key)}
                      className="flex flex-col items-start gap-1.5 rounded-lg p-3 text-left transition-all active:scale-[0.97]"
                      style={{
                        background: isSelected
                          ? "hsl(222 100% 61% / 0.12)"
                          : "hsl(228 20% 14% / 0.5)",
                        border: isSelected
                          ? "1.5px solid hsl(222 100% 61% / 0.4)"
                          : "1px solid hsl(228 18% 16%)",
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: isSelected ? "hsl(222 100% 71%)" : "hsl(220 15% 55%)" }} />
                      <p className="text-xs font-semibold leading-tight" style={{ color: isSelected ? "hsl(220 20% 98%)" : "hsl(220 20% 80%)" }}>
                        {role.label}
                      </p>
                      <p className="text-[10px] leading-tight" style={{ color: "hsl(220 15% 50%)" }}>{role.subtitle}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
          style={{
            background: selected
              ? "linear-gradient(135deg, hsl(222 100% 61%), hsl(240 80% 55%))"
              : "hsl(228 18% 18%)",
            color: selected ? "white" : "hsl(220 15% 45%)",
            opacity: selected ? 1 : 0.6,
            boxShadow: selected ? "0 4px 20px hsl(222 100% 61% / 0.3)" : "none",
          }}
          whileTap={selected ? { scale: 0.97 } : {}}
        >
          Continuer
          <ArrowRight className="h-4 w-4" />
        </motion.button>

        <p className="text-center text-[11px] mt-4" style={{ color: "hsl(220 15% 45%)" }}>
          Vous pourrez modifier ce choix plus tard
        </p>
      </motion.div>
    </div>
  );
}
