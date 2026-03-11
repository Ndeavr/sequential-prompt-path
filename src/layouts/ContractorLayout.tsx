import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Star, FileText, Shield, CalendarDays, TrendingUp, LogOut, CreditCard, MapPin, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/pro", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pro/profile", label: "Mon profil", icon: User },
  { to: "/pro/leads", label: "Leads", icon: TrendingUp },
  { to: "/pro/territories", label: "Territoires", icon: MapPin },
  { to: "/pro/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/pro/aipp-score", label: "Score AIPP", icon: Star },
  { to: "/pro/reviews", label: "Avis clients", icon: Star },
  { to: "/pro/documents", label: "Documents", icon: FileText },
  { to: "/pro/billing", label: "Facturation", icon: CreditCard },
  { to: "/pro/account", label: "Mon compte", icon: Shield },
];

const ContractorLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col glass-surface border-r border-border/30 p-4">
        <Link to="/" className="flex items-center gap-2 px-3 mb-1 mt-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-gradient">UNPRO</span>
        </Link>
        <span className="text-caption text-muted-foreground px-3 mb-6">Espace Pro</span>

        <nav className="flex-1 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/pro" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-meta font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
          <p className="text-caption text-muted-foreground px-3 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-meta h-9" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border/30 px-4 py-2.5 glass-surface sticky top-0 z-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-meta font-bold text-gradient">UNPRO Pro</span>
          </Link>
          <div className="flex items-center gap-0.5">
            {navItems.slice(0, 4).map(({ to, icon: Icon }) => {
              const active = pathname === to || (to !== "/pro" && pathname.startsWith(to));
              return (
                <Link key={to} to={to} className={`p-2 rounded-lg transition-all duration-200 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={signOut}><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default ContractorLayout;
