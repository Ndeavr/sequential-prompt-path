/**
 * UNPRO — Mobile Drawer
 * Full-screen mobile navigation with role-aware links + drawer items.
 */

import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { headerNavByRole, getDrawerItems, getStateActions } from "@/config/navigationConfig";
import { resolveIcon, LogOut, ArrowRightLeft, Settings } from "./IconResolver";
import { useLanguage } from "@/components/ui/LanguageToggle";
import type { UserRole } from "@/types/navigation";

const roleLabels: Record<UserRole, string> = {
  homeowner: "Propriétaire",
  contractor: "Entrepreneur",
  partner: "Partenaire",
  admin: "Administrateur",
};

const MobileDrawer = ({ onClose }: { onClose: () => void }) => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { ctx, activeRole, setActiveRole } = useNavigationContext();
  const { lang } = useLanguage();

  const navItems = headerNavByRole[activeRole] || headerNavByRole.guest;
  const drawerItems = ctx ? getDrawerItems(ctx) : [];
  const stateActions = ctx ? getStateActions(ctx).slice(0, 3) : [];
  const otherRoles = ctx ? ctx.user.roles.filter((r) => r !== ctx.user.activeRole) : [];

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="md:hidden overflow-hidden border-t border-border/20 max-h-[80vh] overflow-y-auto"
    >
      <nav className="px-4 py-3 space-y-0.5">
        {/* Main nav */}
        {navItems.map((item) => {
          const Icon = resolveIcon(item.icon);
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta font-medium transition-colors ${
                active ? "text-foreground bg-muted/50" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {lang === "en" && item.labelEn ? item.labelEn : item.label}
            </Link>
          );
        })}

        {/* State actions (urgent banners) */}
        {stateActions.length > 0 && (
          <>
            <div className="h-px bg-border/20 my-2" />
            {stateActions.map((item) => {
              const Icon = resolveIcon(item.icon);
              return (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeVariant === "urgent" ? "bg-destructive/10 text-destructive"
                      : item.badgeVariant === "warning" ? "bg-warning/10 text-warning"
                      : "bg-primary/10 text-primary"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        )}

        {/* Drawer items */}
        {drawerItems.length > 0 && (
          <>
            <div className="h-px bg-border/20 my-2" />
            {drawerItems.map((item) => {
              const Icon = resolveIcon(item.icon);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {lang === "en" && item.labelEn ? item.labelEn : item.label}
                </Link>
              );
            })}
          </>
        )}

        {/* Role switcher */}
        {otherRoles.length > 0 && (
          <>
            <div className="h-px bg-border/20 my-2" />
            {otherRoles.map((r) => (
              <button
                key={r}
                onClick={() => { setActiveRole(r); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Passer à : {roleLabels[r]}
              </button>
            ))}
          </>
        )}

        {/* Account */}
        <div className="h-px bg-border/20 my-2" />
        {ctx ? (
          <>
            <Link
              to={activeRole === "contractor" ? "/pro/account" : activeRole === "admin" ? "/admin" : "/dashboard/account"}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <Settings className="h-4 w-4" />
              {lang === "en" ? "My Account" : "Mon compte"}
            </Link>
            <button
              onClick={() => { signOut(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {lang === "en" ? "Sign Out" : "Déconnexion"}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta text-muted-foreground">
              {lang === "en" ? "Sign In" : "Connexion"}
            </Link>
            <Link to="/signup" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-meta font-semibold text-primary">
              {lang === "en" ? "Create Project" : "Créer un Projet"}
            </Link>
          </>
        )}
      </nav>
    </motion.div>
  );
};

export default MobileDrawer;
