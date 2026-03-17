/**
 * UNPRO — Contractor Layout (Programmatic Navigation)
 */

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Star, FileText, Shield, CalendarDays, TrendingUp, LogOut, CreditCard, MapPin, Sparkles, MessageSquare, Inbox, Users, Wrench, UsersRound } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import type { ReactNode } from "react";

const navItems = [
  { to: "/pro", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pro/incoming", label: "Projets entrants", icon: Inbox },
  { to: "/pro/profile", label: "Mon profil", icon: User },
  { to: "/pro/expertise", label: "Champ d'expertise", icon: Wrench },
  { to: "/pro/leads", label: "Opportunités", icon: TrendingUp },
  { to: "/pro/territories", label: "Territoires", icon: MapPin },
  { to: "/pro/partners", label: "Réseau partenaires", icon: UsersRound },
  { to: "/pro/teams", label: "Équipes projet", icon: Users },
  { to: "/pro/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/pro/aipp-score", label: "Score AIPP", icon: Star },
  { to: "/pro/reviews", label: "Avis clients", icon: MessageSquare },
  { to: "/pro/documents", label: "Documents", icon: FileText },
  { to: "/pro/billing", label: "Facturation", icon: CreditCard },
  { to: "/pro/account", label: "Mon compte", icon: Shield },
];

const ContractorLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { ctx } = useNavigationContext();

  const contractor = ctx?.contractor;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-56 flex-col border-r border-border/30 bg-card/40 p-4">
        <Link to="/" className="flex items-center gap-2 px-3 mb-1 mt-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">UNPRO</span>
        </Link>
        <span className="text-caption text-muted-foreground/50 px-3 mb-4 uppercase tracking-widest">Espace Pro</span>

        {/* Profile completion indicator */}
        {contractor && contractor.profileCompletion < 100 && (
          <div className="mx-3 mb-4 p-2 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-[10px] font-medium text-warning">Profil {contractor.profileCompletion}% complété</p>
            <div className="mt-1 h-1 rounded-full bg-warning/20">
              <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${contractor.profileCompletion}%` }} />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/pro" && pathname.startsWith(to));
            const badge = to === "/pro/leads" && contractor?.unreadLeadsCount
              ? contractor.unreadLeadsCount : null;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-meta font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/15"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {badge && badge > 0 && (
                  <span className="h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/20 pt-3 mt-3 space-y-2">
          <p className="text-caption text-muted-foreground/60 px-3 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-lg text-meta h-8 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border/20 px-4 py-2.5 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display text-meta font-bold text-foreground">UNPRO Pro</span>
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default ContractorLayout;
