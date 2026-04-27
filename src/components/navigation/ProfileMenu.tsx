/**
 * UNPRO — Profile Menu (Avatar dropdown)
 * Role switcher, property switcher, contextual actions, account.
 */

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { getProfileActions, getStateActions } from "@/config/navigationConfig";
import { resolveIcon, ChevronDown, ArrowRightLeft, LogOut, Settings, HelpCircle, Globe } from "./IconResolver";
import { useLanguage } from "@/components/ui/LanguageToggle";
import type { UserRole } from "@/types/navigation";
import BecomeRoleCTA from "@/components/account/BecomeRoleCTA";
import { CANONICAL_PLAN_LABELS } from "@/config/pricing";

const roleLabels: Record<UserRole, { fr: string; en: string }> = {
  homeowner: { fr: "Propriétaire", en: "Homeowner" },
  contractor: { fr: "Entrepreneur", en: "Contractor" },
  partner: { fr: "Partenaire", en: "Partner" },
  admin: { fr: "Administrateur", en: "Admin" },
};

// Display labels come from the canonical pricing source.
// NEVER add legacy names here ("Starter", "Essentiel"…) — see legacyPlanGuard.
const planLabels: Record<string, string> = CANONICAL_PLAN_LABELS;

const ProfileMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const { ctx, activeRole, setActiveRole } = useNavigationContext();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!ctx) return null;

  const profileActions = getProfileActions(ctx);
  const stateActions = getStateActions(ctx).slice(0, 3);
  const otherRoles = ctx.user.roles.filter((r) => r !== ctx.user.activeRole);

  const accountPath =
    activeRole === "admin" ? "/admin"
    : activeRole === "contractor" ? "/pro/account"
    : "/dashboard/account";

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-full border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all duration-200"
      >
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[11px] font-bold overflow-hidden">
          {ctx.user.avatarUrl ? (
            <img src={ctx.user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            ctx.user.firstName.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <span className="text-meta font-medium text-foreground hidden sm:inline max-w-20 truncate">
          {ctx.user.firstName}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border/40 bg-card shadow-elevated p-1 z-50"
          >
            {/* Profile header */}
            <div className="px-3 py-3 border-b border-border/20">
              <p className="text-meta font-semibold text-foreground truncate">
                {ctx.contractor?.businessName && activeRole === "contractor"
                  ? ctx.contractor.businessName
                  : ctx.user.fullName || ctx.user.firstName}
              </p>
              <p className="text-caption text-muted-foreground truncate">{ctx.user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-caption px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {roleLabels[ctx.user.activeRole]?.[lang] || ctx.user.activeRole}
                </span>
                {activeRole === "contractor" && ctx.contractor?.activePlan && (
                  <span className="text-caption px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {planLabels[ctx.contractor.activePlan] || ctx.contractor.activePlan}
                  </span>
                )}
              </div>
            </div>

            {/* Role switcher */}
            {otherRoles.length > 0 && (
              <div className="px-1 py-1 border-b border-border/20">
                {otherRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setActiveRole(r);
                      setOpen(false);
                      // Navigate to the role's home
                      const dest = r === "admin" ? "/admin" : r === "contractor" ? "/pro" : "/dashboard";
                      navigate(dest);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    {lang === "en" ? `Switch to ${roleLabels[r].en}` : `Passer à : ${roleLabels[r].fr}`}
                  </button>
                ))}
              </div>
            )}

            {/* State actions (urgent) */}
            {stateActions.length > 0 && (
              <div className="px-1 py-1 border-b border-border/20">
                {stateActions.map((item) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta hover:bg-muted/40 transition-colors group"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                      <span className="flex-1 text-foreground truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.badgeVariant === "urgent" ? "bg-destructive/10 text-destructive"
                          : item.badgeVariant === "warning" ? "bg-warning/10 text-warning"
                          : "bg-primary/10 text-primary"
                        }`}>
                          {typeof item.badge === "number" ? item.badge : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Profile actions */}
            <div className="px-1 py-1 border-b border-border/20">
              {profileActions.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {lang === "en" && item.labelEn ? item.labelEn : item.label}
                  </Link>
                );
              })}
            </div>

            {/* Become another role */}
            {!ctx.user.roles.includes("contractor") && (
              <div className="px-1 py-1 border-b border-border/20">
                <BecomeRoleCTA targetRole="contractor" compact />
              </div>
            )}
            {!ctx.user.roles.includes("homeowner") && (
              <div className="px-1 py-1 border-b border-border/20">
                <BecomeRoleCTA targetRole="homeowner" compact />
              </div>
            )}

            {/* Account section */}
            <div className="px-1 py-1">
              <Link
                to={accountPath}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                {lang === "en" ? "My Account" : "Mon compte"}
              </Link>
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {lang === "en" ? "Sign Out" : "Déconnexion"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
