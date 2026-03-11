import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, FileText, BarChart3, User, CalendarDays, LogOut, Sparkles, Building2 } from "lucide-react";
import AlexConcierge from "@/components/alex/AlexConcierge";
import type { ReactNode } from "react";

const navItems = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/dashboard/properties", label: "Propriétés", icon: Building2 },
  { to: "/dashboard/quotes", label: "Soumissions", icon: FileText },
  { to: "/dashboard/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/dashboard/home-score", label: "Score maison", icon: BarChart3 },
  { to: "/dashboard/account", label: "Mon compte", icon: User },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border/30 bg-card/40 p-4">
        <Link to="/" className="flex items-center gap-2 px-3 mb-8 mt-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold text-gradient">UNPRO</span>
        </Link>

        <nav className="flex-1 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
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
                {label}
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

      {/* ─── Mobile + main ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border/20 px-4 py-2.5 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display text-meta font-bold text-gradient">UNPRO</span>
          </Link>
          <div className="flex items-center gap-0.5">
            {navItems.slice(0, 5).map(({ to, icon: Icon }) => {
              const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
      <AlexConcierge />
    </div>
  );
};

export default DashboardLayout;
